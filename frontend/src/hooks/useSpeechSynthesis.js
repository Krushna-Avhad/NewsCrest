// src/hooks/useSpeechSynthesis.js
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useSpeechSynthesis
 * ------------------
 * Reusable hook that wraps the browser's Web Speech API.
 *
 * Returns:
 *   speak(text)   — start speaking the given text (stops any current speech first)
 *   stop()        — stop speaking immediately
 *   isSpeaking    — boolean, true while TTS is active
 *   isSupported   — boolean, false if browser doesn't support SpeechSynthesis
 *   voices        — array of available SpeechSynthesisVoice objects
 *   selectedVoice — currently selected voice (object)
 *   setVoice(v)   — set a specific voice
 *   rate          — current speech rate (0.5 – 2)
 *   setRate(n)    — change speech rate
 */
export function useSpeechSynthesis() {
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef(null);

  // Load available voices — Chrome loads them async
  useEffect(() => {
    if (!isSupported) return;

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        // Default: prefer an English voice
        const en = v.find((x) => x.lang.startsWith("en")) || v[0];
        setVoice(en);
      }
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [isSupported]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text) => {
      if (!isSupported || !text?.trim()) return;

      // Stop anything already playing
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      // Small delay so cancel() completes before we start
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.voice = selectedVoice;
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = selectedVoice?.lang || "en-US";

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        utterance.onpause = () => setIsSpeaking(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, 50);
    },
    [isSupported, selectedVoice, rate],
  );

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setVoice,
    rate,
    setRate,
  };
}
