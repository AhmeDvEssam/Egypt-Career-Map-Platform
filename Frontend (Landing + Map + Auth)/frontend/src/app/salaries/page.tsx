export default function SalariesPage() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden">

{/* TopNavBar (Shared Component) */}

{/* Main Content Canvas */}
<main className="flex-grow pt-[120px] pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-gutter">
{/* Header & Intelligent Search */}
<header className="flex flex-col items-center justify-center mb-8 text-center space-y-6">
<h1 className="font-display-lg text-display-lg text-on-surface">Salary Intelligence</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Real-time compensation benchmarks powered by AI labor market analysis.</p>
<div className="w-full max-w-3xl relative mt-4">
<div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
<span className="material-symbols-outlined text-secondary">manage_search</span>
</div>
<input className="w-full bg-[#0F172A] border border-outline-variant rounded-full py-4 pl-12 pr-6 text-on-surface font-body-lg focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary focus:shadow-[0_0_20px_rgba(93,230,255,0.2)] transition-all glass-panel" placeholder="Compare salaries for any role... (e.g., Software Engineer in Cairo)" type="text"/>
</div>
</header>
{/* Filters Bar */}
<section className="glass-panel rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between border border-surface-container-highest">
<div className="flex flex-wrap gap-4 w-full md:w-auto">
<div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-lg border border-outline-variant/50">
<span className="material-symbols-outlined text-sm text-on-surface-variant">psychology</span>
<select className="bg-transparent border-none text-on-surface font-label-md focus:ring-0 p-0 text-sm cursor-pointer">
<option value="all">Experience Level</option>
<option value="junior">Junior</option>
<option value="mid">Mid</option>
<option value="senior">Senior</option>
<option value="lead">Lead</option>
</select>
</div>
<div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-lg border border-outline-variant/50">
<span className="material-symbols-outlined text-sm text-on-surface-variant">location_on</span>
<select className="bg-transparent border-none text-on-surface font-label-md focus:ring-0 p-0 text-sm cursor-pointer">
<option value="all">Governorate</option>
<option value="cairo">Cairo</option>
<option value="giza">Giza</option>
<option value="alex">Alexandria</option>
</select>
</div>
<div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-lg border border-outline-variant/50">
<span className="material-symbols-outlined text-sm text-on-surface-variant">business_center</span>
<select className="bg-transparent border-none text-on-surface font-label-md focus:ring-0 p-0 text-sm cursor-pointer">
<option value="all">Industry</option>
<option value="tech">Tech</option>
<option value="finance">Finance</option>
<option value="energy">Energy</option>
</select>
</div>
</div>
<button className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-2 rounded-lg hover:bg-primary-container/80 transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-sm">filter_list</span> Apply Filters
            </button>
</section>
{/* Main Dashboard Area (Bento Grid) */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
{/* Salary Distribution Visualization */}
<div className="lg:col-span-8 glass-panel rounded-xl p-8 flex flex-col relative overflow-hidden border border-surface-container-highest neon-glow-primary">
{/* Ambient Glow Background */}
<div className="absolute inset-0 bg-gradient-to-t from-secondary/5 to-transparent pointer-events-none"></div>
<div className="flex justify-between items-center mb-6 relative z-10">
<h2 className="font-headline-md text-headline-md text-on-surface">Salary Distribution</h2>
<span className="font-label-sm text-label-sm text-secondary bg-secondary/10 px-3 py-1 rounded-full uppercase border border-secondary/30">EGP (Monthly)</span>
</div>
{/* Abstract Bell Curve Visualization */}
<div className="relative h-64 w-full mt-8 flex-grow flex items-end">
{/* SVG Chart Background */}
<svg className="w-full h-full absolute inset-0 preserve-3d" preserveAspectRatio="none" viewBox="0 0 1000 300">
<defs>
<linearGradient id="bellGradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#5de6ff" stopOpacity="0.3"></stop>
<stop offset="100%" stopColor="#5de6ff" stopOpacity="0.0"></stop>
</linearGradient>
<filter id="glow">
<feGaussianBlur result="coloredBlur" stdDeviation="4"></feGaussianBlur>
<feMerge>
<feMergeNode in="coloredBlur"></feMergeNode>
<feMergeNode in="SourceGraphic"></feMergeNode>
</feMerge>
</filter>
</defs>
{/* Bell Curve Path */}
<path d="M 0,300 C 200,300 300,50 500,50 C 700,50 800,300 1000,300 L 1000,300 L 0,300 Z" fill="url(#bellGradient)"></path>
<path d="M 0,300 C 200,300 300,50 500,50 C 700,50 800,300 1000,300" fill="none" filter="url(#glow)" stroke="#5de6ff" strokeWidth="3"></path>
</svg>
{/* Data Points overlay */}
<div className="absolute w-full h-full inset-0 flex justify-between items-end pb-8 px-[10%]">
{/* 25th Percentile */}
<div className="flex flex-col items-center group relative z-10 w-1/3">
<div className="h-32 w-[1px] bg-outline-variant border-dashed mb-2 group-hover:bg-secondary transition-colors"></div>
<div className="w-3 h-3 bg-surface-container rounded-full border-2 border-outline-variant group-hover:border-secondary group-hover:shadow-[0_0_10px_#5de6ff] transition-all absolute top-[calc(100%-8rem)] -translate-y-1/2"></div>
<span className="font-label-sm text-label-sm text-on-surface-variant mb-1">25th Pct</span>
<span className="font-headline-md text-headline-md text-on-surface font-semibold">15k</span>
</div>
{/* Median (Center) */}
<div className="flex flex-col items-center group relative z-10 w-1/3">
<div className="h-56 w-[1px] bg-secondary border-dashed mb-2 shadow-[0_0_10px_rgba(93,230,255,0.5)]"></div>
<div className="w-4 h-4 bg-surface-container rounded-full border-2 border-secondary shadow-[0_0_15px_#5de6ff] absolute top-[calc(100%-14rem)] -translate-y-1/2"></div>
<span className="font-label-md text-label-md text-secondary mb-1 neon-text-primary">Median</span>
<span className="font-display-lg text-[32px] leading-tight text-on-surface font-bold">28.5k</span>
</div>
{/* 75th Percentile */}
<div className="flex flex-col items-center group relative z-10 w-1/3">
<div className="h-32 w-[1px] bg-outline-variant border-dashed mb-2 group-hover:bg-secondary transition-colors"></div>
<div className="w-3 h-3 bg-surface-container rounded-full border-2 border-outline-variant group-hover:border-secondary group-hover:shadow-[0_0_10px_#5de6ff] transition-all absolute top-[calc(100%-8rem)] -translate-y-1/2"></div>
<span className="font-label-sm text-label-sm text-on-surface-variant mb-1">75th Pct</span>
<span className="font-headline-md text-headline-md text-on-surface font-semibold">45k</span>
</div>
</div>
</div>
</div>
{/* Insights Sidebar */}
<div className="lg:col-span-4 flex flex-col gap-gutter">
<div className="glass-panel rounded-xl p-6 border-t-2 border-t-secondary relative overflow-hidden flex-grow shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
<div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
<div className="flex items-center gap-3 mb-6">
<span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>temp_preferences_custom</span>
<h3 className="font-headline-md text-headline-md text-on-surface">AI Salary Insights</h3>
</div>
<ul className="space-y-6">
<li className="flex gap-4 items-start">
<div className="mt-1 bg-tertiary/10 p-1.5 rounded-full border border-tertiary/30 neon-glow-tertiary flex-shrink-0">
<span className="material-symbols-outlined text-tertiary text-sm">trending_up</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">
<span className="text-on-surface font-medium">Software Engineers in Cairo</span> earn <span className="text-tertiary font-medium">22% more</span> than the national average.
                            </p>
</li>
<li className="flex gap-4 items-start">
<div className="mt-1 bg-secondary/10 p-1.5 rounded-full border border-secondary/30 flex-shrink-0">
<span className="material-symbols-outlined text-secondary text-sm">show_chart</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">
                                Demand for Senior Python developers has increased salary benchmarks by <span className="text-secondary font-medium">15% this quarter</span>.
                            </p>
</li>
<li className="flex gap-4 items-start">
<div className="mt-1 bg-primary-fixed-dim/10 p-1.5 rounded-full border border-primary-fixed-dim/30 flex-shrink-0">
<span className="material-symbols-outlined text-primary-fixed-dim text-sm">home_work</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">
                                Remote roles in Tech offer a <span className="text-on-surface font-medium">10% premium</span> over local on-site positions.
                            </p>
</li>
</ul>
</div>
</div>
</div>
</main>
{/* Footer (Shared Component) */}


    </div>
  );
}
