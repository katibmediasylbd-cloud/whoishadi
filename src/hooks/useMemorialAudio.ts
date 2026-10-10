import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioQuote, PlaybackStatus } from '../types.ts';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useMemorialAudio(clips: AudioQuote[]) {
  const [currentClip, setCurrentClip] = useState<AudioQuote | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remaining clips in current shuffled cycle
  const queueRef = useRef<AudioQuote[]>([]);
  const lastPlayedIdRef = useRef<number | null>(null);

  // Single HTML5 Audio element instance
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize or re-initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';

    const onPlay = () => {
      setPlaybackStatus('playing');
      setErrorMessage(null);
    };

    const onWaiting = () => {
      setPlaybackStatus('buffering');
    };

    const onCanPlay = () => {
      // Don't override playing if already playing
      setPlaybackStatus((prev) => (prev === 'buffering' ? 'playing' : prev));
    };

    const onEnded = () => {
      setPlaybackStatus('idle');
    };

    const onError = () => {
      setPlaybackStatus('error');
      setErrorMessage('Audio clip is currently unavailable. Please try again or notify the administrator.');
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []);

  // Sync queue if clips list changes
  useEffect(() => {
    if (clips.length > 0) {
      // If queue is empty or has stale items, refresh
      const validQueue = queueRef.current.filter((item) =>
        clips.some((c) => c.id === item.id)
      );
      if (validQueue.length === 0) {
        queueRef.current = shuffleArray(clips);
      } else {
        queueRef.current = validQueue;
      }
    } else {
      queueRef.current = [];
    }
  }, [clips]);

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaybackStatus('idle');
  }, []);

  const playNextClip = useCallback(() => {
    if (!clips || clips.length === 0) {
      setErrorMessage('The audio archive is currently being prepared. Candidate quotes are undergoing audio verification before publication.');
      return;
    }

    // Stop current audio immediately if playing
    stopCurrentAudio();
    setErrorMessage(null);

    // If queue is empty, start a new shuffled cycle
    if (queueRef.current.length === 0) {
      let shuffled = shuffleArray(clips);
      // Avoid immediate repetition of the very last clip played if more than 1 clip available
      if (clips.length > 1 && shuffled[0].id === lastPlayedIdRef.current) {
        shuffled = [...shuffled.slice(1), shuffled[0]];
      }
      queueRef.current = shuffled;
    }

    // Pick next clip from cycle
    const nextClip = queueRef.current.shift();
    if (!nextClip) return;

    lastPlayedIdRef.current = nextClip.id;
    setCurrentClip(nextClip);

    // Check if the quote has a valid matching audio URL attached
    const hasAudio = Boolean(nextClip.audioUrl && nextClip.audioUrl.trim());

    if (!hasAudio) {
      // If a quote has no audio attached yet, do not pretend audio is playing.
      // Stop any prior voice audio; the quote is displayed prominently.
      stopCurrentAudio();
      setPlaybackStatus('idle');
      return;
    }

    // If it's a direct or uploaded audio file, use HTML5 Audio
    const isDirectAudio =
      nextClip.audioType === 'direct' ||
      nextClip.audioType === 'upload' ||
      /\.(mp3|wav|ogg|m4a|aac|weba|flac)(\?.*)?$/i.test(nextClip.audioUrl) ||
      nextClip.audioUrl.startsWith('/uploads/');

    if (isDirectAudio) {
      if (audioRef.current) {
        setPlaybackStatus('buffering');
        audioRef.current.src = nextClip.audioUrl;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setPlaybackStatus('playing');
          })
          .catch((err) => {
            console.warn('Playback error:', err);
            // Autoplay rejection or network error
            if (err.name === 'NotAllowedError') {
              setErrorMessage('Browser requires a user click to play audio.');
            } else {
              setErrorMessage('Unable to stream this recording. Please check the audio URL in /admin.');
            }
            setPlaybackStatus('error');
          });
      }
    } else {
      // For external embedded audio (e.g., YouTube, SoundCloud), set as playing so UI reveals quote & player
      setPlaybackStatus('playing');
    }
  }, [clips, stopCurrentAudio]);

  const selectSpecificClip = useCallback((clip: AudioQuote) => {
    stopCurrentAudio();
    setErrorMessage(null);
    lastPlayedIdRef.current = clip.id;
    setCurrentClip(clip);

    const hasAudio = Boolean(clip.audioUrl && clip.audioUrl.trim());
    if (!hasAudio) {
      stopCurrentAudio();
      setPlaybackStatus('idle');
      return;
    }

    if (audioRef.current) {
      setPlaybackStatus('buffering');
      audioRef.current.src = clip.audioUrl;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => setPlaybackStatus('playing'))
        .catch(() => setPlaybackStatus('idle'));
    }
  }, [stopCurrentAudio]);

  const setInitialClipWithoutAutoplay = useCallback((clip: AudioQuote) => {
    stopCurrentAudio();
    setErrorMessage(null);
    lastPlayedIdRef.current = clip.id;
    setCurrentClip(clip);
    setPlaybackStatus('idle');
  }, [stopCurrentAudio]);

  return {
    currentClip,
    playbackStatus,
    isPlaying: playbackStatus === 'playing',
    isBuffering: playbackStatus === 'buffering',
    errorMessage,
    playNextClip,
    selectSpecificClip,
    setInitialClipWithoutAutoplay,
    stopCurrentAudio,
  };
}
