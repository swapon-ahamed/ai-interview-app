# Deploying `agent/` to AWS Lightsail

How the AI interview agent is deployed as the **production** always-on worker
(`APP_ENV=production`, LiveKit worker name `ai-interviewer-prod`). Development
runs locally instead — see `ENVIRONMENTS.md` at the repo root. The agent is a
long-running process that stays connected to LiveKit Cloud waiting for rooms to
join — it needs a persistent host, not a serverless/request-response platform
(that's why `web/`/`admin/` are on AWS Amplify but `agent/` goes here).

## Current deployment

| | |
|---|---|
| Instance name | `ai-interview-agent` |
| Region / AZ | `ap-southeast-1` / `ap-southeast-1a` (Singapore) |
| Plan | `micro_3_0` — 2 vCPU, 1GB RAM, 40GB disk, **$7/mo** |
| OS | Ubuntu 22.04 |
| Static IP | `54.251.101.13` |
| SSH key | Lightsail key pair `ai-interview-agent-key` (private key kept outside the repo) |
| Code path on instance | `~/ai-interview-app/agent/` |
| Run mode | `systemd` service `ai-interview-agent` (auto-restart, survives reboot) |
| Logs | `~/ai-interview-app/agent/agent.log` on the instance |
| Environment | `APP_ENV=production` (set in the systemd unit) → loads `~/ai-interview-app/.env.production`, registers as `ai-interviewer-prod` |

Swap: a 1GB swapfile at `/swapfile` was added because the agent (livekit-agents
+ Silero VAD + OpenAI plugin preloaded) sits at ~670MB RSS at idle on a 1GB
box, leaving little headroom for an active session. If `agent.log` or
`systemctl status` shows OOM kills, resize to `small_3_0` (2GB RAM, $12/mo)
rather than relying on swap long-term.

## One-time setup (what was done to get here)

Run from the repo root unless noted. Requires `aws` CLI configured with
Lightsail permissions.

### 1. Create the key pair and instance

```bash
aws lightsail create-key-pair \
  --key-pair-name ai-interview-agent-key \
  --region ap-southeast-1 \
  --output json > keypair.json

python3 -c "
import json
d = json.load(open('keypair.json'))
open('ai-interview-agent-key.pem', 'w').write(d['privateKeyBase64'])
"
chmod 600 ai-interview-agent-key.pem

aws lightsail create-instances \
  --instance-names ai-interview-agent \
  --availability-zone ap-southeast-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id micro_3_0 \
  --key-pair-name ai-interview-agent-key \
  --region ap-southeast-1
```

### 2. Allocate a static IP (so the address survives stop/start)

```bash
aws lightsail allocate-static-ip --static-ip-name ai-interview-agent-ip --region ap-southeast-1
aws lightsail attach-static-ip \
  --static-ip-name ai-interview-agent-ip \
  --instance-name ai-interview-agent \
  --region ap-southeast-1
```

A static IP is free while attached to a running instance; it bills a small
hourly charge only while unattached or attached to a stopped instance.

### 3. Install OS packages

```bash
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 \
  "sudo apt-get update -y && sudo apt-get install -y python3-venv python3-pip git"
```

### 4. Copy the agent code and `.env.production`

The agent (`agent/main.py`) loads `.env.<APP_ENV>` from its **parent
directory** — see `ENV_PATH` in `main.py` — so the layout on the instance
mirrors the repo: `.env.production` sits one level above `agent/`.

```bash
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "mkdir -p ~/ai-interview-app/agent"

scp -i ai-interview-agent-key.pem \
  agent/main.py agent/requirements.txt \
  ubuntu@54.251.101.13:~/ai-interview-app/agent/

scp -i ai-interview-agent-key.pem \
  .env.production \
  ubuntu@54.251.101.13:~/ai-interview-app/.env.production

ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "chmod 600 ~/ai-interview-app/.env.production"
```

**`.env.production` holds live secrets (OpenAI key, Supabase service role key,
LiveKit API secret).** It's copied as-is, not committed anywhere, and kept at
`600` permissions on the instance. When any of those values rotate, re-run
just the `.env.production` scp line.

### 5. Create the venv and install dependencies

```bash
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "
  cd ~/ai-interview-app/agent &&
  python3 -m venv venv &&
  source venv/bin/activate &&
  pip install --upgrade pip &&
  pip install -r requirements.txt
"
```

### 6. Pre-download model files (Silero VAD, OpenAI plugin assets)

```bash
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "
  cd ~/ai-interview-app/agent &&
  source venv/bin/activate &&
  python main.py download-files
"
```

### 7. Add swap (safety margin on the 1GB plan)

```bash
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "
  sudo fallocate -l 1G /swapfile &&
  sudo chmod 600 /swapfile &&
  sudo mkswap /swapfile &&
  sudo swapon /swapfile &&
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
"
```

### 8. Install the systemd service

Local file `agent/ai-interview-agent.service` was copied to
`/etc/systemd/system/` on the instance:

```ini
[Unit]
Description=AI Interview LiveKit Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ai-interview-app/agent
# Loads ../.env.production and registers as the "ai-interviewer-prod" agent.
Environment=APP_ENV=production
ExecStart=/home/ubuntu/ai-interview-app/agent/venv/bin/python main.py start
Restart=always
RestartSec=5
StandardOutput=append:/home/ubuntu/ai-interview-app/agent/agent.log
StandardError=append:/home/ubuntu/ai-interview-app/agent/agent.log

[Install]
WantedBy=multi-user.target
```

```bash
scp -i ai-interview-agent-key.pem ai-interview-agent.service \
  ubuntu@54.251.101.13:/tmp/ai-interview-agent.service

ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "
  sudo mv /tmp/ai-interview-agent.service /etc/systemd/system/ai-interview-agent.service &&
  sudo systemctl daemon-reload &&
  sudo systemctl enable ai-interview-agent &&
  sudo systemctl start ai-interview-agent
"
```

`python main.py start` is the production run mode (`dev` is for local
iteration only — don't run `dev` on the server). Running `dev` locally while
the server is up is safe: the local agent registers as `ai-interviewer-dev`
and only receives rooms the *development* web app dispatches to that name, so
the two never compete for interviews (see `ENVIRONMENTS.md`).

## Redeploying after a code change

```bash
scp -i ai-interview-agent-key.pem agent/main.py agent/requirements.txt \
  ubuntu@54.251.101.13:~/ai-interview-app/agent/

ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "
  cd ~/ai-interview-app/agent &&
  source venv/bin/activate &&
  pip install -r requirements.txt &&
  sudo systemctl restart ai-interview-agent
"
```

## Useful commands

```bash
# Status / health
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "sudo systemctl status ai-interview-agent --no-pager"

# Tail logs
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "tail -f ~/ai-interview-app/agent/agent.log"

# Confirm it's registered with LiveKit as "agent_name": "ai-interviewer-prod"
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "grep 'registered worker' ~/ai-interview-app/agent/agent.log | tail -1"

# Memory check (watch for OOM pressure on the 1GB plan)
ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "free -h"
```

## Cost

- Lightsail instance (`micro_3_0`): **$7/mo**
- Static IP: free while attached to a running instance
- Data transfer: 2048GB/mo included, well above demo traffic

## Known limitation

The `.env.production` on the instance is a point-in-time copy. There's no automated
sync — if a secret rotates in the source `.env.production`, it must be re-copied and the
service restarted manually (step 4 + `sudo systemctl restart
ai-interview-agent`).
