import React from 'react';
import { AudioQuote } from '../types.ts';

interface QuoteDisplayProps {
  currentClip: AudioQuote | null;
  isPlaying: boolean;
}

export const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ currentClip }) => {
  if (!currentClip || !currentClip.quote) {
    return null;
  }

  return (
    <div
      key={`quote-${currentClip.id}`}
      className="w-full max-w-2xl mx-auto px-4 py-1 sm:py-2 text-center animate-fade-in transition-all duration-500 ease-out"
    >
      {/* Pure, powerful white Bangla Quote Text without any distracting tags or metadata */}
      <blockquote className="relative">
        <p className="font-bangla text-xl sm:text-2xl md:text-3xl text-white font-medium sm:font-semibold leading-relaxed sm:leading-[1.6] md:leading-[1.65] tracking-normal max-w-xl mx-auto drop-shadow select-text">
          “{currentClip.quote}”
        </p>
      </blockquote>
    </div>
  );
};
