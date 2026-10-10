import React, { useState, useEffect, useRef } from 'react';
import { AudioQuote } from '../types.ts';

interface HadisVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: AudioQuote[];
  initialQuoteId: number | null;
  onSelectForPassTheVoice: (quote: AudioQuote) => void;
}

export const HadisVoiceModal: React.FC<HadisVoiceModalProps> = ({
  isOpen,
  onClose,
  quotes,
  initialQuoteId,
  onSelectForPassTheVoice,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter only quotes with authentic audio
  const audioClips = quotes.filter((q) => Boolean(q.audioUrl && q.audioUrl.trim()));

  useEffect(() => {
    if (initialQuoteId) {
      const idx = audioClips.findIndex((q) => q.id === initialQuoteId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [initialQuoteId, audioClips]);

  const currentClip = audioClips[currentIndex] || audioClips[0];

  // Stop audio when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [isOpen]);

  // Clean up audio ref on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playClip = (clip: AudioQuote) => {
    if (!clip || !clip.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setIsBuffering(false);
      };
    }

    const audio = audioRef.current;
    setIsBuffering(true);
    audio.src = clip.audioUrl;
    audio.load();
    audio
      .play()
      .then(() => {
        setIsBuffering(false);
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn('Playback error:', err);
        setIsBuffering(false);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    if (!currentClip) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      playClip(currentClip);
    }
  };

  const handleNext = () => {
    if (audioClips.length === 0) return;
    const nextIdx = (currentIndex + 1) % audioClips.length;
    setCurrentIndex(nextIdx);
    if (isPlaying) {
      playClip(audioClips[nextIdx]);
    }
  };

  const handlePrev = () => {
    if (audioClips.length === 0) return;
    const prevIdx = (currentIndex - 1 + audioClips.length) % audioClips.length;
    setCurrentIndex(prevIdx);
    if (isPlaying) {
      playClip(audioClips[prevIdx]);
    }
  };

  const selectClipByIndex = (idx: number) => {
    setCurrentIndex(idx);
    playClip(audioClips[idx]);
  };

  const handleCopyShareUrl = (clip: AudioQuote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/?v=${clip.id}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(clip.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  if (!isOpen || !currentClip) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hadis-voice-title"
    >
      <div className="bg-[#0D0D0D] border border-neutral-800 rounded-xl max-w-xl w-full p-4 sm:p-6 my-auto shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D71920]" />
            <h2 id="hadis-voice-title" className="font-cinzel text-sm sm:text-base font-bold text-white tracking-widest uppercase">
              HADI'S VOICE
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
            aria-label="Close voice player"
          >
            ✕
          </button>
        </div>

        {/* Main Minimal Audio Player */}
        <div className="py-4 border-b border-neutral-850 shrink-0 text-center">
          {/* Active quote count */}
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-2">
            Authentic Voice #{currentClip.id} of {audioClips.length}
          </span>

          {/* Bangla Quote text */}
          <p className="font-bangla text-xl sm:text-2xl text-white font-medium leading-relaxed px-4 max-w-lg mx-auto">
            “{currentClip.quote}”
          </p>

          {/* Animated Waveform */}
          <div className="h-6 flex items-center justify-center my-3">
            {isPlaying ? (
              <div className="flex items-center gap-1">
                {[10, 22, 14, 28, 18, 12, 24, 16, 20, 14, 26, 12].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-[#D71920] to-white rounded-full animate-wave-bar"
                    style={{
                      height: `${h}px`,
                      animationDuration: `${0.7 + (i % 3) * 0.2}s`,
                      animationDelay: `${(i * 0.08) % 0.5}s`,
                    }}
                  />
                ))}
              </div>
            ) : isBuffering ? (
              <span className="text-xs text-neutral-400 font-sans tracking-wide">
                Buffering authentic recording...
              </span>
            ) : (
              <div className="w-12 h-[2px] bg-neutral-800" />
            )}
          </div>

          {/* Minimal Controls */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={handlePrev}
              type="button"
              className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Previous recording"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              type="button"
              className="w-13 h-13 rounded-full bg-[#D71920] hover:bg-[#b8141a] text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button
              onClick={handleNext}
              type="button"
              className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Next recording"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          </div>

          {/* Quick share current recording */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => handleCopyShareUrl(currentClip)}
              type="button"
              className="text-xs text-neutral-400 hover:text-white px-3 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copiedId === currentClip.id ? 'URL Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onSelectForPassTheVoice(currentClip);
              }}
              type="button"
              className="text-xs text-[#D71920] hover:text-red-400 px-3 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-[#D71920]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Pass this Voice →</span>
            </button>
          </div>
        </div>

        {/* Scrollable List of All 20 Recordings */}
        <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-1.5 divide-y divide-neutral-900">
          <span className="text-[10px] font-sans uppercase tracking-widest text-neutral-500 block px-2 pb-1">
            All Authentic Voice Recordings ({audioClips.length})
          </span>

          {audioClips.map((clip, idx) => {
            const isCurrent = idx === currentIndex;

            return (
              <div
                key={clip.id}
                onClick={() => selectClipByIndex(idx)}
                className={`pt-2 p-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-neutral-900/90 border border-neutral-700'
                    : 'hover:bg-neutral-900/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-mono ${
                      isCurrent && isPlaying
                        ? 'bg-[#D71920] text-white'
                        : isCurrent
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-950 text-neutral-500'
                    }`}
                  >
                    {isCurrent && isPlaying ? '▶' : `#${clip.id}`}
                  </span>

                  <p className="font-bangla text-xs sm:text-sm text-neutral-200 truncate max-w-xs sm:max-w-md">
                    {clip.quote}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleCopyShareUrl(clip, e)}
                    type="button"
                    title="Copy unique link to this recording"
                    className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    {copiedId === clip.id ? (
                      <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
