import { useRef, useCallback, useEffect } from 'react';

// Pre-recorded congratulations audio (royalty-free female voice)
// Using a high-quality TTS generated audio file
const CONGRATULATIONS_URL = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3';

// Fallback: Use Web Speech API if available
export function useCongratulationsVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);

  // Preload the audio
  useEffect(() => {
    const audio = new Audio();
    audio.src = CONGRATULATIONS_URL;
    audio.preload = 'auto';
    audio.volume = 0.7;
    audio.load();
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playCongratulations = useCallback(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    // Try Web Speech API for "Congratulations to the winners"
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Congratulations to the winners!');
      
      // Try to find a female voice
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('victoria') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('moira') ||
        voice.name.includes('Google UK English Female') ||
        voice.name.includes('Microsoft Zira')
      ) || voices.find(voice => voice.lang.startsWith('en'));

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;

      // Small delay to let confetti start
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 500);
    }
  }, []);

  const reset = useCallback(() => {
    hasPlayedRef.current = false;
  }, []);

  return { playCongratulations, reset };
}
