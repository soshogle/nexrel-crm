
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface VoiceInterfaceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  hasPermission: boolean | null; // null = not checked, true = granted, false = denied
}

interface VoiceInterfaceHook extends VoiceInterfaceState {
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  resetTranscript: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceInterface(): VoiceInterfaceHook {
  const [state, setState] = useState<VoiceInterfaceState>({
    isListening: false,
    isSpeaking: false,
    transcript: "",
    error: null,
    isSupported: false,
    hasPermission: null,
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    const isSupported = !!(SpeechRecognition && speechSynthesis);

    setState((prev) => ({ ...prev, isSupported }));

    if (isSupported) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");

        setState((prev) => ({
          ...prev,
          transcript,
          error: null,
        }));
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: `Voice recognition error: ${event.error}`,
        }));
      };

      recognitionRef.current.onend = () => {
        setState((prev) => ({
          ...prev,
          isListening: false,
        }));
      };

      synthRef.current = speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Request microphone permission explicitly
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setState((prev) => ({
        ...prev,
        error: "Microphone access is not supported in your browser",
        hasPermission: false,
      }));
      return false;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      setState((prev) => ({
        ...prev,
        hasPermission: true,
        error: null,
      }));
      
      return true;
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      
      let errorMessage = "Microphone access was denied";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "not-allowed: Please allow microphone access in your browser settings";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone found on your device";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Microphone is being used by another application";
      }
      
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        hasPermission: false,
      }));
      
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || !state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Voice recognition is not supported in your browser",
      }));
      return;
    }

    // Check if we have permission, if not, request it
    if (state.hasPermission !== true) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      recognitionRef.current.start();
      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: "",
      }));
    } catch (error) {
      console.error("Error starting recognition:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to start voice recognition",
      }));
    }
  }, [state.isSupported, state.hasPermission, requestPermission]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setState((prev) => ({
        ...prev,
        isListening: false,
      }));
    }
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!synthRef.current || !state.isSupported) {
        return;
      }

      return new Promise((resolve, reject) => {
        // Cancel any ongoing speech
        synthRef.current?.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          setState((prev) => ({ ...prev, isSpeaking: true }));
        };

        utterance.onend = () => {
          setState((prev) => ({ ...prev, isSpeaking: false }));
          resolve();
        };

        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          setState((prev) => ({ ...prev, isSpeaking: false }));
          reject(event);
        };

        utteranceRef.current = utterance;
        synthRef.current?.speak(utterance);
      });
    },
    [state.isSupported]
  );

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setState((prev) => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: "" }));
  }, []);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    requestPermission,
  };
}
