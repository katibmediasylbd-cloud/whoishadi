import React from 'react';

interface MemorialButtonProps {
  onClick: () => void;
  isPlaying: boolean;
  isBuffering: boolean;
  disabled?: boolean;
}

export const MemorialButton: React.FC<MemorialButtonProps> = ({
  onClick,
  isPlaying,
  isBuffering,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 w-full max-w-md mx-auto px-4">
      <button
        onClick={onClick}
        disabled={disabled}
        type="button"
        aria-label="Who is Hadi? Click to hear his voice"
        className={`
          relative w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4.5
          rounded-md font-cinzel font-bold text-lg sm:text-xl md:text-2xl
          tracking-[0.2em] text-white uppercase select-none
          red-memorial-button cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#080808]
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-200 shadow-lg
        `}
      >
        <div className="flex items-center justify-center gap-2.5">
          {isPlaying && (
            <span
              className="inline-block w-2 h-2 rounded-full bg-white animate-pulse"
              aria-hidden="true"
            />
          )}

          <span>WHO IS HADI?</span>
        </div>
      </button>

      {/* Instruction text immediately below button */}
      <p className="text-[11px] sm:text-xs text-neutral-400 font-sans tracking-widest uppercase transition-opacity duration-300">
        {isBuffering ? (
          <span className="text-neutral-300">Loading audio recording...</span>
        ) : isPlaying ? (
          <span className="text-neutral-300">Playing voice · Click again for next</span>
        ) : (
          <span>Click to hear his voice.</span>
        )}
      </p>
    </div>
  );
};
