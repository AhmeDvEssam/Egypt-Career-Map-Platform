"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JobsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const Navbar_1 = __importDefault(require("@/app/components/Navbar"));
const Footer_1 = __importDefault(require("@/app/components/Footer"));
const spring = { type: 'spring', stiffness: 300, damping: 25 };
function JobsPage() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [page, setPage] = (0, react_1.useState)(1);
    const [search, setSearch] = (0, react_1.useState)('');
    const [source, setSource] = (0, react_1.useState)('');
    const [sortBy, setSortBy] = (0, react_1.useState)('scrapedAt');
    const limit = 12;
    const fetchJobs = (0, react_1.useCallback)(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder: 'desc' });
        if (search)
            params.set('search', search);
        if (source)
            params.set('source', source);
        try {
            const res = await fetch(`/api/jobs?${params}`);
            const json = await res.json();
            setData(json);
        }
        catch {
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, [page, search, source, sortBy]);
    (0, react_1.useEffect)(() => {
        fetchJobs();
    }, [fetchJobs]);
    return (<main className="min-h-screen bg-zinc-950">
      <Navbar_1.default />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">
              Explore <span className="text-gradient">Jobs</span>
            </h1>
            <p className="text-zinc-400 mt-2">
              Browse thousands of job opportunities across Egypt
            </p>
          </framer_motion_1.motion.div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search jobs, companies, locations..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm"/>
            </div>
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-teal-500/50">
              <option value="">All Sources</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Wuzzuf">Wuzzuf</option>
              <option value="Indeed">Indeed</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-teal-500/50">
              <option value="scrapedAt">Newest</option>
              <option value="salaryMin">Salary (Low)</option>
              <option value="salaryMax">Salary (High)</option>
              <option value="companyName">Company</option>
            </select>
          </div>

          {data && !loading && (<p className="text-sm text-zinc-500 mb-6">
              Showing {data.jobs.length} of {data.total.toLocaleString()} jobs
            </p>)}

          {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="glass-card rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3"/>
                  <div className="h-3 bg-zinc-800 rounded w-1/2 mb-2"/>
                  <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4"/>
                  <div className="h-8 bg-zinc-800 rounded w-full"/>
                </div>))}
            </div>) : data && data.jobs.length > 0 ? (<>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.jobs.map((job, i) => (<framer_motion_1.motion.a key={job.id} href={`/jobs/${job.id}`} className="glass-card-hover rounded-xl p-6 block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.03 }} whileHover={{ scale: 1.02 }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="font-semibold text-zinc-100 truncate">{job.titleRaw}</h3>
                        <p className="text-sm text-zinc-400 mt-0.5">{job.companyName}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${job.source === 'LinkedIn' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    job.source === 'Wuzzuf' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {job.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
                      {job.locationRaw && (<span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          {job.locationRaw}
                        </span>)}
                      {job.salaryMin && (<span className="flex items-center gap-1 text-teal-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          {job.salaryMin.toLocaleString()} {job.currency || ''}
                          {job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ''}
                        </span>)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">
                        {job._count.skills} skills
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(job.scrapedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </framer_motion_1.motion.a>))}
              </div>

              {data.totalPages > 1 && (<div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === data.totalPages)
                    .map((p, i, arr) => (<span key={p} className="flex items-center gap-1">
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="text-zinc-600">...</span>}
                        <button onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg text-sm font-medium ${p === page
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                        : 'text-zinc-500 hover:bg-zinc-900 border border-transparent'}`}>
                          {p}
                        </button>
                      </span>))}
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed">
                    Next
                  </button>
                </div>)}
            </>) : (<div className="text-center py-20">
              <p className="text-zinc-500 text-lg">No jobs found</p>
              <p className="text-zinc-600 text-sm mt-2">Try adjusting your search or filters</p>
            </div>)}
        </div>
      </div>
      <Footer_1.default />
    </main>);
}
