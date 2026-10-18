"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SkillsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const Navbar_1 = __importDefault(require("@/app/components/Navbar"));
const Footer_1 = __importDefault(require("@/app/components/Footer"));
const spring = { type: 'spring', stiffness: 300, damping: 25 };
function SkillsPage() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [search, setSearch] = (0, react_1.useState)('');
    const [page, setPage] = (0, react_1.useState)(1);
    const fetchSkills = (0, react_1.useCallback)(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (search)
            params.set('search', search);
        try {
            const res = await fetch(`/api/skills?${params}`);
            setData(await res.json());
        }
        catch {
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, [page, search]);
    (0, react_1.useEffect)(() => { fetchSkills(); }, [fetchSkills]);
    const maxCount = data?.skills.reduce((m, s) => Math.max(m, s.jobCount), 1) ?? 1;
    return (<main className="min-h-screen bg-zinc-950">
      <Navbar_1.default />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">
              Skills <span className="text-gradient">Explorer</span>
            </h1>
            <p className="text-zinc-400 mt-2">
              Discover the most in-demand skills across the Egyptian job market
            </p>
          </framer_motion_1.motion.div>

          <div className="max-w-md mb-8 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Search skills..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm"/>
          </div>

          {data && !loading && (<p className="text-sm text-zinc-500 mb-6">{data.total} skills found</p>)}

          {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (<div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mb-2"/>
                  <div className="h-2 bg-zinc-800 rounded w-full"/>
                </div>))}
            </div>) : data && data.skills.length > 0 ? (<>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.skills.map((skill, i) => {
                const widthPct = (skill.jobCount / maxCount) * 100;
                return (<framer_motion_1.motion.div key={skill.name} className="glass-card-hover rounded-xl p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.02 }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-zinc-200">{skill.name}</span>
                        <span className="text-xs text-teal-400">{skill.jobCount} jobs</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <framer_motion_1.motion.div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${widthPct}%` }} transition={{ duration: 0.8, delay: i * 0.03 }}/>
                      </div>
                    </framer_motion_1.motion.div>);
            })}
              </div>

              {data.totalPages > 1 && (<div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:bg-zinc-900 disabled:opacity-40">Previous</button>
                  <span className="text-sm text-zinc-500">Page {page} of {data.totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:bg-zinc-900 disabled:opacity-40">Next</button>
                </div>)}
            </>) : (<div className="text-center py-20">
              <p className="text-zinc-500 text-lg">No skills found</p>
            </div>)}
        </div>
      </div>
      <Footer_1.default />
    </main>);
}
