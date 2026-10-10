import React from 'react';

interface ThemeSongControlProps {
  isPlaying: boolean;
  onToggle: () => void;
  hasThemeSong: boolean;
}

export const ThemeSongControl: React.FC<ThemeSongControlProps> = ({
  isPlaying,
  onToggle,
  hasThemeSong,
}) => {
  if (!hasThemeSong) return null;

  return (
    <button
      onClick={onToggle}
      type="button"
      aria-label={isPlaying ? 'Pause site theme song' : 'Play site theme song'}
      title={isPlaying ? 'Pause site theme song' : 'Play site theme song'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-all backdrop-blur-sm select-none cursor-pointer"
    >
      {/* Animated bars or speaker icon */}
      <span className="flex items-center gap-0.5 h-3.5" aria-hidden="true">
        {isPlaying ? (
          <>
            <span className="w-0.5 h-3 bg-[#D71920] rounded-full animate-wave-bar" style={{ animationDuration: '0.9s' }} />
            <span className="w-0.5 h-2 bg-white rounded-full animate-wave-bar" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
            <span className="w-0.5 h-3.5 bg-[#D71920] rounded-full animate-wave-bar" style={{ animationDuration: '0.7s', animationDelay: '0.4s' }} />
            <span className="w-0.5 h-1.5 bg-white rounded-full animate-wave-bar" style={{ animationDuration: '1.0s', animationDelay: '0.1s' }} />
          </>
        ) : (
          <span className="w-3.5 h-3.5 flex items-center justify-center text-neutral-500">
            ▶
          </span>
        )}
      </span>

      <span className="text-[11px] font-sans tracking-wide">
        {isPlaying ? 'Theme Song' : 'Play Theme'}
      </span>
    </button>
  );
};
