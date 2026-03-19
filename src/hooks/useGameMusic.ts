import { useRef, useCallback, useEffect, useState } from 'react';

// Royalty-free game background music (upbeat, quiz-style)
const GAME_MUSIC_URL = 'https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3';

export function useGameMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const [volume, setVolume] = useState(0.3);

  // Initialize and preload audio element
  useEffect(() => {
    const audio = new Audio();
    audio.src = GAME_MUSIC_URL;
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Preload the audio
    audio.load();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback(() => {
    if (audioRef.current && !isPlayingRef.current) {
      audioRef.current.play().catch(err => {
        // Browser may block autoplay - that's ok, we'll try again on user interaction
        console.log('Music autoplay blocked:', err);
      });
      isPlayingRef.current = true;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      isPlayingRef.current = false;
    }
  }, []);

  const fadeOut = useCallback((duration: number = 1500) => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const startVolume = audio.volume;
    const startTime = Date.now();
    
    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      audio.volume = startVolume * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume; // Reset to current volume setting
        isPlayingRef.current = false;
      }
    };
    
    requestAnimationFrame(fade);
  }, [volume]);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  return { play, stop, fadeOut, volume, setVolume: updateVolume };
}
