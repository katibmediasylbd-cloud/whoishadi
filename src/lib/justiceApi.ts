/**
 * Real-time Justice Support API Client
 * Uses native Server-Sent Events (SSE) and self-hosted Express backend.
 * Zero external database or third-party service dependencies.
 */

export interface SupportStatusResponse {
  hasSupported: boolean;
  count: number;
}

export interface SupportSubmissionResponse {
  success: boolean;
  count?: number;
  message?: string;
  alreadySubmitted?: boolean;
}

/**
 * Fetch current genuine supporter count
 */
export async function getSupporterCount(): Promise<number> {
  try {
    const res = await fetch('/api/justice/count');
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : 0;
  } catch {
    return 0;
  }
}

/**
 * Check if the visitor/device has already submitted support
 */
export async function checkSupporterStatus(fingerprint: string): Promise<boolean> {
  if (typeof window !== 'undefined' && localStorage.getItem('justice_hadi_supported') === 'true') {
    return true;
  }
  try {
    const res = await fetch(`/api/justice/status?fingerprint=${encodeURIComponent(fingerprint)}`);
    if (!res.ok) return false;
    const data: SupportStatusResponse = await res.json();
    if (data.hasSupported) {
      localStorage.setItem('justice_hadi_supported', 'true');
    }
    return Boolean(data.hasSupported);
  } catch {
    return false;
  }
}

/**
 * Submit support entry with duplicate prevention and bot protection
 */
export async function submitSupport(params: {
  fingerprint: string;
  dwellTimeMs: number;
}): Promise<SupportSubmissionResponse> {
  try {
    const res = await fetch('/api/justice/support', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fingerprint: params.fingerprint,
        dwellTimeMs: params.dwellTimeMs,
        honeypot: '',
      }),
    });

    const data: SupportSubmissionResponse = await res.json();

    if (data.success || data.alreadySubmitted) {
      localStorage.setItem('justice_hadi_supported', 'true');
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      message: 'সংযোগ ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    };
  }
}

/**
 * Subscribe to Realtime live supporter count updates via native Server-Sent Events (SSE)
 */
export function subscribeToRealtimeCount(onCountUpdate: (count: number) => void): () => void {
  let eventSource: EventSource | null = null;

  try {
    eventSource = new EventSource('/api/justice/events');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (typeof parsed.count === 'number') {
          onCountUpdate(parsed.count);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-retries reconnection natively
    };
  } catch (err) {
    console.error('SSE initialization error:', err);
  }

  return () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
