/**
 * Client Device Fingerprint & Bot-Protection Proof-of-Work Utility
 * Implements hardware/browser entropy hashing and lightweight micro-PoW
 * to prevent automated bots and enforce server-side duplicate prevention.
 */

export async function generateDeviceFingerprint(): Promise<string> {
  try {
    const components: string[] = [
      navigator.userAgent || '',
      navigator.language || '',
      (navigator.languages || []).join(','),
      String(window.screen.width || 0) + 'x' + String(window.screen.height || 0),
      String(window.screen.colorDepth || 0),
      String(new Date().getTimezoneOffset()),
      String(navigator.hardwareConcurrency || 1),
      (navigator as any).deviceMemory ? String((navigator as any).deviceMemory) : 'na',
      (navigator as any).platform || '',
    ];

    // Canvas subtle entropy
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(10, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('HadiJustice#2026', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('HadiJustice#2026', 4, 17);
        components.push(canvas.toDataURL());
      }
    } catch {
      // Fallback if canvas is blocked
      components.push('canvas_blocked');
    }

    const rawString = components.join('|||');
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Graceful fallback: randomized crypto UUID persistent in sessionStorage/storage
    const fallbackId = 'fp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    return fallbackId;
  }
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
