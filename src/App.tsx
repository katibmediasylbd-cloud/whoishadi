/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PortraitDisplay } from './components/PortraitDisplay.tsx';
import { MemorialButton } from './components/MemorialButton.tsx';
import { AudioPlayerWaveform } from './components/AudioPlayerWaveform.tsx';
import { QuoteDisplay } from './components/QuoteDisplay.tsx';
import { EmbedAudioAdapter } from './components/EmbedAudioAdapter.tsx';
import { ThemeSongControl } from './components/ThemeSongControl.tsx';
import { JusticeVoiceButton } from './components/JusticeVoiceButton.tsx';
import { HadiPosterModal } from './components/HadiPosterModal.tsx';
import { HadisVoiceModal } from './components/HadisVoiceModal.tsx';
import { PassTheVoiceModal } from './components/PassTheVoiceModal.tsx';
import { useMemorialAudio } from './hooks/useMemorialAudio.ts';
import { useThemeSong } from './hooks/useThemeSong.ts';
import { AudioQuote, SiteConfig } from './types.ts';
import { INITIAL_SITE_CONFIG, INITIAL_CLIPS } from './data/memorialData.ts';

export default function App() {
  const [siteConfig] = useState<SiteConfig>(INITIAL_SITE_CONFIG);
  const [clips] = useState<AudioQuote[]>(INITIAL_CLIPS);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Modal view state for 3 interactive features
  const [activeModal, setActiveModal] = useState<'poster' | 'voice' | 'pass' | null>(null);
  const [sharedNotice, setSharedNotice] = useState<string | null>(null);
  const [isJusticeAudioPlaying, setIsJusticeAudioPlaying] = useState(false);

  // Memorial Audio playback hook
  const {
    currentClip,
    isPlaying,
    isBuffering,
    errorMessage,
    playNextClip,
    selectSpecificClip,
    setInitialClipWithoutAutoplay,
    stopCurrentAudio,
  } = useMemorialAudio(clips);

  // Background Theme Song hook (auto-plays on entry, pauses when voice quote or justice voice plays)
  const {
    isPlaying: isThemePlaying,
    togglePlay: toggleThemePlay,
  } = useThemeSong(siteConfig.themeSongUrl, isPlaying || isJusticeAudioPlaying);

  // Check for deep link query parameter (e.g. ?v=5 or ?quote=5 or ?voice=5) on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedId = params.get('v') || params.get('voice') || params.get('quote');
      if (sharedId) {
        const targetId = parseInt(sharedId, 10);
        const foundClip = clips.find((c) => c.id === targetId);
        if (foundClip) {
          // Set the selected quote on screen, but strictly DO NOT autoplay before user interaction
          setInitialClipWithoutAutoplay(foundClip);
          setSharedNotice(`Shared Voice Recording #${foundClip.id}`);
        }
      }
    }
  }, [clips, setInitialClipWithoutAutoplay]);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between selection:bg-[#D71920] selection:text-white relative overflow-hidden cinematic-glow">
      {/* Subtle background ambient light */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(ellipse at 50% 18%, rgba(215, 25, 32, 0.08) 0%, rgba(8, 8, 8, 0) 65%)',
        }}
        aria-hidden="true"
      />

      {/* TOP HEADER: Small uppercase wordmark + Theme Song Control */}
      <header className="w-full pt-4 sm:pt-6 pb-2 px-4 sm:px-8 z-20 flex items-center justify-between">
        <div className="w-20 sm:w-28 hidden sm:block" />

        <h1 className="font-cinzel text-xs sm:text-sm md:text-base font-semibold tracking-[0.35em] sm:tracking-[0.45em] text-neutral-200 uppercase select-none transition-opacity duration-300 text-center mx-auto sm:mx-0">
          WHO IS HADI?
        </h1>

        <div className="w-auto flex justify-end">
          <ThemeSongControl
            isPlaying={isThemePlaying}
            onToggle={toggleThemePlay}
            hasThemeSong={Boolean(siteConfig.themeSongUrl)}
          />
        </div>
      </header>

      {/* CENTER: Main Memorial Stage: Compact & Close for mobile and desktop */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-3 sm:px-6 py-1 sm:py-3 z-10">
        {/* Deep link shared notice indicator */}
        {sharedNotice && (
          <div className="mb-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-sans tracking-wide flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D71920]" />
            <span>{sharedNotice} · Tap button to play</span>
            <button
              onClick={() => setSharedNotice(null)}
              className="text-neutral-500 hover:text-white text-xs ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Animated Portrait of Osman Hadi */}
        <section aria-label="Portrait of Shaheed Osman Hadi" className="w-full mb-2 sm:mb-4">
          <PortraitDisplay
            portraitUrl={siteConfig.portraitUrl}
            placeholderUsed={siteConfig.placeholderUsed}
            isPlaying={isPlaying}
          />
        </section>

        {/* Large Crimson-Red Interactive Button */}
        <section aria-label="Audio Playback Control" className="w-full mb-1">
          <MemorialButton
            onClick={playNextClip}
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            disabled={loadingInitial}
          />
        </section>

        {/* Subtle Waveform: Only occupies space while audio is actively playing or buffering */}
        {(isPlaying || isBuffering) && (
          <div className="h-5 sm:h-6 flex items-center justify-center my-1 transition-all">
            <AudioPlayerWaveform isPlaying={isPlaying} isBuffering={isBuffering} />
          </div>
        )}

        {/* Graceful Error Feedback if Audio Link Fails */}
        {errorMessage && (
          <div
            role="alert"
            className="w-full max-w-md mx-auto px-3 py-2 my-1 rounded bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300 text-center font-sans tracking-wide backdrop-blur-sm"
          >
            {errorMessage}
          </div>
        )}

        {/* External Embed Adapter (if active clip is YouTube/SoundCloud/Archive) */}
        {currentClip && currentClip.audioType === 'embed' && isPlaying && (
          <EmbedAudioAdapter clip={currentClip} />
        )}

        {/* Pure Bangla Quote Display: Positioned immediately underneath the button */}
        <section aria-label="Voice Quote Display" className="w-full mt-1.5 sm:mt-2.5 flex items-center justify-center">
          <QuoteDisplay currentClip={currentClip} isPlaying={isPlaying} />
        </section>

        {/* THREE MINIMAL FEATURE BUTTONS: Hadi Poster | Hadi's Voice | Pass the Voice */}
        <nav
          aria-label="Interactive Features"
          className="w-full max-w-sm sm:max-w-md mx-auto mt-4 sm:mt-5 px-2 flex items-center justify-center gap-2 sm:gap-2.5"
        >
          {/* Feature 1: Hadi Poster */}
          <button
            onClick={() => setActiveModal('poster')}
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-neutral-950/70 hover:bg-neutral-900 border border-neutral-800/90 hover:border-neutral-700 text-neutral-300 hover:text-white text-[11px] sm:text-xs font-sans tracking-wide transition-colors cursor-pointer select-none"
          >
            <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Hadi Poster</span>
          </button>

          {/* Feature 2: Hadi's Voice */}
          <button
            onClick={() => setActiveModal('voice')}
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-neutral-950/70 hover:bg-neutral-900 border border-neutral-800/90 hover:border-neutral-700 text-neutral-300 hover:text-white text-[11px] sm:text-xs font-sans tracking-wide transition-colors cursor-pointer select-none"
          >
            <svg className="w-3.5 h-3.5 text-[#D71920] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>Hadi's Voice</span>
          </button>

          {/* Feature 3: Pass the Voice */}
          <button
            onClick={() => setActiveModal('pass')}
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-neutral-950/70 hover:bg-neutral-900 border border-neutral-800/90 hover:border-neutral-700 text-neutral-300 hover:text-white text-[11px] sm:text-xs font-sans tracking-wide transition-colors cursor-pointer select-none"
          >
            <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Pass the Voice</span>
          </button>
        </nav>

        {/* CIRCULAR ANIMATED BUTTON: হাদী হত্যার বিচার চাই */}
        <section aria-label="Justice for Osman Hadi Voice Demand" className="w-full flex justify-center mt-2">
          <JusticeVoiceButton
            onPlayStateChange={(playing) => setIsJusticeAudioPlaying(playing)}
            isMainAudioPlaying={isPlaying}
            onStopMainAudio={() => stopCurrentAudio()}
          />
        </section>
      </main>

      {/* Pure, Dignified Footer without any Admin links */}
      <footer className="w-full py-4 sm:py-5 px-4 text-center border-t border-neutral-900/60 z-10">
        <p className="font-cinzel text-xs sm:text-sm tracking-[0.25em] text-neutral-400 uppercase select-none">
          HADI'S VOICE. HADI'S WORDS. HADI'S LEGACY.
        </p>
      </footer>

      {/* 1. HADI POSTER MODAL */}
      <HadiPosterModal
        isOpen={activeModal === 'poster'}
        onClose={() => setActiveModal(null)}
        quotes={clips}
        initialQuoteId={currentClip?.id || 1}
        portraitUrl={siteConfig.portraitUrl}
      />

      {/* 2. HADI'S VOICE MODAL */}
      <HadisVoiceModal
        isOpen={activeModal === 'voice'}
        onClose={() => setActiveModal(null)}
        quotes={clips}
        initialQuoteId={currentClip?.id || 1}
        onSelectForPassTheVoice={(clip) => {
          selectSpecificClip(clip);
          setActiveModal('pass');
        }}
      />

      {/* 3. PASS THE VOICE MODAL */}
      <PassTheVoiceModal
        isOpen={activeModal === 'pass'}
        onClose={() => setActiveModal(null)}
        quotes={clips}
        selectedQuoteId={currentClip?.id || 1}
        onSelectQuote={(id) => {
          const found = clips.find((c) => c.id === id);
          if (found) setInitialClipWithoutAutoplay(found);
        }}
      />
    </div>
  );
}
