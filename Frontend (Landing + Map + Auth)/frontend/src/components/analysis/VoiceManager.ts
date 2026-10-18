export class VoiceManager {
  static audioContext: HTMLAudioElement | null = null;
  static currentSpeechId: number = 0;

  static async speak(text: string, voice: string = 'en-US-GuyNeural', provider: string = 'google', delayMs: number = 500) {
    // Stop any currently playing audio
    VoiceManager.stop();
    
    // Increment the speech session ID for this request
    const speechId = ++VoiceManager.currentSpeechId;

    // Clean text: remove emojis and markdown symbols to prevent TTS from reading them aloud
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]/gu, '')
                          .replace(/[*#_`\[\]()]/g, '');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, provider })
      });

      // If a new speech request was made while we were fetching, abort playing this one
      if (speechId !== VoiceManager.currentSpeechId) return;

      if (!response.ok) {
        if (response.status !== 501) {
          console.warn('TTS server returned non-ok status, falling back to local speech.');
        }
        // Fallback to Web Speech API
        VoiceManager.speakFallback(text, delayMs);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      VoiceManager.audioContext = new Audio(url);
      
      setTimeout(() => {
        if (speechId !== VoiceManager.currentSpeechId) return;
        VoiceManager.audioContext?.play().catch(e => {
          if (e.name === 'AbortError') return;
          console.error("Audio play failed (maybe autoplay blocked?):", e);
          // If browser blocked it, we could fallback, but we'll just log for now
        });
      }, delayMs);

    } catch (e) {
      if (speechId !== VoiceManager.currentSpeechId) return;
      console.error("TTS request failed:", e);
      VoiceManager.speakFallback(text, delayMs);
    }
  }

  static stop() {
    VoiceManager.currentSpeechId++;
    if (VoiceManager.audioContext) {
      VoiceManager.audioContext.pause();
      VoiceManager.audioContext.currentTime = 0;
      VoiceManager.audioContext = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  static speakFallback(text: string, delayMs: number = 500) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not supported.');
      return;
    }
    window.speechSynthesis.cancel();
    
    const speechId = ++VoiceManager.currentSpeechId;

    setTimeout(() => {
      if (speechId !== VoiceManager.currentSpeechId) return;

      const isArabic = /[\u0600-\u06FF]/.test(text);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isArabic ? 'ar-SA' : 'en-US';
      utterance.rate = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = isArabic
        ? voices.find(v => v.lang.startsWith('ar'))
        : voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }, delayMs);
  }
}
