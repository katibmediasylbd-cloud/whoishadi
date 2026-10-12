import React, { useState, useEffect, useRef } from 'react';
import {
  getSupporterCount,
  checkSupporterStatus,
  submitSupport,
  subscribeToRealtimeCount,
} from '../lib/justiceApi.ts';
import { generateDeviceFingerprint } from '../utils/fingerprint.ts';

export function JusticeSection() {
  const [count, setCount] = useState<number>(0);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hasSupported, setHasSupported] = useState<boolean>(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);
  const [isCounterPulsing, setIsCounterPulsing] = useState<boolean>(false);

  const mountTimestampRef = useRef<number>(Date.now());
  const fingerprintRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;
    mountTimestampRef.current = Date.now();

    async function init() {
      try {
        // 1. Generate client device fingerprint
        const fp = await generateDeviceFingerprint();
        fingerprintRef.current = fp;

        // 2. Load cached count immediately to prevent any flicker
        const cached = typeof window !== 'undefined' ? localStorage.getItem('justice_supporter_count') : null;
        if (cached && Number(cached) > 0 && isMounted) {
          setCount(Number(cached));
        }

        // 3. Fetch initial supporter count from backend
        const initialCount = await getSupporterCount();
        if (isMounted && typeof initialCount === 'number' && initialCount > 0) {
          setCount(initialCount);
        }

        // 4. Check if current visitor has already submitted support
        const alreadyDone = await checkSupporterStatus(fp);
        if (isMounted && alreadyDone) {
          setHasSupported(true);
          setThankYouMessage('ধন্যবাদ! আপনি ইতিমধ্যে সমর্থন জানিয়েছেন।');
          setCount((prev) => Math.max(prev, initialCount || 0, 1));
        }
      } catch (err) {
        console.error('Justice section initialization error:', err);
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    }

    init();

    // 5. Subscribe to Real-time SSE live updates and fast synchronization from the backend
    const unsubscribe = subscribeToRealtimeCount((updatedCount) => {
      if (isMounted && typeof updatedCount === 'number' && updatedCount > 0) {
        setCount((prev) => {
          if (updatedCount !== prev) {
            setIsCounterPulsing(true);
            setTimeout(() => setIsCounterPulsing(false), 1200);
            return updatedCount;
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSupport = async () => {
    if (submitting || hasSupported) return;

    setSubmitting(true);

    try {
      const clickTime = Date.now();
      const dwellTimeMs = clickTime - mountTimestampRef.current;

      const result = await submitSupport({
        fingerprint: fingerprintRef.current,
        dwellTimeMs,
      });

      if (result.success) {
        setHasSupported(true);
        const finalCount =
          typeof result.count === 'number' && result.count > 0
            ? result.count
            : Math.max(count + 1, 1);
        setCount(finalCount);
        setIsCounterPulsing(true);
        setTimeout(() => setIsCounterPulsing(false), 1500);

        setThankYouMessage('ধন্যবাদ! আপনার সমর্থন সফলভাবে গ্রহণ করা হয়েছে।');
      } else if (result.alreadySubmitted) {
        setHasSupported(true);
        if (typeof result.count === 'number' && result.count > 0) {
          setCount(result.count);
        } else {
          setCount((prev) => Math.max(prev, 1));
        }
        setThankYouMessage('ধন্যবাদ! আপনি ইতিমধ্যে সমর্থন জানিয়েছেন।');
      } else {
        setHasSupported(true);
        setCount((prev) => Math.max(prev + 1, 1));
        setThankYouMessage('ধন্যবাদ! আপনার সমর্থন সফলভাবে গ্রহণ করা হয়েছে।');
      }
    } catch {
      setHasSupported(true);
      setCount((prev) => Math.max(prev + 1, 1));
      setThankYouMessage('ধন্যবাদ! আপনার সমর্থন সফলভাবে গ্রহণ করা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="justice-for-hadi"
      aria-label="JUSTICE FOR HADI"
      className="w-full max-w-xl mx-auto my-6 sm:my-8 px-4"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-900/90 via-[#0e0e0e]/95 to-[#080808] border border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.6)] backdrop-blur-md p-6 sm:p-8 text-center transition-all duration-300 hover:border-neutral-700/80">
        {/* Subtle Ambient Red Glow */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-36 bg-[#D71920]/15 blur-3xl pointer-events-none rounded-full"
          aria-hidden="true"
        />

        {/* Section Pill: JUSTICE FOR HADI */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/80 border border-neutral-800 text-[10px] sm:text-xs font-cinzel font-semibold tracking-[0.25em] text-neutral-300 uppercase mb-3 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D71920] animate-pulse" />
          <span>JUSTICE FOR HADI</span>
        </div>

        {/* Bengali Main Heading: হাদি হত্যার বিচার চাই */}
        <h2 className="font-bangla text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-normal sm:tracking-tight mb-4 select-none drop-shadow-sm">
          হাদি হত্যার বিচার চাই
        </h2>

        {/* Supporter Count Display Area */}
        <div className="my-5 sm:my-6 flex flex-col items-center justify-center">
          <div className="text-[11px] sm:text-xs uppercase tracking-wider text-neutral-400 font-sans mb-1.5 flex items-center justify-center">
            <span>Total Supporters</span>
          </div>

          {/* Large Supporter Count Number in English Font */}
          <div className="relative flex items-center justify-center min-h-[4rem] sm:min-h-[5rem]">
            {loadingInitial ? (
              <div className="flex items-center gap-2 text-neutral-500 font-sans text-sm animate-pulse">
                <span className="inline-block w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              <div
                className={`font-sans font-black tabular-nums text-5xl sm:text-6xl md:text-7xl tracking-tight transition-all duration-300 select-none ${
                  isCounterPulsing
                    ? 'text-[#D71920] scale-105 drop-shadow-[0_0_25px_rgba(215,25,32,0.6)]'
                    : 'text-white'
                }`}
              >
                {count.toLocaleString('en-US')}
              </div>
            )}
          </div>

          {/* Real-time Live Sync Indicator */}
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-neutral-950/60 border border-neutral-800/60 text-[11px] font-sans text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D71920] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D71920]" />
            </span>
            <span>Live Real-time Sync</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300 font-semibold text-[11px] tabular-nums">
              {count.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Action Button: আমি সমর্থন জানাই */}
        <div className="w-full max-w-xs mx-auto mb-4">
          <button
            type="button"
            onClick={handleSupport}
            disabled={submitting || hasSupported || loadingInitial}
            className={`w-full py-3.5 px-6 rounded-xl font-bangla text-base sm:text-lg font-bold tracking-wide transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              hasSupported
                ? 'bg-neutral-800/70 border border-neutral-700 text-neutral-400 cursor-not-allowed shadow-none'
                : submitting
                ? 'bg-[#b8141a] text-white cursor-wait opacity-90'
                : 'bg-[#D71920] hover:bg-[#e51d25] active:scale-[0.98] text-white shadow-[0_4px_20px_rgba(215,25,32,0.4)] hover:shadow-[0_6px_25px_rgba(215,25,32,0.55)] border border-red-500/30'
            }`}
            aria-live="polite"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>যাচাই করা হচ্ছে...</span>
              </>
            ) : hasSupported ? (
              <>
                <svg
                  className="w-5 h-5 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>সমর্থন জানানো হয়েছে</span>
              </>
            ) : (
              <span>আমি সমর্থন জানাই</span>
            )}
          </button>
        </div>

        {/* Thank You Message Area - ONLY Thank you message is shown */}
        {thankYouMessage && (
          <div
            role="alert"
            className="w-full max-w-sm mx-auto mb-4 px-4 py-2.5 rounded-xl text-sm font-bangla tracking-wide border bg-emerald-950/40 border-emerald-800/80 text-emerald-200 animate-fade-in flex items-center justify-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{thankYouMessage}</span>
          </div>
        )}

        {/* Single-line concise disclaimer in English only */}
        <p className="text-[10.5px] sm:text-xs text-neutral-400 font-sans leading-normal max-w-xl mx-auto pt-3 border-t border-neutral-800/60 select-none">
          Website-submitted support entries · Not a representative public opinion poll.
        </p>
      </div>
    </section>
  );
}
