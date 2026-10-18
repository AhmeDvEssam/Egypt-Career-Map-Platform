import InteractiveMap from "@/components/InteractiveMap";

export default function Home() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden">
      <main className="flex-grow pt-28 pb-section-gap flex flex-col gap-section-gap">
        
        {/* Hero Section */}
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full pt-16 pb-8 text-center flex flex-col items-center">
          <h1 className="font-display-lg text-[2.5rem] md:text-display-lg font-bold text-on-background mb-6 text-glow leading-tight">
            Navigate Egypt's Job Market with AI
          </h1>
          
          {/* Perplexity Style Search */}
          <div className="w-full max-w-3xl mb-12 relative group">
            <div className="absolute inset-0 bg-secondary/10 rounded-xl blur-xl group-focus-within:bg-secondary/20 transition-all duration-500"></div>
            <div className="relative flex items-center bg-surface-container-high border border-outline-variant rounded-xl overflow-hidden glass-panel focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all">
              <span className="material-symbols-outlined text-secondary ml-4 mr-2" style={{fontVariationSettings: "'FILL' 1"}}>magic_button</span>
              <input 
                className="w-full bg-transparent border-none text-on-background font-body-lg text-body-lg py-4 px-2 focus:ring-0 outline-none placeholder:text-outline" 
                placeholder="E.g., Show me Python jobs in Cairo... (Coming Soon)" 
                type="text"
                disabled
              />
              <button className="bg-secondary text-on-secondary px-6 py-2 rounded-lg mr-2 font-label-md text-label-md hover:bg-secondary-fixed transition-colors opacity-50 cursor-not-allowed">
                Search
              </button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/map" className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 hover:border-secondary/50 hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-primary">search</span>
              <span className="font-label-md text-label-md text-on-background">Find Jobs</span>
            </a>
            <a href="/cv-analysis" className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 hover:border-secondary/50 hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-tertiary">document_scanner</span>
              <span className="font-label-md text-label-md text-on-background">Analyze CV</span>
            </a>
            <a href="/market" className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 hover:border-secondary/50 hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-secondary">trending_up</span>
              <span className="font-label-md text-label-md text-on-background">Market Trends</span>
            </a>
            <a href="/salaries" className="glass-panel px-6 py-3 rounded-full flex items-center gap-2 hover:border-secondary/50 hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-primary">payments</span>
              <span className="font-label-md text-label-md text-on-background">Salaries</span>
            </a>
          </div>
        </section>

        {/* The Giant Interactive Map */}
        <section className="w-full relative h-[600px] border-y border-outline-variant/20 overflow-hidden bg-surface-container-lowest">
          <InteractiveMap mode="explore" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 pointer-events-none z-10"></div>
          
          <div className="absolute bottom-8 left-margin-mobile md:left-margin-desktop z-20 pointer-events-none">
            <div className="glass-panel p-6 rounded-xl glow-effect w-64 backdrop-blur-xl bg-background/60 border border-outline-variant/40">
              <h3 className="font-label-md text-label-md text-secondary mb-4 tracking-wider uppercase">Market Pulse</h3>
              <div className="space-y-4">
                <div>
                  <div className="font-label-sm text-label-sm text-outline uppercase">Active Jobs</div>
                  <div className="font-headline-lg text-3xl font-bold text-on-background">42,381</div>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-outline uppercase">Companies Hiring</div>
                  <div className="font-headline-md text-xl font-bold text-on-surface-variant">8,420</div>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-outline uppercase">New Jobs Today</div>
                  <div className="font-headline-md text-xl font-bold text-tertiary">+1,240</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Market Insights */}
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
          <h2 className="font-headline-lg text-3xl font-bold text-on-background mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-3xl">insights</span>
            Live AI Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Insight Card 1 */}
            <div className="glass-panel rounded-xl p-6 border-t-2 border-t-secondary relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-secondary">code</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-tertiary">local_fire_department</span>
                <span className="font-label-md text-label-md text-tertiary uppercase font-bold">Trending Skill</span>
              </div>
              <p className="font-body-lg text-lg text-on-background mb-2">Python demand is up 18% in the last 30 days.</p>
              <p className="font-body-md text-sm text-outline">Driven by AI and Data Science roles in fintech.</p>
            </div>
            
            {/* Insight Card 2 */}
            <div className="glass-panel rounded-xl p-6 border-t-2 border-t-tertiary relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-tertiary">trending_up</span>
                  <span className="font-label-md text-label-md text-tertiary uppercase font-bold">Growth Sector</span>
                </div>
                <p className="font-body-lg text-lg text-on-background mb-2">Renewable Energy Engineering</p>
              </div>
              <div className="h-24 mt-4 relative w-full chart-gradient rounded-b border-b border-tertiary/50">
                <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,100 L0,80 Q20,60 40,75 T80,40 T100,20 L100,100 Z" fill="rgba(78, 222, 163, 0.1)"></path>
                  <path d="M0,80 Q20,60 40,75 T80,40 T100,20" fill="none" stroke="#4edea3" strokeWidth="2"></path>
                </svg>
              </div>
            </div>
            
            {/* Insight Card 3 */}
            <div className="glass-panel rounded-xl p-6 border-t-2 border-t-primary relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">location_on</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">pin_drop</span>
                <span className="font-label-md text-label-md text-primary uppercase font-bold">Location Hub</span>
              </div>
              <p className="font-body-lg text-lg text-on-background mb-2">Cairo holds 70% of current tech job openings.</p>
              <p className="font-body-md text-sm text-outline">New Cairo and Maadi showing highest concentration.</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
          <div className="bg-surface-container-high rounded-2xl p-10 md:p-16 border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-tertiary/5 to-transparent pointer-events-none"></div>
            <div className="z-10 max-w-2xl">
              <h2 className="font-headline-lg text-3xl font-bold text-on-background mb-4">Discover your market value.</h2>
              <p className="font-body-lg text-lg text-on-surface-variant">
                Upload your CV and let our AI match you with the best opportunities, predict your salary tier, and highlight skill gaps.
              </p>
            </div>
            <div className="z-10 flex-shrink-0">
              <a href="/cv-analysis" className="bg-tertiary text-on-tertiary px-8 py-4 rounded-lg font-label-md text-label-md font-bold shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:shadow-[0_0_30px_rgba(78,222,163,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-2">
                <span className="material-symbols-outlined">upload_file</span>
                Analyze My CV
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
