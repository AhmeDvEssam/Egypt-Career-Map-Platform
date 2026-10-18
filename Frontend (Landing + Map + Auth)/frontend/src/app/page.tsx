"use client";
import InteractiveMap from "@/components/InteractiveMap";
import GovernorateBarChart from "@/components/GovernorateBarChart";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LayoutEngine from "@/components/analysis/LayoutEngine";
import ProactiveBots from "@/components/analysis/ProactiveBots";
import AnalysisRenderer from "@/components/analysis/AnalysisRenderer";

export default function Home() {
  const [isMapMode, setIsMapMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [viewMode, setViewMode] = useState<'LIVE' | 'AI_GENERATED'>('LIVE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);

  useEffect(() => {
    if (chartConfig) setViewMode('AI_GENERATED');
    else setViewMode('LIVE');
  }, [chartConfig]);

  
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    newToday: 0,
    trendingSkill: { name: "Loading...", count: 0, growth: "0%" },
    growthSector: "Loading...",
    sourceBreakdown: [] as {source: string, _count: {id: number}}[]
  });

  useEffect(() => {
    fetch("/api/stats?_t=" + Date.now())
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error);
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setIsTyping(true);
    setChatResponse(null);
    setChartConfig(null);
    
    try {
      const res = await fetch("http://localhost:8000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput })
      });
      const data = await res.json();
      setChatResponse(data.reply);
      setChatHistory(prev => [...prev, {role: "user", content: chatInput}, {role: "ai", content: data.reply}]);
      if (data.chart_config) {
        setChartConfig(data.chart_config);
      }
    } catch (err) {
      console.error(err);
      setChatResponse("Oops! The AI backend is currently offline. Please start the backend service.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden relative">
      
      {/* 1. Full-Screen Background Map */}
      <div className="fixed inset-0 z-0">
        <InteractiveMap mode={(isMapMode || viewMode === "AI_GENERATED") ? "jobs" : "explore"} highlightLocation={chartConfig?.parameters?.city || null} />
        {/* Subtle gradient overlays to ensure text readability */}
        <div className={`absolute inset-0 bg-gradient-to-b from-background/90 via-background/40 to-background/90 pointer-events-none transition-opacity duration-1000 ${(isMapMode || viewMode === 'AI_GENERATED') ? 'opacity-0' : 'opacity-100'}`}></div>
      </div>

      {isMapMode && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
          <button 
            onClick={() => setIsMapMode(false)}
            className="glass-panel border border-secondary/50 px-8 py-4 rounded-full flex items-center gap-3 hover:bg-surface-container transition-all text-white font-bold shadow-[0_0_30px_rgba(93,230,255,0.2)] hover:shadow-[0_0_50px_rgba(93,230,255,0.4)]"
          >
            <span className="material-symbols-outlined text-secondary text-2xl">close_fullscreen</span>
            Exit Map View
          </button>
        </div>
      )}

      {!isMapMode && (
        <main className="flex-grow pt-32 pb-section-gap flex flex-col gap-24 relative z-10 animate-in fade-in duration-700 pointer-events-none">
          
          {viewMode === "LIVE" && (<>
          {/* Hero Section */}
          <section className="px-6 lg:px-12 max-w-7xl mx-auto w-full text-center flex flex-col items-center pointer-events-auto">
            <h1 className="font-display-lg text-[2.5rem] md:text-[4rem] font-bold text-white mb-6 text-glow leading-tight drop-shadow-2xl">
              Navigate Egypt&apos;s Job Market with AI
            </h1>
            
            {/* Perplexity Style AI Chat */}
            <div id="ai-chat" className="w-full max-w-3xl mb-10 relative group scroll-mt-24">
              
              {/* Guided Questions Section (Phase 3 prototype) */}
              <div className="flex flex-wrap justify-center gap-3 mb-6 relative z-10">
                <button 
                  type="button"
                  onClick={() => {
                    setChatResponse(null);
                    setChartConfig({ intentId: 'job_count', parameters: { city: 'Cairo' } });
                  }}
                  className="bg-surface-container border border-secondary/30 text-white px-4 py-2 rounded-full text-sm hover:bg-secondary/20 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <span className="material-symbols-outlined text-secondary text-sm">explore</span>
                  How many jobs in Cairo?
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setChatResponse(null);
                    setChartConfig({ intentId: 'top_skills', parameters: { role: 'Frontend Developer' } });
                  }}
                  className="bg-surface-container border border-secondary/30 text-white px-4 py-2 rounded-full text-sm hover:bg-secondary/20 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <span className="material-symbols-outlined text-secondary text-sm">trending_up</span>
                  Top skills for Frontend?
                </button>
              </div>

              <div className="absolute inset-0 bg-secondary/20 rounded-xl blur-xl group-focus-within:bg-secondary/30 transition-all duration-500"></div>
              <form onSubmit={handleChatSubmit} className="relative flex items-center bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant/50 rounded-xl overflow-hidden focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all shadow-2xl">
                <span className="material-symbols-outlined text-secondary ml-4 mr-2" style={{fontVariationSettings: "'FILL' 1"}}>magic_button</span>
                <input 
                  className="w-full bg-transparent border-none text-white font-body-lg text-body-lg py-4 px-2 focus:ring-0 outline-none placeholder:text-outline-variant" 
                  placeholder="Ask a free-form question..." 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isTyping}
                />
                <button type="submit" disabled={isTyping || !chatInput.trim()} className="bg-secondary text-on-secondary px-6 py-2 rounded-lg mr-2 font-label-md text-label-md hover:bg-secondary/90 transition-colors disabled:opacity-50">
                  {isTyping ? 'Thinking...' : 'Ask AI'}
                </button>
              </form>
              
              {/* AI Chat Response Area / Deterministic UI */}
              {(chatResponse || chartConfig) && (
                <div className="mt-8 text-left animate-in slide-in-from-top-4 fade-in">
                  
                  {/* Analysis Renderer (Component Registry Output) */}
                  {chartConfig && (
                    <AnalysisRenderer intent={chartConfig} />
                  )}

                  {/* Fallback Text Response */}
                  {chatResponse && !chartConfig && (
                    <div className="p-6 glass-panel rounded-xl border border-secondary/30 bg-surface-container/90">
                      <div className="flex gap-3 mb-3 items-center">
                        <span className="material-symbols-outlined text-secondary text-2xl">robot_2</span>
                        <h3 className="text-white font-bold text-lg">AI Response</h3>
                      </div>
                      <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                        {chatResponse}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4 pointer-events-auto">
              <button onClick={() => setIsMapMode(true)} className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 border-secondary/50 hover:bg-secondary/10 transition-all shadow-[0_0_20px_rgba(93,230,255,0.15)] group">
                <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">travel_explore</span>
                <span className="font-label-md text-label-md text-white font-bold">Interactive Map</span>
              </button>
              <a href="/map" className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 hover:border-primary/50 hover:bg-surface-container transition-all shadow-lg">
                <span className="material-symbols-outlined text-primary">search</span>
                <span className="font-label-md text-label-md text-white font-medium">Find Jobs</span>
              </a>
              <a href="/cv-analysis" className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 hover:border-tertiary/50 hover:bg-surface-container transition-all shadow-lg">
                <span className="material-symbols-outlined text-tertiary">document_scanner</span>
                <span className="font-label-md text-label-md text-white font-medium">Analyze CV</span>
              </a>
            </div>
          </section>

          {/* Floating Market Pulse & Bar Chart */}
          <section className="px-6 lg:px-12 max-w-7xl mx-auto w-full flex flex-col lg:flex-row justify-between gap-8 pointer-events-auto">
            
            {/* Top Locations Chart */}
            <div className="glass-panel p-6 rounded-2xl glow-effect w-full lg:w-[45%] backdrop-blur-xl bg-background/50 border border-outline-variant/40 shadow-2xl">
              <h3 className="font-label-md text-label-md text-primary mb-5 tracking-wider uppercase font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">bar_chart</span>
                Top Hiring Locations
              </h3>
              <GovernorateBarChart />
            </div>

            {/* Pulse Stats */}
            <div className="glass-panel p-6 rounded-2xl glow-effect w-full lg:w-[40%] backdrop-blur-xl bg-background/50 border border-outline-variant/40 shadow-2xl flex flex-col justify-center">
              <h3 className="font-label-md text-label-md text-secondary mb-5 tracking-wider uppercase font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">sensors</span>
                Live Market Pulse
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-outline-variant/20 pb-3">
                  <div className="font-label-sm text-sm text-outline-variant uppercase">Active Jobs</div>
                  <div className="font-headline-lg text-4xl font-bold text-white text-glow">{stats.activeJobs > 0 ? stats.activeJobs.toLocaleString() : "..."}</div>
                </div>
                <div className="flex justify-between items-end border-b border-outline-variant/20 pb-3">
                  <div className="font-label-sm text-sm text-outline-variant uppercase">Companies</div>
                  <div className="font-headline-md text-2xl font-bold text-secondary">500+</div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="font-label-sm text-sm text-outline-variant uppercase">New Today</div>
                  <div className="font-headline-md text-2xl font-bold text-tertiary">+{stats.newToday > 0 ? stats.newToday.toLocaleString() : "..."}</div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Market Insights & Stats Dashboard */}
          <section className="px-6 lg:px-12 max-w-7xl mx-auto w-full pt-4 pointer-events-auto">
            <h2 className="font-headline-lg text-3xl font-bold text-white mb-8 flex items-center gap-3 drop-shadow-md">
              <span className="material-symbols-outlined text-secondary text-3xl">insights</span>
              Live Market Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Source Distribution Chart (Wuzzuf vs LinkedIn etc) */}
              <div className="glass-panel rounded-2xl p-6 border-t-2 border-t-primary md:col-span-2 relative overflow-hidden group transition-transform duration-300 shadow-xl backdrop-blur-xl bg-background/40">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">pie_chart</span>
                  <span className="font-label-md text-label-md text-primary uppercase font-bold">Job Sources</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  {stats.sourceBreakdown?.map((src, i) => {
                    const totalSourceJobs = stats.sourceBreakdown.reduce((sum, s) => sum + s._count.id, 0) || 1;
                    const pct = (src._count.id / totalSourceJobs) * 100;
                    return (
                      <div key={src.source} className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-white font-medium">{src.source || 'Unknown'}</span>
                          <span className="text-on-surface-variant font-label-sm">{src._count.id.toLocaleString()} jobs ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-secondary' : 'bg-tertiary'} transition-all duration-1000 ease-out`} 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insight Card: Trending Skill */}
              <div className="glass-panel rounded-2xl p-6 border-t-2 border-t-secondary relative overflow-hidden group transition-transform duration-300 shadow-xl backdrop-blur-xl bg-background/40">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-6xl text-secondary">code</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-secondary">local_fire_department</span>
                  <span className="font-label-md text-label-md text-secondary uppercase font-bold">Trending Skill</span>
                </div>
                <p className="font-body-lg text-lg text-white mb-2 font-medium">{stats.trendingSkill.name} demand is up.</p>
                <p className="font-body-md text-sm text-outline-variant">Found in {stats.trendingSkill.count} job listings.</p>
              </div>
              
              {/* Insight Card: Growth Sector */}
              <div className="glass-panel rounded-2xl p-6 border-t-2 border-t-tertiary relative overflow-hidden group transition-transform duration-300 flex flex-col justify-between shadow-xl backdrop-blur-xl bg-background/40">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-tertiary">trending_up</span>
                    <span className="font-label-md text-label-md text-tertiary uppercase font-bold">Growth Sector</span>
                  </div>
                  <p className="font-body-lg text-lg text-white mb-2 font-medium">{stats.growthSector}</p>
                </div>
                <div className="h-16 mt-4 relative w-full chart-gradient rounded-b border-b border-tertiary/50">
                  <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,100 L0,80 Q20,60 40,75 T80,40 T100,20 L100,100 Z" fill="rgba(78, 222, 163, 0.1)"></path>
                    <path d="M0,80 Q20,60 40,75 T80,40 T100,20" fill="none" stroke="#4edea3" strokeWidth="2"></path>
                  </svg>
                </div>
              </div>
              
            </div>
          </section>

        </>
          )}

          {viewMode === "AI_GENERATED" && (
            <section className="w-full h-full pointer-events-auto">
              <LayoutEngine intent={chartConfig} dispatchIntent={setChartConfig} />
            </section>
          )}
        </main>
      )}
      {viewMode === "AI_GENERATED" && (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4 pointer-events-auto">
          <ProactiveBots 
            intent={chartConfig} 
            setChatInput={setChatInput} 
            submitChat={(text) => {
               setChatInput(text);
               // @ts-ignore
               handleChatSubmit({ preventDefault: () => {} } as React.FormEvent);
            }} 
            chatHistory={chatHistory}
            chatInput={chatInput}
            isTyping={isTyping}
            isListening={false}
            toggleListening={() => {}}
            handleChatSubmit={(e, t) => {
                if (t) setChatInput(t);
                // @ts-ignore
                handleChatSubmit(e || { preventDefault: () => {} } as React.FormEvent);
            }}
          />
        </div>
      )}
    </div>
  );
}
