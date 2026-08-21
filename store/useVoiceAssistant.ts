'use client';

import { useState, useRef, useCallback } from 'react';
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
    setSearchResults,
    setBudgetLimit,
  } = useShoppingStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

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

      if (data.action === 'ADD_BUNDLE' || data.action === 'ADD') {
        if (Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            addItem({
              name: item.name,
              quantity: Number(item.quantity) || 1,
              unit: item.unit || undefined,
              category: item.category || 'Other',
              price: Number(item.price) || 80,
              image: item.image || '🛒',
              substitutionNote: item.substitutionNote || undefined,
            });
          });
        }
      } else if (data.action === 'SET_BUDGET' && data.budget_limit) {
        setBudgetLimit(Number(data.budget_limit));
      } else if (data.action === 'SEARCH') {
        setSearchResults(data.search_results || [], cleanText);
      } else if (data.action === 'REMOVE' && Array.isArray(data.items)) {
        data.items.forEach((targetItem: any) => {
          const match = items.find((i) => i.name.toLowerCase().includes(targetItem.name.toLowerCase()));
          if (match) removeItem(match.id);
        });
      }

      if (data.ai_response_text) {
        setFeedbackMessage(data.ai_response_text);
        speak(data.ai_response_text);
      }
    } catch (err: any) {
      console.error('Voice process error:', err);
      setFeedbackMessage("Sorry, couldn't process that command.");
    } finally {
      setIsProcessing(false);
    }
  }, [items, purchaseHistory, selectedLanguage, addItem, removeItem, setSearchResults, setBudgetLimit, speak]);

  const toggleListening = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is supported in Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListening(true);
        setFeedbackMessage('Listening... Speak naturally 🎙️');
      };

      recognition.onresult = (event: any) => {
        const captured = event.results[0][0].transcript;
        setTranscript(captured);
        processTranscript(captured);
      };

      recognition.onerror = () => {
        setListening(false);
        recognitionRef.current = null;
        setFeedbackMessage('Microphone access interrupted.');
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setFeedbackMessage('Mic permission denied.');
      setListening(false);
    }
  }, [selectedLanguage, setListening, setTranscript, processTranscript]);

  return {
    toggleListening,
    processTranscript,
    isProcessing,
    feedbackMessage,
  };
}