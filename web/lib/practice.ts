// Shared by the practice UI and /api/practice — safe to import from both
// client and server code (no secrets, no server-only imports). The server
// re-validates everything; client-side checks only spare honest users a
// round trip.

export const PRACTICE_MAX_ATTEMPTS = 3;

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

export type PracticeDetails = { fullName: string; email: string; phone: string };

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Keeps digits and a single leading "+", dropping spaces, dashes, brackets
// and dots, so "+1 (555) 010-2030" and "+15550102030" count as one phone.
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Returns a user-facing error message, or null if the details are valid.
export function validatePracticeDetails(d: PracticeDetails): string | null {
  const name = d.fullName.trim();
  if (name.length < 2) return "Enter your full name.";
  if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;
  if (/[<>{}\u0000-\u001f]/.test(name)) return "Name contains invalid characters.";

  const email = normalizeEmail(d.email);
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) return "Enter a valid email address.";

  const phone = normalizePhone(d.phone);
  const digitCount = phone.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) return "Enter a valid phone number (7–15 digits).";
  if (/[^\d\s()+.\-]/.test(d.phone.trim())) return "Phone number contains invalid characters.";

  return null;
}
