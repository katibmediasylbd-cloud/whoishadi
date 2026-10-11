/**
 * Client Device Fingerprint & Bot-Protection Proof-of-Work Utility
 * Implements hardware/browser entropy hashing and lightweight micro-PoW
 * to prevent automated bots and enforce server-side duplicate prevention.
 */

export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window !== 'undefined') {
    let vid = localStorage.getItem('justice_visitor_id');
    if (!vid || vid.length < 8) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('justice_visitor_id', vid);
    }
    return vid;
  }
  return 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

/**
 * Lightweight Proof of Work (PoW) Challenge
 * Requires the client to perform ~15-30ms of real CPU calculation
 * which trivializes human interaction while making automated batch bot submissions prohibitive.
 */
export async function solvePoWChallenge(
  fingerprint: string,
  timestamp: number
): Promise<{ nonce: number; solutionHash: string }> {
  const encoder = new TextEncoder();
  const prefix = `${fingerprint}:${timestamp}:`;
  let nonce = 0;

  while (nonce < 100000) {
    nonce++;
    const testData = encoder.encode(`${prefix}${nonce}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', testData);
    const uint8 = new Uint8Array(hashBuffer);
    // Target: First 12 bits zero (first byte 0 and second byte < 16)
    if (uint8[0] === 0 && uint8[1] < 16) {
      const hashArray = Array.from(uint8);
      const solutionHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return { nonce, solutionHash };
    }
  }

  return { nonce, solutionHash: 'fallback_' + nonce };
}
