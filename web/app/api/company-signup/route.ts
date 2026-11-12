import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { siteUrl } from "@/lib/companyAuth";
import { passwordProblem } from "@/lib/password";
import { checkRateLimits, getClientIp, readJsonBody, tooManyRequests } from "@/lib/rateLimit";

// Public company self-signup (web/app/signup).
//
//   1. Creates the Supabase Auth user with the *anon* client's signUp(), so
//      Supabase emails a verification link (the project has "Confirm email"
//      on). The link lands on /auth/confirmed.
//   2. Creates the companies row as 'pending' (service role).
//   3. The company can sign in only after BOTH verifying the email AND an
//      admin activating it (admin/ refuses to activate unverified emails).
//
// Response is the same generic success whether or not the email already had
// an account, so this endpoint can't be used to discover registered emails.

const MAX_BODY_BYTES = 4096;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // Honeypot field, hidden from people.
  if (str(b.website).trim()) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const companyName = str(b.companyName).trim();
  const mobileNumber = str(b.mobileNumber).trim();
  const contactAddress = str(b.contactAddress).trim() || null;
  const email = str(b.email).trim().toLowerCase();
  const password = str(b.password);

  if (companyName.length < 2 || companyName.length > 200) {
    return NextResponse.json({ error: "Enter your company name." }, { status: 400 });
  }
  const phoneDigits = mobileNumber.replace(/\D/g, "").length;
  if (phoneDigits < 7 || phoneDigits > 15 || /[^\d\s()+.\-]/.test(mobileNumber)) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  }
  if (contactAddress && contactAddress.length > 500) {
    return NextResponse.json({ error: "Address is too long." }, { status: 400 });
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const pwProblem = passwordProblem(password);
  if (pwProblem) return NextResponse.json({ error: pwProblem }, { status: 400 });

  const ip = getClientIp(req);
  const limit = await checkRateLimits([
    { key: "signup:global", max: 100, windowSeconds: 3600 },
    { key: `signup:ip:${ip}:h`, max: 5, windowSeconds: 3600 },
    { key: `signup:ip:${ip}:d`, max: 15, windowSeconds: 86400 },
  ]);
  if (!limit.ok) {
    return tooManyRequests("Too many sign-up attempts. Please try again later.", limit.retryAfterSeconds);
  }

  // Anon client — signUp() through it is what triggers Supabase's
  // verification email (the admin API's createUser does not send one).
  const anon = createClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirmed`,
      data: {
        account_type: "company",
        company_name: companyName,
        mobile_number: mobileNumber,
        contact_address: contactAddress,
      },
    },
  });

  if (error) {
    if (/rate limit/i.test(error.message)) {
      return NextResponse.json(
        { error: "We couldn't send the verification email right now. Please try again in a little while." },
        { status: 429 }
      );
    }
    if (/email address .* is invalid/i.test(error.message)) {
      // Supabase's own deliverability check (e.g. rejects reserved domains).
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (/not authorized|sending.*email|smtp/i.test(error.message)) {
      // Supabase's built-in mailer only delivers to the project's team
      // members until custom SMTP is configured.
      console.error("verification email could not be sent", error.message);
      return NextResponse.json(
        { error: "We couldn't send a verification email to that address. Please contact support." },
        { status: 503 }
      );
    }
    if (/password/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("company signUp failed", error.message);
    return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
  }

  const user = data.user;
  // With "Confirm email" on, Supabase returns an obfuscated user with no
  // identities when the email is already registered and confirmed — nothing
  // to do, and we answer exactly as for a new signup.
  if (user && (user.identities?.length ?? 0) > 0) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabaseAdmin.from("companies").insert({
        user_id: user.id,
        email,
        company_name: companyName,
        mobile_number: mobileNumber,
        contact_address: contactAddress,
        status: "pending",
        signup_source: "self_signup",
      });
      if (insertError) {
        console.error("company row insert failed", insertError.message);
        // Roll back so the same email can retry cleanly.
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
