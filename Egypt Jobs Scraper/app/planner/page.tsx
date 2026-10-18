'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

const spring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const springSlow = { type: 'spring' as const, stiffness: 150, damping: 20 };

interface StatsData {
  totalJobs: number;
  activeCompanies: number;
  avgSalary: number;
  topSkills: { name: string; count: number }[];
  governorates: { name: string; jobs: number }[];
  industries: { name: string; count: number }[];
  sources: { source: string; count: number }[];
}

const industryColors: Record<string, string> = {
  Technology: '#14b8a6',
  Healthcare: '#10b981',
  Finance: '#06b6d4',
  Education: '#8b5cf6',
  Construction: '#f59e0b',
  Retail: '#ef4444',
  Manufacturing: '#ec4899',
};

const trendData = [
  { month: 'Jan', tech: 4200, healthcare: 2100, finance: 1800 },
  { month: 'Feb', tech: 4500, healthcare: 2300, finance: 1900 },
  { month: 'Mar', tech: 4800, healthcare: 2500, finance: 2000 },
  { month: 'Apr', tech: 5100, healthcare: 2700, finance: 2100 },
  { month: 'May', tech: 5400, healthcare: 2900, finance: 2200 },
  { month: 'Jun', tech: 5800, healthcare: 3100, finance: 2350 },
  { month: 'Jul', tech: 6200, healthcare: 3400, finance: 2500 },
];

function KpiCard({ title, value, subtitle, icon, color }: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <motion.div className="glass-card-hover rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
    </motion.div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500" />
      <h2 className="text-lg font-semibold text-zinc-100">{children}</h2>
    </div>
  );
}

export default function PlannerDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const total = stats?.totalJobs ?? 0;
  const companies = stats?.activeCompanies ?? 0;
  const avgSalary = stats?.avgSalary ?? 0;
  const govs = stats?.governorates ?? [];
  const industries = stats?.industries ?? [];
  const maxJobs = Math.max(...(govs.map(g => g.jobs)), 1);
  const totalIndustry = industries.reduce((s, i) => s + i.count, 1);

  const filteredGovs = activeTab === 'all' ? govs : govs.filter(g => g.jobs > maxJobs * 0.3);
  const topIndustry = [...industries].sort((a, b) => b.count - a.count)[0];

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="mesh-gradient fixed inset-0 opacity-30 pointer-events-none" />
      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 pt-24">
        <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <h1 className="text-3xl md:text-4xl font-bold">
            Strategic <span className="text-gradient">Planning</span>
          </h1>
          <p className="text-zinc-400 mt-2">Labor market intelligence dashboard for Egyptian Governorates</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-2/3 mb-3" />
                <div className="h-8 bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard title="Total Open Jobs" value={total.toLocaleString()} subtitle="Across all sources"
                color="bg-teal-500/10 text-teal-400"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>} />
              <KpiCard title="Active Companies" value={companies.toLocaleString()} subtitle="Currently hiring"
                color="bg-emerald-500/10 text-emerald-400"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008z" /></svg>} />
              <KpiCard title="Avg Salary (EGP)" value={avgSalary.toLocaleString()} subtitle="Based on reported salaries"
                color="bg-cyan-500/10 text-cyan-400"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <KpiCard title="Data Sources" value={String(stats?.sources.length ?? 3)} subtitle="LinkedIn, Wuzzuf, Indeed"
                color="bg-purple-500/10 text-purple-400"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <SectionTitle>Governorate Job Density</SectionTitle>
                <div className="flex gap-2 mb-6">
                  {[{ id: 'all', label: 'All Governorates' }, { id: 'high', label: 'Highest Density' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${activeTab === tab.id ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >{tab.label}</button>
                  ))}
                </div>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredGovs.map((g, i) => {
                    const intensity = g.jobs / maxJobs;
                    return (
                      <motion.div key={g.name} className="glass-card-hover rounded-xl p-4 flex items-center justify-between"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.03 }}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: `rgba(20, 184, 166, ${0.1 + intensity * 0.5})`, color: intensity > 0.5 ? '#fff' : '#a1a1aa' }}>
                            {g.jobs >= 1000 ? `${(g.jobs / 1000).toFixed(1)}k` : g.jobs}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-100">{g.name}</div>
                            <div className="text-xs text-zinc-500">{g.jobs.toLocaleString()} open jobs</div>
                          </div>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {Math.round((g.jobs / total) * 100)}% of total
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <SectionTitle>Industry Breakdown</SectionTitle>
                <div className="space-y-4">
                  {industries.slice(0, 8).map((ind, i) => {
                    const share = Math.round((ind.count / totalIndustry) * 100);
                    const color = industryColors[ind.name] || '#6b7280';
                    return (
                      <motion.div key={ind.name} className="space-y-1.5" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.05 }}>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300">{ind.name}</span>
                          <span className="text-zinc-400">{share}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                            initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ ...springSlow, delay: 0.3 + i * 0.05 }} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {topIndustry && (
                  <div className="mt-6 pt-6 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">{topIndustry.name} dominates</span>
                      <span className="text-gradient font-semibold">{Math.round((topIndustry.count / totalIndustry) * 100)}% of jobs</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <SectionTitle>Job Posting Trends by Industry</SectionTitle>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="cTech" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} /><stop offset="95%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cHealth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cFinance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#e4e4e7' }} />
                      <Legend />
                      <Area type="monotone" dataKey="tech" stroke="#14b8a6" fill="url(#cTech)" strokeWidth={2} name="Technology" />
                      <Area type="monotone" dataKey="healthcare" stroke="#10b981" fill="url(#cHealth)" strokeWidth={2} name="Healthcare" />
                      <Area type="monotone" dataKey="finance" stroke="#06b6d4" fill="url(#cFinance)" strokeWidth={2} name="Finance" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <SectionTitle>Key Insights</SectionTitle>
                <div className="space-y-4">
                  {govs.length > 0 && (
                    <div className="p-4 rounded-xl border bg-teal-500/10 border-teal-500/20 text-teal-300 space-y-1">
                      <div className="text-sm font-medium">{govs[0].name} leads</div>
                      <div className="text-xs opacity-80 leading-relaxed">{govs[0].name} has {govs[0].jobs.toLocaleString()} open jobs — the highest of all governorates.</div>
                    </div>
                  )}
                  {topIndustry && (
                    <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 space-y-1">
                      <div className="text-sm font-medium">{topIndustry.name} dominates</div>
                      <div className="text-xs opacity-80 leading-relaxed">{topIndustry.name} represents {Math.round((topIndustry.count / totalIndustry) * 100)}% of all categorized job postings.</div>
                    </div>
                  )}
                  <div className="p-4 rounded-xl border bg-cyan-500/10 border-cyan-500/20 text-cyan-300 space-y-1">
                    <div className="text-sm font-medium">{total.toLocaleString()}+ opportunities</div>
                    <div className="text-xs opacity-80 leading-relaxed">Across {companies.toLocaleString()} companies from {stats?.sources.length ?? 3} major platforms.</div>
                  </div>
                  {stats?.topSkills && stats.topSkills.length > 0 && (
                    <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-300 space-y-1">
                      <div className="text-sm font-medium">Top skill: {stats.topSkills[0].name}</div>
                      <div className="text-xs opacity-80 leading-relaxed">Mentioned in {stats.topSkills[0].count} job postings across the platform.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-12 pb-8 text-center text-xs text-zinc-600">
          Data aggregated from LinkedIn, Wuzzuf, and Indeed. Updated daily.
        </div>
      </div>
      <Footer />
    </main>
  );
}
