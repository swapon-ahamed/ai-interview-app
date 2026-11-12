#!/usr/bin/env python3
"""Copy the dev Supabase keys from the root .env.development into
web/.env.development.local and admin/.env.development.local.

Paste SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY into the
repo-root .env.development once (values from the ai-interview-dev project),
then run:  python3 scripts/sync-dev-env.py

Never prints secret values — only which keys were set.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / ".env.development"

# target file -> {target key: source key}
TARGETS = {
    ROOT / "web/.env.development.local": {
        "SUPABASE_URL": "SUPABASE_URL",
        "SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY": "SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_SUPABASE_URL": "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
    },
    ROOT / "admin/.env.development.local": {
        "NEXT_PUBLIC_SUPABASE_URL": "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY": "SUPABASE_SERVICE_ROLE_KEY",
    },
}

LINE = re.compile(r"^([A-Z0-9_]+)=(.*)$", re.M)


def main() -> int:
    if not SOURCE.exists():
        print(f"Missing {SOURCE}. Copy .env.example to .env.development first.")
        return 1
    src = dict(LINE.findall(SOURCE.read_text()))
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY") if not src.get(k, "").strip()]
    if missing:
        print(f"Fill these in {SOURCE.name} first: {', '.join(missing)}")
        return 1
    if "ctwqjpojdlyjqdtpxoln" in src["SUPABASE_URL"]:
        print("Refusing: SUPABASE_URL in .env.development is the PRODUCTION project.")
        return 1

    for target, mapping in TARGETS.items():
        text = target.read_text() if target.exists() else ""
        for tkey, skey in mapping.items():
            value = src[skey].strip()
            if re.search(rf"^{tkey}=", text, re.M):
                text = re.sub(rf"^{tkey}=.*$", lambda _m: f"{tkey}={value}", text, flags=re.M)
            else:
                text += f"\n{tkey}={value}\n"
        target.write_text(text)
        target.chmod(0o600)
        print(f"{target.relative_to(ROOT)}: set {', '.join(mapping)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
