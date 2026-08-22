'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useShoppingStore } from './useShoppingStore';

export function useVoiceAssistant() {
  const {
    items,
    purchaseHistory,
    selectedLanguage,
    setListening,
    setTranscript,
    addItem,
    removeItem,
    updateQuantityByName,
    setSearchResults,
    setSuggestions,
    setBudgetLimit,
  } = useShoppingStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage;
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, [selectedLanguage]);

  const processTranscript = useCallback(async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    setIsProcessing(true);
    setFeedbackMessage('Groq AI is reasoning...');

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: cleanText,
          currentCart: items,
          purchaseHistory: purchaseHistory,
          language: selectedLanguage,
        }),
      });

      const data = await res.json();

      // Guarded Cart Additions: Only run if items array actually contains items
      if ((data.action === 'ADD' || data.action === 'ADD_BUNDLE') && Array.isArray(data.items) && data.items.length > 0) {
        data.items.forEach((item: any) => {
          if (item && item.name && item.name.trim()) {
            addItem({
              name: item.name,
              quantity: Number(item.quantity) || 1,
              unit: item.unit || 'unit',
              category: item.category || 'Pantry',
              price: Number(item.price) || 60,
              image: item.image || '🛒',
              brand: item.brand || undefined,
              substitutionNote: item.substitutionNote || undefined,
              substituteSuggestion: item.substituteSuggestion || undefined,
            });
          }
        });
      } else if (data.action === 'REMOVE' && Array.isArray(data.items)) {
        data.items.forEach((targetItem: any) => {
          if (targetItem.name) removeItem(targetItem.name);
        });
      } else if (data.action === 'UPDATE_QUANTITY' && data.update_target) {
        updateQuantityByName(
          data.update_target.name,
          Number(data.update_target.new_quantity) || 1,
          data.update_target.new_unit
        );
      } else if (data.action === 'SEARCH') {
        setSearchResults(data.search_results || [], cleanText);
      } else if (
        (data.action === 'GET_SEASONAL' || 
         data.action === 'GET_RUNNING_LOW' || 
         data.action === 'GET_SUBSTITUTE' || 
         data.action === 'GET_DEALS') &&
        Array.isArray(data.suggestions)
      ) {
        setSuggestions(data.suggestions);
      } else if (data.action === 'SET_BUDGET' && data.budget_limit) {
        setBudgetLimit(Number(data.budget_limit));
      }

      // Voice and text loopback confirmation
      if (data.ai_response_text) {
        setFeedbackMessage(data.ai_response_text);
        speak(data.ai_response_text);
      }
    } catch (err: any) {
      console.error('Voice assistant error:', err);
      setFeedbackMessage("Couldn't process that command. Try again!");
    } finally {
      setIsProcessing(false);
    }
  }, [items, purchaseHistory, selectedLanguage, addItem, removeItem, updateQuantityByName, setSearchResults, setSuggestions, setBudgetLimit, speak]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, [setListening]);

  const toggleListening = useCallback(async () => {
    if (recognitionRef.current) {
      const finalRecorded = accumulatedTranscriptRef.current;
      stopListening();
      if (finalRecorded) {
        processTranscript(finalRecorded);
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is supported in Google Chrome, Microsoft Edge, and Safari.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());

      accumulatedTranscriptRef.current = '';
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListening(true);
        setFeedbackMessage('Listening... Speak naturally (tap mic when done) 🎙️');
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript + ' ';
        }

        const trimmed = currentText.trim();
        accumulatedTranscriptRef.current = trimmed;
        setTranscript(trimmed);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          if (accumulatedTranscriptRef.current) {
            processTranscript(accumulatedTranscriptRef.current);
          }
        }, 2500);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setFeedbackMessage(`Voice error: ${event.error}`);
          stopListening();
        }
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setFeedbackMessage('Microphone permission denied.');
      stopListening();
    }
  }, [selectedLanguage, setListening, setTranscript, processTranscript, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    toggleListening,
    processTranscript,
    isProcessing,
    feedbackMessage,
  };
}