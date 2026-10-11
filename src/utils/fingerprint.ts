/**
 * Client Device Fingerprint & Bot-Protection Proof-of-Work Utility
 * Implements hardware/browser entropy hashing and lightweight micro-PoW
 * to prevent automated bots and enforce server-side duplicate prevention.
 */

export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('justice_device_fp');
    if (cached && cached.length >= 10) {
      return cached;
    }
  }

  try {
    const components: string[] = [
      typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
      typeof navigator !== 'undefined' ? navigator.language || '' : '',
      typeof navigator !== 'undefined' ? (navigator.languages || []).join(',') : '',
      typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : '',
      typeof window !== 'undefined' && window.screen ? String(window.screen.colorDepth || 0) : '',
      String(new Date().getTimezoneOffset()),
      typeof navigator !== 'undefined' ? String(navigator.hardwareConcurrency || 1) : '',
      typeof navigator !== 'undefined' && (navigator as any).platform ? (navigator as any).platform : '',
    ];

    // Canvas subtle entropy
    if (typeof document !== 'undefined') {
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
        components.push('canvas_blocked');
      }
    }

    let fp = '';
    if (
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      typeof crypto.subtle.digest === 'function'
    ) {
      const rawString = components.join('|||');
      const encoder = new TextEncoder();
      const data = encoder.encode(rawString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      fp = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      fp = 'fp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    if (typeof window !== 'undefined' && fp) {
      localStorage.setItem('justice_device_fp', fp);
    }
    return fp;
  } catch (err) {
    const fallbackId = 'fp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    if (typeof window !== 'undefined') {
      localStorage.setItem('justice_device_fp', fallbackId);
    }
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
