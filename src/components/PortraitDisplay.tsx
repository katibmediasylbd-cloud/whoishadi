import React, { useState, useEffect } from 'react';

interface PortraitDisplayProps {
  portraitUrl: string | null;
  placeholderUsed: boolean;
  isPlaying?: boolean;
}

export const PortraitDisplay: React.FC<PortraitDisplayProps> = ({
  portraitUrl,
  placeholderUsed,
  isPlaying = false,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [portraitUrl]);

  const hasAuthenticPortrait = Boolean(portraitUrl) && !placeholderUsed && !imageError;

  return (
    <div className="relative w-full max-w-[270px] xs:max-w-[300px] sm:max-w-[370px] md:max-w-[420px] aspect-[4/5] mx-auto flex items-center justify-center">
      {/* Background ambient radial glow: slowly pulsing, and reacts to active voice playback */}
      <div
        className={`
          absolute inset-0 -z-10 rounded-full blur-3xl pointer-events-none transition-all duration-1000
          ${isPlaying ? 'animate-voice-halo opacity-60 scale-110' : 'animate-ambient-glow opacity-30'}
        `}
        style={{
          background: isPlaying
            ? 'radial-gradient(circle, rgba(215, 25, 32, 0.45) 0%, rgba(215, 25, 32, 0.15) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(215, 25, 32, 0.28) 0%, rgba(30, 10, 10, 0.4) 60%, transparent 85%)',
        }}
      />

      {/* Frame wrapper with soft vignette edge fade */}
      <div className="relative w-full h-full flex items-center justify-center p-1 sm:p-2">
        {hasAuthenticPortrait ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
            {/* Soft lighting cinematic vignette overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none portrait-vignette bg-radial from-transparent via-transparent to-[#080808]" />

            {/* Living breathing animated portrait of Shaheed Osman Hadi */}
            <img
              src={portraitUrl!}
              alt="Portrait of Shaheed Osman Hadi"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className={`
                w-full h-full object-contain filter grayscale contrast-110 brightness-95
                animate-portrait-breathe select-none pointer-events-none
                transition-all duration-700
                ${isPlaying ? 'brightness-100 contrast-115' : ''}
              `}
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
              }}
            />
          </div>
        ) : (
          /* Dignified Archival Silhouette Placeholder */
          <div
            className="w-full h-full border border-neutral-800/80 rounded-xl bg-gradient-to-b from-neutral-900/60 to-black/80 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm relative overflow-hidden group animate-portrait-breathe"
          >
            {/* Subtle inner highlight */}
            <div className="absolute inset-0 bg-radial from-white/[0.03] to-transparent pointer-events-none" />

            {/* Silhouette Memorial Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-neutral-700/50 bg-neutral-900/80 flex items-center justify-center shadow-inner relative overflow-hidden">
                <svg
                  className="w-16 h-16 sm:w-20 sm:h-20 text-neutral-600/70"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#D71920]/40" />
              </div>
            </div>

            <div className="space-y-1 max-w-[260px]">
              <span className="font-cinzel text-xs tracking-[0.25em] text-neutral-300 uppercase block font-semibold">
                Shaheed Osman Hadi
              </span>
              <p className="text-[11px] text-neutral-500 font-sans tracking-wide">
                Authentic Memorial Portrait
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
