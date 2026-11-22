import { createHmac, timingSafeEqual } from 'crypto';

export type NpeIdentity = { email: string };

/** Decodes one base64url JWT segment into a parsed JSON object, or null when it is malformed. */
function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Returns the first claim value that looks like an e-mail address (npe stores it in the Name claim). */
function findEmail(payload: Record<string, unknown>): string | null {
  const candidates = Object.entries(payload)
    .filter(
      ([key]) =>
        key === 'email' ||
        key === 'unique_name' ||
        key === 'name' ||
        key.endsWith('/claims/name') ||
        key.endsWith('/claims/emailaddress'),
    )
    .map(([, value]) => value);

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.includes('@')) return candidate.trim().toLowerCase();
  }

  return null;
}

/** Whether npe sign-in is configured (shared JWT key present in the environment). */
export function npeEnabled(): boolean {
  return !!process.env.NPE_JWT_KEY;
}

/**
 * Verifies a JWT issued by BeNpe (HS256, shared Jwt:Key) and returns the signed-in e-mail.
 * Returns null for a bad signature, wrong algorithm, expired token, wrong issuer/audience or missing e-mail.
 */
export function verifyNpeToken(token: string): NpeIdentity | null {
  const key = process.env.NPE_JWT_KEY;
  if (!key) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);
  if (!header || !payload || header.alg !== 'HS256') return null;

  const expected = createHmac('sha256', key).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) return null;
  if (typeof payload.nbf === 'number' && payload.nbf > now + 60) return null;

  const issuer = process.env.NPE_JWT_ISSUER;
  if (issuer && payload.iss !== issuer) return null;

  const audience = process.env.NPE_JWT_AUDIENCE;
  if (audience) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(audience)) return null;
  }

  const email = findEmail(payload);
  return email ? { email } : null;
}

/** Login page of the central npe site (sunamo.cz in production, local FE port 4005 on localhost). */
export function npeLoginUrl(hostHeader: string, returnTo: string): string {
  const base = hostHeader.startsWith('localhost') ? 'http://localhost:4005' : 'https://sunamo.cz';
  return `${base}/en/login?returnTo=${encodeURIComponent(returnTo)}`;
}
