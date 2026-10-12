/**
 * Real-time Justice Support API Client powered by Google Firebase Firestore
 * Provides instant sub-second real-time live synchronization across all browsers and devices globally.
 */

import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { generateDeviceFingerprint } from '../utils/fingerprint.ts';

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
 * Fetch current genuine supporter count from Firestore or server fallback
 */
export async function getSupporterCount(): Promise<number> {
  // 1. Try Firestore
  try {
    const statsRef = doc(db, 'justice_stats', 'summary');
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const data = snap.data();
      const count = typeof data?.count === 'number' && data.count > 0 ? data.count : 1;
      if (typeof window !== 'undefined' && count > 0) {
        localStorage.setItem('justice_supporter_count', String(count));
      }
      return count;
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      try {
        handleFirestoreError(err, OperationType.GET, 'justice_stats/summary');
      } catch {
        // Logged via handleFirestoreError
      }
    } else {
      console.warn('Firestore read error, falling back to server count:', err);
    }
  }

  // 2. Try server endpoint fallback
  try {
    const res = await fetch('/api/justice/count');
    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number' && data.count > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('justice_supporter_count', String(data.count));
        }
        return data.count;
      }
    }
  } catch {
    // Network fallback
  }

  // 3. Cached fallback
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('justice_supporter_count');
    if (cached && Number(cached) > 0) return Number(cached);
  }

  return 1;
}

/**
 * Check if the visitor/device has already submitted support
 */
export async function checkSupporterStatus(fingerprint: string): Promise<boolean> {
  if (typeof window !== 'undefined' && localStorage.getItem('justice_hadi_supported') === 'true') {
    return true;
  }
  if (!fingerprint) return false;

  try {
    const supporterRef = doc(db, 'supporters', fingerprint);
    const snap = await getDoc(supporterRef);
    if (snap.exists()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('justice_hadi_supported', 'true');
      }
      return true;
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      try {
        handleFirestoreError(err, OperationType.GET, `supporters/${fingerprint}`);
      } catch {
        // Logged
      }
    }
  }

  // Check server endpoint fallback
  try {
    const res = await fetch(`/api/justice/status?fingerprint=${encodeURIComponent(fingerprint)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.hasSupported) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('justice_hadi_supported', 'true');
        }
        return true;
      }
    }
  } catch {
    // Ignore fallback error
  }

  return false;
}

/**
 * Submit support entry with atomic duplicate prevention in Firestore and server sync
 */
export async function submitSupport(params: {
  fingerprint: string;
  dwellTimeMs?: number;
}): Promise<SupportSubmissionResponse> {
  // 1. Check local storage first
  if (typeof window !== 'undefined' && localStorage.getItem('justice_hadi_supported') === 'true') {
    const count = await getSupporterCount();
    return {
      success: false,
      alreadySubmitted: true,
      count: Math.max(count, 1),
      message: 'ধন্যবাদ! আপনি ইতিমধ্যে সমর্থন জানিয়েছেন।',
    };
  }

  // 2. Ensure visitor fingerprint is available
  const fp = params.fingerprint && params.fingerprint.trim().length >= 5
    ? params.fingerprint.trim()
    : await generateDeviceFingerprint();

  let finalCount = 1;
  let wasAlreadyDone = false;
  let firestoreSucceeded = false;

  try {
    const supporterRef = doc(db, 'supporters', fp);
    const statsRef = doc(db, 'justice_stats', 'summary');

    // Atomic transaction ensuring exact consistency and zero duplicate writes
    await runTransaction(db, async (transaction) => {
      const supporterDoc = await transaction.get(supporterRef);
      if (supporterDoc.exists()) {
        wasAlreadyDone = true;
        const statsDoc = await transaction.get(statsRef);
        finalCount = statsDoc.exists() ? (statsDoc.data()?.count || 1) : 1;
        return;
      }

      const statsDoc = await transaction.get(statsRef);
      const currentCount = statsDoc.exists() ? (statsDoc.data()?.count || 0) : 0;
      finalCount = Math.max(currentCount + 1, 1);

      // Record unique supporter entry
      transaction.set(supporterRef, {
        fingerprint: fp,
        createdAt: new Date().toISOString(),
      });

      // Update aggregate count
      transaction.set(
        statsRef,
        {
          count: finalCount,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    });

    firestoreSucceeded = true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'supporters');
      } catch {
        // Logged
      }
    } else {
      console.warn('Firestore transaction error, attempting server sync:', err);
    }
  }

  // Also sync to server endpoint
  try {
    const res = await fetch('/api/justice/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: fp }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.alreadySubmitted) {
        wasAlreadyDone = true;
      }
      if (typeof data.count === 'number' && data.count > 0) {
        finalCount = Math.max(finalCount, data.count);
      }
    }
  } catch {
    // Server endpoint optional sync
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('justice_hadi_supported', 'true');
    localStorage.setItem('justice_supporter_count', String(finalCount));
  }

  if (wasAlreadyDone) {
    return {
      success: false,
      alreadySubmitted: true,
      count: finalCount,
      message: 'ধন্যবাদ! আপনি ইতিমধ্যে সমর্থন জানিয়েছেন।',
    };
  }

  return {
    success: true,
    count: finalCount,
    message: 'ধন্যবাদ! আপনার সমর্থন সফলভাবে গ্রহণ করা হয়েছে।',
  };
}

/**
 * Subscribe to Real-time live supporter count updates via native Firestore onSnapshot and SSE fallback
 */
export function subscribeToRealtimeCount(onCountUpdate: (count: number) => void): () => void {
  let isSubscribed = true;

  // 1. Primary: Firestore onSnapshot
  let firestoreUnsub: (() => void) | null = null;
  try {
    const statsRef = doc(db, 'justice_stats', 'summary');
    firestoreUnsub = onSnapshot(
      statsRef,
      (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (typeof data?.count === 'number' && data.count > 0) {
            onCountUpdate(data.count);
            if (typeof window !== 'undefined') {
              localStorage.setItem('justice_supporter_count', String(data.count));
            }
          }
        }
      },
      (error) => {
        if (error.message.includes('permission')) {
          try {
            handleFirestoreError(error, OperationType.GET, 'justice_stats/summary');
          } catch {
            // Logged
          }
        } else {
          console.warn('Firestore realtime onSnapshot error:', error);
        }
      }
    );
  } catch (err) {
    console.warn('Realtime Firestore subscription init failed:', err);
  }

  // 2. Secondary: Server-Sent Events (SSE) fallback
  let eventSource: EventSource | null = null;
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/justice/events');
      eventSource.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const parsed = JSON.parse(event.data);
          if (typeof parsed?.count === 'number' && parsed.count > 0) {
            onCountUpdate(parsed.count);
          }
        } catch {
          // Ignore parse errors
        }
      };
      eventSource.onerror = () => {
        // SSE error, EventSource will automatically retry
      };
    } catch {
      // SSE not available
    }
  }

  return () => {
    isSubscribed = false;
    if (firestoreUnsub) {
      firestoreUnsub();
    }
    if (eventSource) {
      eventSource.close();
    }
  };
}

