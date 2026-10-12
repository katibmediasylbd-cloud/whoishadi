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
  const [isCounterPulsing, setIsCounterPulsing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const mountTimestampRef = useRef<number>(Date.now());
  const fingerprintRef = useRef<string>('');
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SHARE_URL = 'https://whoishadi.site';
  const SHARE_MESSAGE = 'হাদি হত্যার বিচার বিষয়ে আপনার মতামত জানান: https://whoishadi.site';
  const WHATSAPP_SHARE_URL = `https://api.whatsapp.com/send?text=${encodeURIComponent(SHARE_MESSAGE)}`;
  const FACEBOOK_SHARE_URL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`;

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
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
            pulseTimerRef.current = setTimeout(() => {
              if (isMounted) setIsCounterPulsing(false);
            }, 1200);
            return updatedCount;
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      unsubscribe();
    };
  }, []);

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SHARE_URL);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = SHARE_URL;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setCopiedNotice('ওয়েবসাইট লিংক কপি করা হয়েছে!');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        setCopiedNotice(null);
      }, 3000);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'JUSTICE FOR HADI',
          text: SHARE_MESSAGE,
          url: SHARE_URL,
        });
        return;
      } catch (err: any) {
        if (err && (err.name === 'AbortError' || err.code === 20)) {
          return;
        }
        console.warn('Web Share API error, using fallback:', err);
      }
    }
    // Fallback to copy URL
    handleCopyUrl();
  };

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
      } else if (result.alreadySubmitted) {
        setHasSupported(true);
        if (typeof result.count === 'number' && result.count > 0) {
          setCount(result.count);
        } else {
          setCount((prev) => Math.max(prev, 1));
        }
      } else {
        setHasSupported(true);
        setCount((prev) => Math.max(prev + 1, 1));
      }
    } catch {
      setHasSupported(true);
      setCount((prev) => Math.max(prev + 1, 1));
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

        {hasSupported ? (
          /* Post-submission Confirmation & Sharing Box */
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-md mx-auto mb-4 p-5 sm:p-6 rounded-2xl bg-neutral-950/85 border border-neutral-800/90 shadow-[0_4px_30px_rgba(0,0,0,0.55)] backdrop-blur-md animate-fade-in flex flex-col items-center text-center"
          >
            {/* Elegant Success Message */}
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bangla text-base sm:text-lg md:text-xl font-bold tracking-wide">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 shrink-0">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>ধন্যবাদ! আপনার দাবী গণনায় যুক্ত হয়েছে</span>
            </div>

            {/* Sub-text prompt for spreading the voice */}
            <p className="mt-2.5 mb-5 text-xs sm:text-sm md:text-base text-neutral-300 font-bangla leading-relaxed max-w-sm">
              হাদি হত্যার বিচার বিষয়ে অন্যদেরও নিজেদের মতামত জানানোর সুযোগ দিন।
            </p>

            {/* Sharing Action Controls */}
            <div className="w-full flex flex-col gap-2.5">
              {/* Primary Prominent Share Button using native Web Share API */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-3.5 px-6 rounded-xl font-bangla text-base sm:text-lg font-bold tracking-wide transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-2.5 text-white bg-gradient-to-r from-[#D71920] to-[#b8141a] hover:from-[#e51d25] hover:to-[#c7171e] active:scale-[0.98] shadow-[0_4px_20px_rgba(215,25,32,0.45)] hover:shadow-[0_6px_25px_rgba(215,25,32,0.6)] border border-red-500/30"
                aria-label="শেয়ার করুন"
              >
                <svg
                  className="w-5 h-5 text-white shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>শেয়ার করুন</span>
              </button>

              {/* Secondary Sharing Options: Facebook, WhatsApp, and Copy Website URL */}
              <div className="grid grid-cols-3 gap-2 w-full pt-1">
                {/* Facebook Share Option */}
                <a
                  href={FACEBOOK_SHARE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-neutral-900/90 hover:bg-[#1877F2]/15 border border-neutral-800 hover:border-[#1877F2]/60 text-neutral-200 hover:text-[#1877F2] transition-all duration-200 font-bangla text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] select-none"
                  aria-label="ফেসবুকে শেয়ার করুন"
                >
                  <svg
                    className="w-4 h-4 text-[#1877F2] shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>ফেসবুক</span>
                </a>

                {/* WhatsApp Share Option */}
                <a
                  href={WHATSAPP_SHARE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-neutral-900/90 hover:bg-[#25D366]/15 border border-neutral-800 hover:border-[#25D366]/60 text-neutral-200 hover:text-[#25D366] transition-all duration-200 font-bangla text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] select-none"
                  aria-label="হোয়াটসঅ্যাপে শেয়ার করুন"
                >
                  <svg
                    className="w-4 h-4 text-[#25D366] shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>হোয়াটসঅ্যাপ</span>
                </a>

                {/* Fallback to copy the website URL */}
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className={`py-2.5 px-2 rounded-xl border transition-all duration-200 font-bangla text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] select-none cursor-pointer ${
                    copied
                      ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300'
                      : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-700 text-neutral-200 hover:text-white'
                  }`}
                  aria-label="ওয়েবসাইটের লিংক কপি করুন"
                >
                  {copied ? (
                    <>
                      <svg
                        className="w-4 h-4 text-emerald-400 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-neutral-400 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>লিংক কপি</span>
                    </>
                  )}
                </button>
              </div>

              {/* Temporary Feedback Notification */}
              {copiedNotice && (
                <div
                  role="status"
                  className="mt-1 px-3 py-1.5 rounded-lg bg-neutral-900/95 border border-neutral-800 text-emerald-400 text-xs font-bangla animate-fade-in flex items-center justify-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{copiedNotice}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Voting Button (Shown before submission) */
          <div className="w-full max-w-xs mx-auto mb-4">
            <button
              type="button"
              onClick={handleSupport}
              disabled={submitting || loadingInitial}
              className={`w-full py-3.5 px-6 rounded-xl font-bangla text-base sm:text-lg font-bold tracking-wide transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                submitting
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
              ) : (
                <span>আমি সমর্থন জানাই</span>
              )}
            </button>
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
