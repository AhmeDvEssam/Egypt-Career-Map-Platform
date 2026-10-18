import React, { useEffect, useState } from 'react';
import { AnalysisComponentProps } from './AnalysisRegistry';
import { VoiceManager } from './VoiceManager';

export default function TopSkillsAnalysis({ intent, dispatchIntent }: AnalysisComponentProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const role = intent.parameters.role || 'All Roles';
  const city = intent.parameters.city || '';
  const contextStr = city ? `${role} in ${city}` : role;

  useEffect(() => {
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
        const skills = json.data?.skills || [];
        if (skills.length > 0) {
          const topSkillsNames = skills.slice(0, 3).map((s: any) => s.name).join(', and ');
          VoiceManager.speak(`The top skills in demand for ${contextStr} are ${topSkillsNames}.`, 'en-US-GuyNeural', 'google', 500);
        } else {
          VoiceManager.speak(`I couldn't find sufficient skill data for ${role}.`, 'en-US-AriaNeural', 'google', 500);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [intent, role]);

  const skills = data?.skills || [];

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-outline-variant/30 flex justify-center items-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin"></div>
          <p className="text-secondary font-bold tracking-widest uppercase text-sm">Analyzing Skill Demand...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 rounded-3xl border-t-4 border-t-secondary shadow-2xl bg-surface-container-high/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-secondary text-3xl">code_blocks</span>
        <h2 className="font-headline-lg text-2xl text-white font-bold tracking-wide">
          Top Skills for {contextStr}
        </h2>
      </div>

      <div className="flex flex-col gap-5">
        {skills.map((skill: any) => (
          <div key={skill.name} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white font-medium text-lg">{skill.name}</span>
              <span className="text-secondary font-bold bg-secondary/10 px-3 py-1 rounded-full">
                {skill.count} mentions
              </span>
            </div>
            <div className="w-full h-3 bg-background rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-secondary transition-all duration-1000 ease-out neon-glow-secondary" 
                style={{ width: `${skill.pct}%` }}
              ></div>
            </div>
          </div>
        ))}
        
        {skills.length === 0 && (
          <div className="text-outline-variant italic">No skill data found for this role.</div>
        )}
      </div>
    </div>
  );
}
