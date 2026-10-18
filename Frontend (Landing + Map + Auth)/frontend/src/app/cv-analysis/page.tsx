"use client";

import { useState } from "react";

export default function CVAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", file);
    if (targetRole) formData.append("target_role", targetRole);

    try {
      const response = await fetch("/api/assistant/cv_analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze CV. Please try again.");
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const readinessScore = analysisResult?.readiness_score ?? 0;
  const strokeDasharray = `${readinessScore}, 100`;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden">
      <main className="flex-grow pt-[100px] px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full pb-section-gap">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-display-lg font-display-lg text-on-surface mb-4">Your Career Profile &amp; Readiness</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl">AI-driven analysis of your skills against current market demands in Egypt.</p>
        </header>

        {/* Bento Grid Layout for Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-section-gap">
          {/* The Score (Left) */}
          <section className="lg:col-span-4 glass-panel rounded-xl p-8 flex flex-col items-center justify-center ai-glow-secondary relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-6 text-center w-full">Market Readiness Score</h2>
            
            <div className="w-full flex justify-center mb-4 neon-emerald-glow">
              <svg className="w-48 h-48 drop-shadow-2xl" viewBox="0 0 36 36">
                <path className="text-surface-container-high" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={strokeDasharray} strokeLinecap="round"></path>
                <text x="18" y="21.5" className="fill-on-surface text-[9px] font-bold" textAnchor="middle">{readinessScore}%</text>
              </svg>
            </div>
            
            <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
              <span className="px-2 py-1 bg-tertiary/20 text-tertiary rounded text-label-sm font-label-sm uppercase border border-tertiary/30">
                {readinessScore >= 80 ? "Highly Competitive" : readinessScore >= 50 ? "Competitive" : "Needs Improvement"}
              </span>
            </div>
            {analysisResult?.llm_provider && (
              <div className="mt-6 px-3 py-1.5 bg-surface-container rounded-full text-xs text-on-surface-variant flex items-center gap-2 border border-outline/20">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>AI Engine: <strong className="text-primary tracking-wide">{analysisResult.llm_provider.toUpperCase()}</strong></span>
              </div>
            )}
          </section>

          {/* CV Dropzone (Right) */}
          <section className="lg:col-span-8 glass-panel rounded-xl p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-headline-md font-headline-md text-on-surface">Update Profile Canvas</h2>
              
              {analysisResult && (
                <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1.5 rounded-full border border-secondary/20">
                    <span className="material-symbols-outlined text-sm text-secondary">psychology</span>
                    <label className="text-label-sm text-on-surface-variant">Detected Role:</label>
                    <span className="text-sm text-secondary font-bold">{analysisResult.target_role}</span>
                </div>
              )}
            </div>

            
            <div className="mb-4 w-full">
              <label className="block text-body-md text-on-surface-variant mb-2">Target Job Role (Optional)</label>
              <input 
                type="text" 
                value={targetRole} 
                onChange={(e) => setTargetRole(e.target.value)} 
                placeholder="e.g. Data Analyst, Frontend Developer..." 
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-colors"
              />
              <p className="text-sm text-on-surface-variant/70 mt-1">If left blank, AI will analyze your CV to guess your role.</p>
            </div>
            
            <label className="flex-grow
 border-2 border-dashed border-outline-variant hover:border-secondary/50 rounded-lg bg-surface/50 transition-colors duration-300 flex flex-col items-center justify-center cursor-pointer group relative">
              <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant group-hover:text-secondary">
                  {file ? "description" : "cloud_upload"}
                </span>
              </div>
              <h3 className="text-headline-md font-headline-md text-on-surface mb-2">
                {file ? file.name : "Upload Updated CV (PDF)"}
              </h3>
              <p className="text-body-md font-body-md text-on-surface-variant">
                {file ? "Click to change file" : "Drag and drop your PDF here to recalibrate your readiness score."}
              </p>
            </label>

            {file && (
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={handleUpload} 
                  disabled={isLoading}
                  className="bg-secondary text-on-secondary px-6 py-2 rounded-lg font-label-md transition-all hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading && <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>}
                  {isLoading ? "Analyzing via AI..." : "Analyze CV"}
                </button>
              </div>
            )}
            
            {error && (
              <div className="mt-4 text-error text-sm text-center">{error}</div>
            )}
          </section>
        </div>

        {/* Skill Gap Analysis (Rendered only when analysisResult exists) */}
        {analysisResult && (
          <>
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-8">Skill Vector Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-section-gap">
              
              {/* Panel 1: Top Marketable Skills */}
              <div className="glass-panel rounded-xl p-6 border-t border-t-tertiary/30">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-tertiary">check_circle</span>
                  <h3 className="text-headline-md font-headline-md text-on-surface">Your Top Marketable Skills</h3>
                </div>
                <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {analysisResult.top_marketable.length === 0 ? (
                    <li className="text-on-surface-variant text-center py-4">No matching top skills found.</li>
                  ) : (
                    analysisResult.top_marketable.map((skill: any, i: number) => (
                      <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50 border border-outline-variant/20 hover:border-tertiary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-tertiary neon-emerald-glow" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                          <span className="text-body-lg font-body-lg text-on-surface">{skill.name}</span>
                        </div>
                        <span className="text-label-sm font-label-sm text-tertiary uppercase tracking-wider">Demand: {skill.demand}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Panel 2: Missing Market Skills */}
              <div className="glass-panel rounded-xl p-6 border-t border-t-error/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">warning</span>
                    <h3 className="text-headline-md font-headline-md text-on-surface">Missing Market Skills</h3>
                  </div>
                  <span className="text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">Target: {analysisResult.target_role}</span>
                </div>
                <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {analysisResult.missing_skills.length === 0 ? (
                    <li className="text-on-surface-variant text-center py-4">You have all the top skills!</li>
                  ) : (
                    analysisResult.missing_skills.map((skill: any, i: number) => (
                      <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50 border border-outline-variant/20 hover:border-error/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-error" style={{fontVariationSettings: "'FILL' 1"}}>error</span>
                          <span className="text-body-lg font-body-lg text-on-surface opacity-80">{skill.name}</span>
                        </div>
                        <button className="text-label-sm font-label-sm text-secondary hover:text-secondary-fixed transition-colors">Explore</button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* AI Career Coach */}
            <section className="glass-panel rounded-xl p-8 ai-glow-primary border-t border-t-secondary/50 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'linear-gradient(rgba(93, 230, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(93, 230, 255, 0.2) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-grow">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-2xl">robot_2</span>
                  </div>
                  <div>
                    <h4 className="text-label-md font-label-md text-secondary uppercase tracking-wider mb-2">Aether Intelligence insight</h4>
                    <p className="text-headline-md font-headline-md text-on-surface leading-tight">
                      {analysisResult.missing_skills.length > 0 ? (
                        <>
                          "Based on the Egyptian market, learning <span className="text-secondary font-bold">{analysisResult.missing_skills[0]?.name}</span> will increase your match rate for top-tier roles."
                        </>
                      ) : (
                        "You are a perfect match for the market!"
                      )}
                    </p>
                  </div>
                </div>
                <button className="shrink-0 bg-transparent border border-secondary text-secondary hover:bg-secondary/10 px-6 py-3 rounded-lg text-label-md font-label-md transition-all duration-300 flex items-center gap-2 ai-glow-secondary">
                  <span className="material-symbols-outlined">route</span>
                  Generate Learning Roadmap
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
