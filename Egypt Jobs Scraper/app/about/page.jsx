"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AboutPage;
const framer_motion_1 = require("framer-motion");
const Navbar_1 = __importDefault(require("@/app/components/Navbar"));
const Footer_1 = __importDefault(require("@/app/components/Footer"));
const spring = { type: 'spring', stiffness: 300, damping: 25 };
const values = [
    {
        title: 'Data-Driven',
        description: 'Every decision and insight on our platform is backed by real-time labor market data.',
        icon: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
      </svg>),
    },
    {
        title: 'Open & Accessible',
        description: 'We aggregate from multiple public sources so no opportunity is missed. Free for job seekers.',
        icon: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>
      </svg>),
    },
    {
        title: 'AI-Powered',
        description: 'Machine learning drives our skill extraction, salary benchmarking, and smart matching.',
        icon: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
      </svg>),
    },
    {
        title: 'Egypt-Focused',
        description: 'Built specifically for the Egyptian market. All 27 governorates, local salary norms, and Arabic support.',
        icon: (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>
      </svg>),
    },
];
function AboutPage() {
    return (<main className="min-h-screen bg-zinc-950">
      <Navbar_1.default />
      <div className="mesh-gradient fixed inset-0 opacity-20 pointer-events-none"/>
      <div className="relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold">
              About{' '}
              <span className="text-gradient">Egypt Career Map</span>
            </h1>
            <p className="text-zinc-400 mt-4 text-lg max-w-2xl mx-auto">
              We are building the most comprehensive labor market intelligence platform for Egypt.
            </p>
          </framer_motion_1.motion.div>

          <framer_motion_1.motion.div className="glass-card rounded-2xl p-8 md:p-10 mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Our Mission</h2>
            <p className="text-zinc-300 leading-relaxed">
              Egypt Career Map aggregates job listings from LinkedIn, Wuzzuf, and Indeed into a unified platform
              with AI-powered skill extraction, salary benchmarking, and labor market analytics. We empower job
              seekers with smart matching and skill gap analysis, recruiters with semantic talent discovery, and
              strategic planners with data-driven insights into Egypt&apos;s evolving job landscape.
            </p>
          </framer_motion_1.motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {values.map((v, i) => (<framer_motion_1.motion.div key={v.title} className="glass-card-hover rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.05 }}>
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-4">
                  {v.icon}
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{v.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{v.description}</p>
              </framer_motion_1.motion.div>))}
          </div>

          <framer_motion_1.motion.div className="glass-card rounded-2xl p-8 md:p-10 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.4 }}>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Our Data Sources</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {['LinkedIn', 'Wuzzuf', 'Indeed'].map((s) => (<span key={s} className="text-sm px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300">
                  {s}
                </span>))}
            </div>
            <p className="text-zinc-500 text-sm mt-4">
              Data is aggregated daily. All listings link back to original sources.
            </p>
          </framer_motion_1.motion.div>
        </div>
      </div>
      <Footer_1.default />
    </main>);
}
