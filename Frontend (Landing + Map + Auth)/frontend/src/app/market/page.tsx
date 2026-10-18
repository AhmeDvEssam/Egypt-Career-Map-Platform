export default function MarketPage() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden">

{/* TopNavBar (Shared Component) */}

{/* Main Content Canvas */}
<main className="flex-grow pt-[120px] px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full pb-section-gap space-y-section-gap">
{/* Page Header */}
<header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div>
<h1 className="font-display-lg text-display-lg text-on-surface mb-2">Egypt Market Trends &amp; Intelligence</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Real-time macro-economic labor data derived from AI analysis across major sectors.</p>
</div>
<div className="flex items-center">
<div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2 border border-outline-variant/30">
<span className="material-symbols-outlined text-secondary text-sm">calendar_month</span>
<span className="font-label-md text-label-md text-on-surface">Last 30 Days</span>
<span className="material-symbols-outlined text-outline text-sm cursor-pointer hover:text-on-surface">arrow_drop_down</span>
</div>
</div>
</header>
{/* Macro Trends Section (Bento Grid) */}
<section className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
{/* Card 1: Total Job Growth (Wide) */}
<div className="md:col-span-8 glass-panel rounded-xl p-6 border-t border-t-tertiary/20 neon-glow-tertiary relative overflow-hidden group">
<div className="flex justify-between items-start mb-6">
<div>
<h2 className="font-headline-md text-headline-md text-on-surface mb-1">Total Job Growth</h2>
<p className="font-label-sm text-label-sm text-on-surface-variant">Active postings volume</p>
</div>
<div className="bg-tertiary/10 border border-tertiary/30 text-tertiary px-2 py-1 rounded font-label-sm flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">trending_up</span>
                        +12.4%
                    </div>
</div>
{/* Abstract Chart Representation */}
<div className="h-48 w-full relative mt-4 flex items-end">
{/* SVG-like pure CSS line graph mock */}
<div className="absolute inset-0 bg-gradient-to-t from-tertiary/5 to-transparent z-0"></div>
<svg className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
<path d="M0,80 Q10,75 20,85 T40,60 T60,50 T80,30 T100,20 L100,100 L0,100 Z" fill="url(#grad)" opacity="0.1"></path>
<path d="M0,80 Q10,75 20,85 T40,60 T60,50 T80,30 T100,20" fill="none" filter="drop-shadow(0 0 8px rgba(78, 222, 163, 0.6))" stroke="#4edea3" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
<defs>
<linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="#4edea3" stopOpacity="0.3"></stop>
<stop offset="100%" stopColor="#4edea3" stopOpacity="0"></stop>
</linearGradient>
</defs>
</svg>
{/* Data points */}
<div className="absolute bottom-[20%] right-[0%] w-3 h-3 bg-tertiary rounded-full shadow-[0_0_10px_#4edea3] z-20"></div>
</div>
</div>
{/* Card 3: Work Arrangement (Square) */}
<div className="md:col-span-4 glass-panel rounded-xl p-6 border-t border-t-secondary/20 flex flex-col">
<h2 className="font-headline-md text-headline-md text-on-surface mb-1">Work Arrangement</h2>
<p className="font-label-sm text-label-sm text-on-surface-variant mb-6">Distribution across sectors</p>
<div className="flex-grow flex flex-col items-center justify-center">
<div className="donut-chart-container mb-6">
<div className="donut-hole shadow-inner">
<span className="font-headline-lg text-headline-lg text-on-surface">45%</span>
<span className="font-label-sm text-label-sm text-secondary">Hybrid</span>
</div>
</div>
<div className="w-full space-y-2">
<div className="flex justify-between items-center font-label-sm">
<div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-secondary"></div><span className="text-on-surface">Hybrid</span></div>
<span className="text-on-surface-variant">45%</span>
</div>
<div className="flex justify-between items-center font-label-sm">
<div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-tertiary"></div><span className="text-on-surface">Remote</span></div>
<span className="text-on-surface-variant">30%</span>
</div>
<div className="flex justify-between items-center font-label-sm">
<div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary"></div><span className="text-on-surface">On-site</span></div>
<span className="text-on-surface-variant">25%</span>
</div>
</div>
</div>
</div>
{/* Card 2: Top Hiring Industries (Wide) */}
<div className="md:col-span-12 glass-panel rounded-xl p-6 border-t border-t-secondary/20 neon-glow-secondary">
<h2 className="font-headline-md text-headline-md text-on-surface mb-1">Top Hiring Industries</h2>
<p className="font-label-sm text-label-sm text-on-surface-variant mb-8">Volume by sector classification</p>
<div className="space-y-2">
<div className="bar-chart-row">
<div className="bar-chart-label">Technology &amp; Software</div>
<div className="bar-chart-track"><div className="bar-chart-fill" style={{width: '85%'}}></div></div>
<div className="bar-chart-value">85k</div>
</div>
<div className="bar-chart-row">
<div className="bar-chart-label">Financial Services</div>
<div className="bar-chart-track"><div className="bar-chart-fill" style={{width: '65%'}}></div></div>
<div className="bar-chart-value">65k</div>
</div>
<div className="bar-chart-row">
<div className="bar-chart-label">Healthcare</div>
<div className="bar-chart-track"><div className="bar-chart-fill" style={{width: '42%'}}></div></div>
<div className="bar-chart-value">42k</div>
</div>
<div className="bar-chart-row">
<div className="bar-chart-label">E-Commerce</div>
<div className="bar-chart-track"><div className="bar-chart-fill" style={{width: '30%'}}></div></div>
<div className="bar-chart-value">30k</div>
</div>
</div>
</div>
</section>
{/* Trending Skills Section */}
<section className="space-y-6">
<div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">Skill Demand Matrix</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-1">Cross-industry analysis of high-value technical competencies.</p>
</div>
<div className="glass-panel rounded-xl overflow-hidden border border-outline-variant/20">
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-high/50 border-b border-outline-variant/20 font-label-md text-label-md text-outline">
<th className="py-4 px-6 font-medium">Skill Cluster</th>
<th className="py-4 px-6 font-medium">Demand Growth</th>
<th className="py-4 px-6 font-medium">Avg. Salary Premium (EGP)</th>
<th className="py-4 px-6 font-medium">30d Trend</th>
<th className="py-4 px-6 font-medium text-right">Action</th>
</tr>
</thead>
<tbody className="font-body-md divide-y divide-outline-variant/10 text-on-surface">
<tr className="hover:bg-surface-container-high/30 transition-colors group">
<td className="py-4 px-6 font-semibold flex items-center gap-3">
<div className="w-8 h-8 rounded bg-secondary/10 text-secondary flex items-center justify-center">
<span className="material-symbols-outlined text-sm">code</span>
</div>
                                    Python
                                </td>
<td className="py-4 px-6 text-tertiary font-label-md flex items-center gap-1">
<span className="material-symbols-outlined text-sm">arrow_upward</span> +24%
                                </td>
<td className="py-4 px-6 text-on-surface-variant font-label-md">+15k</td>
<td className="py-4 px-6">
<div className="sparkline-up"></div>
</td>
<td className="py-4 px-6 text-right">
<button className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-label-md hover:underline">Deep Dive</button>
</td>
</tr>
<tr className="hover:bg-surface-container-high/30 transition-colors group">
<td className="py-4 px-6 font-semibold flex items-center gap-3">
<div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-sm">cloud</span>
</div>
                                    Cloud Architecture
                                </td>
<td className="py-4 px-6 text-tertiary font-label-md flex items-center gap-1">
<span className="material-symbols-outlined text-sm">arrow_upward</span> +18%
                                </td>
<td className="py-4 px-6 text-on-surface-variant font-label-md">+22k</td>
<td className="py-4 px-6">
<div className="sparkline-up"></div>
</td>
<td className="py-4 px-6 text-right">
<button className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-label-md hover:underline">Deep Dive</button>
</td>
</tr>
<tr className="hover:bg-surface-container-high/30 transition-colors group">
<td className="py-4 px-6 font-semibold flex items-center gap-3">
<div className="w-8 h-8 rounded bg-tertiary/10 text-tertiary flex items-center justify-center">
<span className="material-symbols-outlined text-sm">psychology</span>
</div>
                                    AI Engineering
                                </td>
<td className="py-4 px-6 text-tertiary font-label-md flex items-center gap-1">
<span className="material-symbols-outlined text-sm">arrow_upward</span> +42%
                                </td>
<td className="py-4 px-6 text-on-surface-variant font-label-md">+35k</td>
<td className="py-4 px-6">
<div className="sparkline-up"></div>
</td>
<td className="py-4 px-6 text-right">
<button className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-label-md hover:underline">Deep Dive</button>
</td>
</tr>
<tr className="hover:bg-surface-container-high/30 transition-colors group">
<td className="py-4 px-6 font-semibold flex items-center gap-3">
<div className="w-8 h-8 rounded bg-outline/10 text-outline flex items-center justify-center">
<span className="material-symbols-outlined text-sm">security</span>
</div>
                                    Cybersecurity
                                </td>
<td className="py-4 px-6 text-tertiary font-label-md flex items-center gap-1">
<span className="material-symbols-outlined text-sm">arrow_upward</span> +12%
                                </td>
<td className="py-4 px-6 text-on-surface-variant font-label-md">+18k</td>
<td className="py-4 px-6">
<div className="sparkline-up"></div>
</td>
<td className="py-4 px-6 text-right">
<button className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-label-md hover:underline">Deep Dive</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
</main>
{/* Footer (Shared Component) */}


    </div>
  );
}
