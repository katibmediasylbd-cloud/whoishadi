import React, { useState, useEffect, useRef } from 'react';

const JUSTICE_AUDIO_URL = 'https://res.cloudinary.com/ghxx4dt3/video/upload/v1791641963/Hadi.mp3';

interface JusticeVoiceButtonProps {
  onPlayStateChange?: (isPlaying: boolean) => void;
  isMainAudioPlaying?: boolean;
  onStopMainAudio?: () => void;
}

export const JusticeVoiceButton: React.FC<JusticeVoiceButtonProps> = ({
  onPlayStateChange,
  isMainAudioPlaying = false,
  onStopMainAudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // If main memorial audio starts playing, pause this justice voice
  useEffect(() => {
    if (isMainAudioPlaying && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      onPlayStateChange?.(false);
    }
  }, [isMainAudioPlaying, isPlaying, onPlayStateChange]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleJusticeAudio = () => {
    if (!audioRef.current) {
      const audio = new Audio(JUSTICE_AUDIO_URL);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(100);
        onPlayStateChange?.(false);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsBuffering(false);
        onPlayStateChange?.(false);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
    } else {
      onStopMainAudio?.();
      setIsBuffering(true);
      audio
        .play()
        .then(() => {
          setIsBuffering(false);
          setIsPlaying(true);
          setShowTranscript(true);
          onPlayStateChange?.(true);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsBuffering(false);
          setIsPlaying(false);
          onPlayStateChange?.(false);
        });
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-3 sm:my-4 z-20">
      {/* Circular Animated Play Button Section */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Pulsing Ripple Rings when playing */}
        {isPlaying && (
          <>
            <span className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-[#D71920]/40 animate-ripple pointer-events-none" />
            <span
              className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-[#D71920]/25 animate-ripple pointer-events-none"
              style={{ animationDelay: '0.7s' }}
            />
          </>
        )}

        {/* Ambient Red Glow Halo */}
        <div
          className={`absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full blur-xl transition-all duration-700 pointer-events-none ${
            isPlaying ? 'bg-[#D71920]/45 scale-110' : 'bg-[#D71920]/15'
          }`}
        />

        {/* Main Circular Interactive Button Component */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          {/* Rotating Circular Text Ring */}
          <div
            className={`absolute inset-0 select-none pointer-events-none transition-transform duration-700 ${
              isPlaying ? 'animate-spin-slow' : 'hover:rotate-12'
            }`}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <path
                  id="justiceCirclePath"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                />
              </defs>
              <text
                className="font-bangla font-bold tracking-wider fill-neutral-300"
                style={{ fontSize: '9px', letterSpacing: '1.2px' }}
              >
                <textPath href="#justiceCirclePath" startOffset="0%">
                  হাদী হত্যার বিচার চাই • হাদী হত্যার বিচার চাই •
                </textPath>
              </text>
            </svg>
          </div>

          {/* Center Circular Play/Pause Button */}
          <button
            onClick={toggleJusticeAudio}
            type="button"
            aria-label={isPlaying ? 'Pause justice voice' : 'Play justice voice: হাদী হত্যার বিচার চাই'}
            className={`
              relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full
              flex items-center justify-center transition-all duration-300 cursor-pointer
              shadow-xl border
              ${
                isPlaying
                  ? 'bg-[#D71920] border-white/90 text-white scale-105 shadow-[#D71920]/50'
                  : 'bg-[#101010] hover:bg-[#161616] border-[#D71920]/80 text-[#D71920] hover:text-white hover:border-[#D71920] hover:scale-105'
              }
            `}
          >
            {isBuffering ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : isPlaying ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
        </div>

        {/* Text Heading Below Circle */}
        <div className="mt-1 text-center">
          <button
            onClick={toggleJusticeAudio}
            type="button"
            className="font-bangla text-sm sm:text-base font-bold text-white hover:text-red-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            <span className="w-2 h-2 rounded-full bg-[#D71920] animate-pulse" />
            <span className="tracking-wide">হাদী হত্যার বিচার চাই</span>
          </button>

          <p className="text-[11px] text-neutral-400 font-sans tracking-wide mt-0.5">
            {isPlaying
              ? 'শহীদ ওসমান হাদীর কণ্ঠে বিচার দাবি চলছে...'
              : 'ক্লিক করে শুনুন হাদির কণ্ঠের ঐতিহাসিক দাবি'}
          </p>
        </div>
      </div>

      {/* Expanded Moving Transcript Modal / Card when Audio Plays */}
      {showTranscript && (
        <div
          className="w-full max-w-lg mt-3 p-3.5 sm:p-4 rounded-xl bg-neutral-950/95 border border-[#D71920]/40 shadow-2xl backdrop-blur-md animate-fade-in relative text-left"
          role="region"
          aria-label="Justice Voice Transcript"
        >
          {/* Header row */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-850">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D71920] animate-pulse" />
              <span className="font-bangla font-semibold text-xs text-white">
                হাদী হত্যার বিচার দাবি · মূল কণ্ঠরেকর্ড
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleJusticeAudio}
                type="button"
                className="text-xs px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={() => setShowTranscript(false)}
                type="button"
                className="text-neutral-500 hover:text-white text-xs px-1"
                aria-label="Close transcript"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-[#D71920] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Full Spoken Bengali Words */}
          <p className="font-bangla text-xs sm:text-sm text-neutral-200 leading-relaxed italic">
            “আমাদেরকে গুলি করার আগ পর্যন্ত কোনো কিছুই আমাদের গায়ে লাগে না, যতক্ষণ না পর্যন্ত বুকে বা মাথায় গুলি না চলবে ততক্ষণ পর্যন্ত আমরা কোনো স্ট্রাগল মনে করি না এবং এক্সট্রা কোনো সিকিউরিটি লাগবে না। শুধু আমাদেরকে যদি কেউ গুলি করে মেরে ফেলে তাকে যেন ধরে বিচার করা হয়। আপনি যদি আজকে আমাকে, জাবেরকে, আমাদের টিমকে মেরে ফেলেন এবং তার যদি বিচার করতে না পারেন তাহলে নতুন কোনো জন্মাবে না। শুধু এই জন্য তার বিচার করে ফেলতে হবে...”
          </p>

          <span className="block text-right font-bangla text-[11px] text-[#D71920] font-medium mt-2">
            — শহীদ ওসমান হাদী
          </span>
        </div>
      )}
    </div>
  );
};
