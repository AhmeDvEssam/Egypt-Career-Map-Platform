import React, { useEffect, useState } from 'react';
import { AnalysisComponentProps } from './AnalysisRegistry';
import { VoiceManager } from './VoiceManager';

export default function JobCountAnalysis({ intent, dispatchIntent }: AnalysisComponentProps) {
  const [data, setData] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const city = intent.parameters.city || 'Egypt';

  useEffect(() => {
    if (intent.data) {
      setData(intent.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch('/api/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent)
    })
      .then(res => res.json())
      .then(json => {
        setData(json.data);
        setLoading(false);
        
        // --- VOICE LAYER INTEGRATION ---
        const jobCount = json.data?.count || 0;
        const speechText = `Here is your job market analysis for ${city}. We currently have ${jobCount} active job opportunities indexed. Would you like me to analyze the top skills for these roles?`;
        VoiceManager.speak(speechText, 'en-US-GuyNeural', 'google', 500);

        if (dispatchIntent && !intent.data) {
          dispatchIntent({ ...intent, data: json.data });
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [intent, city]);

  // Number count-up animation
  useEffect(() => {
    if (!data) return;
    const targetCount = data.count || 0;
    let current = 0;
    const increment = Math.ceil(targetCount / 50) || 1;
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        setCount(targetCount);
        clearInterval(interval);
      } else {
        setCount(current);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-outline-variant/30 flex justify-center items-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-primary font-bold tracking-widest uppercase text-sm">Analyzing Database...</p>
        </div>
      </div>
    );
  }

  const role = intent.parameters.role || '';
  const titleStr = role ? `${role} Jobs: ${city}` : `Jobs Overview: ${city}`;

  return (
    <div className="glass-panel p-8 rounded-3xl border-t-4 border-t-primary shadow-2xl bg-surface-container-high/80 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <span className="material-symbols-outlined text-[10rem] text-primary">work</span>
      </div>
      
      <div className="relative z-10 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 w-full">
          
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">location_on</span>
              <h2 className="font-headline-lg text-3xl text-white font-bold tracking-wide">{titleStr}</h2>
            </div>
            
            <div className="flex items-end gap-4">
              <div className="text-7xl md:text-8xl font-display-lg font-bold text-primary text-glow">
                {count.toLocaleString()}
              </div>
              <div className="text-outline-variant font-label-lg uppercase mb-3">Active Roles</div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-lg">
            <div className="bg-background/40 p-8 rounded-2xl border border-outline-variant/30 relative group overflow-hidden shadow-inner">
              <div className="text-sm text-outline-variant uppercase mb-2 tracking-wider font-bold">Average Salary Estimate</div>
              <div className="text-3xl text-white font-bold">
                {data?.avgSalaryMin && data?.avgSalaryMax 
                  ? `${Math.round(data.avgSalaryMin/1000)}K - ${Math.round(data.avgSalaryMax/1000)}K EGP` 
                  : <span className="text-secondary/80 flex items-center gap-2"><span className="material-symbols-outlined">magic_button</span> AI Estimating...</span>}
              </div>
            </div>
          </div>
        </div>

        {dispatchIntent && (
          <div className="pt-4 border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between bg-primary/5 rounded-xl p-6 mt-8 border border-primary/20 animate-in slide-in-from-bottom-2 fade-in duration-700 delay-500 fill-mode-both w-full gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary animate-pulse text-2xl">robot_2</span>
              <p className="text-base font-medium text-white/90">Would you like me to analyze the top skills for these roles?</p>
            </div>
            <button 
              onClick={() => dispatchIntent({ intentId: 'top_skills', parameters: { role: role || 'Software Developer' } })}
              className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 px-6 py-3 rounded-full text-sm transition-all flex items-center gap-2 font-bold shadow-[0_0_15px_rgba(78,222,163,0.3)] hover:shadow-[0_0_25px_rgba(78,222,163,0.5)] cursor-pointer relative z-50 whitespace-nowrap"
            >
              Show Top Skills <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
