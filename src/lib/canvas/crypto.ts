/* ============================================
   AGIRAILS Canvas - Cryptographic Utilities
   ============================================

   SHA-256 hashing utilities using Web Crypto API.
   Used for creating verifiable proofs of deliverables.
   ============================================ */

/**
 * Calculate SHA-256 hash of a string
 * Uses browser's Web Crypto API (crypto.subtle.digest)
 *
 * @param text - Input text to hash
 * @returns Promise resolving to hex-encoded SHA-256 hash (64 characters)
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a SHA-256 hash matches the given text
 *
 * @param text - Original text
 * @param expectedHash - Expected hash (hex string)
 * @returns Promise resolving to true if hash matches
 */
export async function verifySha256(text: string, expectedHash: string): Promise<boolean> {
  const actualHash = await sha256(text);
  return actualHash === expectedHash;
}
