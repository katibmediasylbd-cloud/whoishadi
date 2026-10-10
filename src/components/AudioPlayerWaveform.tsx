import React from 'react';

interface AudioPlayerWaveformProps {
  isPlaying: boolean;
  isBuffering: boolean;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  isPlaying,
  isBuffering,
}) => {
  if (isBuffering) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-neutral-400 tracking-wider uppercase font-sans">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D71920] animate-ping" />
        <span className="text-[11px] text-neutral-300">Loading recording...</span>
      </div>
    );
  }

  if (!isPlaying) {
    return null;
  }

  // Generate 16 subtle waveform bars with staggered heights and animation delays
  const bars = [8, 14, 22, 12, 26, 18, 10, 24, 28, 16, 20, 12, 25, 14, 9, 18];

  return (
    <div
      className="flex items-center justify-center gap-1 h-7 px-3 py-1 transition-opacity duration-300"
      aria-label="Audio waveform indicator"
    >
      {bars.map((defaultHeight, idx) => {
        // Vary the duration and delay for a natural organic voice rhythm
        const duration = 0.8 + (idx % 4) * 0.25;
        const delay = (idx * 0.08) % 0.7;

        return (
          <span
            key={idx}
            className="w-[2px] bg-gradient-to-t from-[#D71920] via-white/80 to-white rounded-full transition-all"
            style={{
              height: `${defaultHeight}px`,
              animation: `soundwave ${duration}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
};
