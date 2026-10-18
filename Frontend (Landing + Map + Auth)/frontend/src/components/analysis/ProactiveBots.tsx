import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProactiveBotsProps {
  intent?: any;
  setChatInput: (val: string) => void;
  submitChat: (text: string) => void;
  // NEW PROPS
  chatHistory: any[];
  chatInput: string;
  isTyping: boolean;
  isListening: boolean;
  toggleListening: () => void;
  handleChatSubmit: (e?: React.FormEvent, overrideInput?: string) => void;
}

type BotSuggestion = {
  id: string;
  text: string;
};

export default function ProactiveBots({ 
  intent, setChatInput, submitChat,
  chatHistory, chatInput, isTyping, isListening, toggleListening, handleChatSubmit 
}: ProactiveBotsProps) {
  const [visibleBot, setVisibleBot] = useState<BotSuggestion | null>(null);
  const suggestionIndexRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const generateBot = useCallback(() => {
    // If the chat window is open, don't generate new bubbles
    if (isOpen) return;
    
    const { city, role } = intent?.parameters || {};
    const possibleSuggestions: string[] = [];
    
    if (role) {
      possibleSuggestions.push(`تحب تعرف في كام وظيفة لـ ${role} في القاهرة؟`);
      possibleSuggestions.push(`تحب تعرف إيه هي المهارات المطلوبة لـ ${role}؟`);
    }
    if (city) {
      possibleSuggestions.push(`تحب تعرف إيه أكتر الوظائف المطلوبة في ${city}؟`);
    }
    
    possibleSuggestions.push("تحب تعرف في كام وظيفة Data Analyst في إسكندرية؟");
    possibleSuggestions.push("تحب تعرف إيه أكتر الوظائف المطلوبة في مصر؟");
    possibleSuggestions.push("تحب تعرف إيه هي المهارات المطلوبة للـ Frontend؟");

    const nextIndex = (suggestionIndexRef.current + 1) % possibleSuggestions.length;
    suggestionIndexRef.current = nextIndex;
    
    setVisibleBot({
      id: `bot-${Date.now()}`,
      text: possibleSuggestions[nextIndex]
    });
  }, [intent, isOpen]);

  useEffect(() => {
    generateBot();
    const interval = setInterval(() => {
      generateBot();
    }, 30000);
    return () => clearInterval(interval);
  }, [generateBot]);

  const handleSuggestionClick = (text: string) => {
    setVisibleBot(null);
    setChatInput(text);
    handleChatSubmit(undefined, text);
    setIsOpen(true);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setVisibleBot(null);
  };

  return (
    <motion.div 
      drag
      dragConstraints={{ left: -1000, right: 50, top: -1000, bottom: 50 }}
      className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4 pointer-events-auto"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-surface-container-high/90 backdrop-blur-xl border border-secondary/50 rounded-2xl shadow-[0_0_30px_rgba(93,230,255,0.2)] p-4 w-[350px] flex flex-col pointer-events-auto"
          >
            <div className="flex justify-between items-center mb-4 border-b border-outline-variant/30 pb-2">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">robot_2</span>
                Ask AI
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-outline-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-grow max-h-[300px] overflow-y-auto flex flex-col gap-3 mb-4 pr-1">
              {chatHistory.length === 0 && (
                <div className="text-center text-outline-variant my-4">
                  <p>إزاي أقدر أساعدك النهاردة؟</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-primary/20 text-white self-end text-right' : 'bg-surface-variant text-white self-start text-right'}`} dir="rtl">
                  {msg.content}
                </div>
              ))}
            </div>
            
            <form onSubmit={handleChatSubmit} className="relative flex items-center bg-surface-container border border-outline-variant/50 rounded-xl overflow-hidden focus-within:border-secondary transition-all">
              <input 
                className="w-full bg-transparent border-none text-white text-sm py-3 px-4 outline-none text-right" 
                placeholder="اسألني أي حاجة..." 
                type="text"
                dir="rtl"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isTyping}
              />
              <button 
                type="button"
                onClick={toggleListening}
                className={`p-2 flex items-center justify-center transition-all ${isListening ? 'text-error animate-pulse' : 'text-outline-variant hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xl">{isListening ? 'mic' : 'mic_none'}</span>
              </button>
              <button type="submit" disabled={isTyping || !chatInput.trim()} className="text-secondary p-2 hover:bg-secondary/20 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-xl transform rotate-180">send</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* The Draggable Bot Icon and its Comic Bubble */}
      <div className="relative flex items-end gap-2">
        <AnimatePresence>
          {visibleBot && !isOpen && (
            <motion.div
              key={visibleBot.id}
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-[80px] bottom-4 bg-white text-black p-4 pr-8 pl-4 shadow-2xl rounded-2xl cursor-pointer hover:scale-105 transition-transform w-[220px]"
              onClick={() => handleSuggestionClick(visibleBot.text)}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setVisibleBot(null); }}
                className="absolute top-1 left-2 text-gray-400 hover:text-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
              <p className="text-sm font-bold text-right leading-tight" dir="rtl">
                {visibleBot.text}
              </p>
              {/* The Triangle pointing to the bot */}
              <div className="absolute top-1/2 -right-[12px] -translate-y-1/2 w-0 h-0 border-y-[12px] border-y-transparent border-l-[16px] border-l-white" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={toggleOpen}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary text-background flex items-center justify-center shadow-[0_0_20px_rgba(93,230,255,0.4)] hover:scale-110 transition-transform cursor-pointer shrink-0 z-50"
        >
          <span className="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
      </div>
    </motion.div>
  );
}
