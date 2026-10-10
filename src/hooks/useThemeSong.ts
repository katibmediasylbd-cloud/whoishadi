import { useState, useEffect, useRef, useCallback } from 'react';

export function useThemeSong(themeSongUrl: string | null | undefined, isQuoteAudioPlaying: boolean) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingBeforeQuoteRef = useRef(false);

  // Initialize theme audio
  useEffect(() => {
    if (typeof window === 'undefined' || !themeSongUrl) return;

    const audio = new Audio(themeSongUrl);
    audio.loop = true;
    audio.volume = 0.65; // Pleasant memorial background volume
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    // Attempt instant autoplay on site entry
    const startAutoplay = () => {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasStarted(true);
        })
        .catch(() => {
          // Browser prevented autoplay without prior gesture.
          // Wait for the first user interaction anywhere on the document.
          const unlockHandler = () => {
            if (audioRef.current && !wasPlayingBeforeQuoteRef.current) {
              audioRef.current
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setHasStarted(true);
                })
                .catch(() => {});
            }
            cleanupUnlockListeners();
          };

          const cleanupUnlockListeners = () => {
            window.removeEventListener('click', unlockHandler);
            window.removeEventListener('touchstart', unlockHandler);
            window.removeEventListener('keydown', unlockHandler);
          };

          window.addEventListener('click', unlockHandler, { once: true });
          window.addEventListener('touchstart', unlockHandler, { once: true });
          window.addEventListener('keydown', unlockHandler, { once: true });
        });
    };

    startAutoplay();

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audioRef.current = null;
    };
  }, [themeSongUrl]);

  // When quote voice audio starts playing: pause theme song so Hadi's voice is heard cleanly
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isQuoteAudioPlaying) {
      if (isPlaying) {
        wasPlayingBeforeQuoteRef.current = true;
        audio.pause();
      }
    } else {
      // When voice quote ends, resume theme song if it was playing before
      if (wasPlayingBeforeQuoteRef.current) {
        wasPlayingBeforeQuoteRef.current = false;
        audio.play().catch(() => {});
      }
    }
  }, [isQuoteAudioPlaying, isPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      wasPlayingBeforeQuoteRef.current = false;
    } else {
      audio.play().catch((err) => console.warn('Theme play error:', err));
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  return {
    isPlaying,
    isMuted,
    hasStarted,
    togglePlay,
    toggleMute,
  };
}
