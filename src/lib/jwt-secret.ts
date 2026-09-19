/**
 * JWT signing secret. Must come from the environment — never a committed fallback.
 * Rotating JWT_SECRET invalidates every existing session cookie.
 */
export function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Add it as a deployment secret (not in git) and restart. Existing sessions are invalid after a rotation.",
    );
  }
  return new TextEncoder().encode(secret);
}
