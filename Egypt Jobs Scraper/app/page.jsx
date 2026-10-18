"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const spring = { type: 'spring', stiffness: 300, damping: 25 };
const springSlow = { type: 'spring', stiffness: 150, damping: 20 };
const stats = [
    { label: 'Jobs Aggregated', value: '24,780+', icon: '📊' },
    { label: 'Companies Tracked', value: '4,320+', icon: '🏢' },
    { label: 'Governorates', value: '27', icon: '🗺️' },
    { label: 'Daily Updates', value: '850+', icon: '🔄' },
];
const audiences = [
    {
        id: 'job-seeker',
        title: 'Job Seekers',
        tagline: 'Find your next opportunity with AI precision',
        description: 'Upload your resume and get an AI-driven Match Score against thousands of aggregated job postings. Our Skill Gap Analyzer tells you exactly what to learn to land your dream role.',
        features: [
            'AI Match Score with every job listing',
            'Skill Gap Analyzer & learning roadmap',
            'Multi-source aggregation (LinkedIn, Wuzzuf, Indeed)',
            'Real-time salary benchmarking',
        ],
        gradient: 'from-teal-500 to-emerald-400',
        icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
      </svg>),
    },
    {
        id: 'recruiter',
        title: 'Recruiters',
        tagline: 'Discover talent before they apply',
        description: 'Access dynamic talent pools sorted by semantic AI compatibility matching. Move beyond static keyword filters and find candidates whose skills truly align with your roles.',
        features: [
            'Semantic AI compatibility matching',
            'Dynamic talent pool exploration',
            'Cross-platform candidate discovery',
            'Real-time market salary data',
        ],
        gradient: 'from-cyan-500 to-teal-400',
        icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"/>
      </svg>),
    },
    {
        id: 'planner',
        title: 'Strategic Planners',
        tagline: 'Data-driven decisions for Egypt\'s future',
        description: 'A macro command center with interactive geographic heatmaps of Egyptian Governorates. Analyze job density, industry growth, and talent shortages to guide infrastructure and education investments.',
        features: [
            'Interactive governorate heatmaps',
            'Industry growth trend analysis',
            'Talent shortage index',
            'Infrastructure planning intelligence',
        ],
        gradient: 'from-emerald-500 to-cyan-400',
        icon: (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
      </svg>),
    },
];
const platforms = [
    { name: 'LinkedIn', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { name: 'Wuzzuf', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { name: 'Indeed', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];
function CountUp({ value, suffix = '' }) {
    const ref = (0, react_1.useRef)(null);
    const isInView = (0, framer_motion_1.useInView)(ref, { once: true });
    const num = parseInt(value.replace(/,/g, ''));
    return (<span ref={ref}>
      {isInView ? (<NumberTicker target={num} suffix={suffix}/>) : ('0')}
    </span>);
}
function NumberTicker({ target, suffix }) {
    const [count, setCount] = (0, react_1.useState)(0);
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    (0, react_1.useEffect)(() => {
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                setCount(target);
                clearInterval(timer);
            }
            else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [target, increment]);
    return <>{count.toLocaleString()}{suffix}</>;
}
function StaggerChildren({ children, className, delay = 0, }) {
    return (<framer_motion_1.motion.div className={className} initial="hidden" animate="visible" variants={{
            hidden: {},
            visible: {
                transition: { staggerChildren: 0.1, delayChildren: delay },
            },
        }}>
      {children}
    </framer_motion_1.motion.div>);
}
function FadeUp({ children, className, delay = 0, }) {
    return (<framer_motion_1.motion.div className={className} variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: { ...spring, delay },
            },
        }}>
      {children}
    </framer_motion_1.motion.div>);
}
function Navbar() {
    const [scrolled, setScrolled] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (<framer_motion_1.motion.header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50' : 'bg-transparent'}`} initial={{ y: -100 }} animate={{ y: 0 }} transition={spring}>
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <framer_motion_1.motion.a href="/" className="flex items-center gap-3 group" whileHover={{ scale: 1.02 }} transition={spring}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-sm">EC</span>
          </div>
          <span className="font-semibold text-zinc-100">
            Egypt <span className="text-gradient">Career Map</span>
          </span>
        </framer_motion_1.motion.a>

        <div className="hidden md:flex items-center gap-8">
          {audiences.map((a) => (<a key={a.id} href={`#${a.id}`} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              {a.title}
            </a>))}
          <a href="/planner" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Planner
          </a>
        </div>

        <div className="flex items-center gap-3">
          <framer_motion_1.motion.a href="/planner" className="text-sm px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors" whileHover={{ scale: 1.02 }} transition={spring}>
            Dashboard
          </framer_motion_1.motion.a>
          <framer_motion_1.motion.button className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
            Get Started
          </framer_motion_1.motion.button>
        </div>
      </nav>
    </framer_motion_1.motion.header>);
}
function HeroSection() {
    const ref = (0, react_1.useRef)(null);
    const { scrollYProgress } = (0, framer_motion_1.useScroll)({
        target: ref,
        offset: ['start start', 'end start'],
    });
    const opacity = (0, framer_motion_1.useTransform)(scrollYProgress, [0, 1], [1, 0]);
    const y = (0, framer_motion_1.useTransform)(scrollYProgress, [0, 1], [0, 100]);
    return (<framer_motion_1.motion.section ref={ref} style={{ opacity, y }} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 mesh-gradient"/>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px]"/>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px]"/>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <StaggerChildren>
          <FadeUp>
            <framer_motion_1.motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 mb-8" whileHover={{ scale: 1.02 }} transition={spring}>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"/>
              <span className="text-sm text-teal-300 font-medium">
                Live — 24,780+ jobs aggregated
              </span>
            </framer_motion_1.motion.div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9]">
              <span className="text-zinc-100">Map Egypt's</span>
              <br />
              <span className="text-gradient">Career Landscape</span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              AI-powered labor market intelligence for Egypt. Aggregating jobs from LinkedIn, Wuzzuf,
              and Indeed into a unified platform with smart matching, skill analysis, and strategic
              planning tools.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <framer_motion_1.motion.button className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-base shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
                Explore Opportunities
              </framer_motion_1.motion.button>
              <framer_motion_1.motion.button className="px-8 py-3.5 rounded-xl border border-zinc-800 text-zinc-300 font-medium text-base hover:bg-zinc-900/50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
                View Planner Dashboard
              </framer_motion_1.motion.button>
            </div>
          </FadeUp>

          <FadeUp delay={0.4}>
            <div className="mt-12 flex items-center justify-center gap-3">
              {platforms.map((p) => (<framer_motion_1.motion.span key={p.name} className={`px-3 py-1 rounded-md border text-xs font-medium ${p.color}`} whileHover={{ scale: 1.05 }} transition={spring}>
                  {p.name}
                </framer_motion_1.motion.span>))}
            </div>
          </FadeUp>
        </StaggerChildren>
      </div>
    </framer_motion_1.motion.section>);
}
function StatsBar() {
    const ref = (0, react_1.useRef)(null);
    const isInView = (0, framer_motion_1.useInView)(ref, { once: true, margin: '-100px' });
    return (<section ref={ref} className="relative -mt-20 z-20 max-w-6xl mx-auto px-6 pb-16">
      <framer_motion_1.motion.div className="glass-card rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8" initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ ...springSlow, delay: 0.2 }}>
        {stats.map((stat, i) => (<framer_motion_1.motion.div key={stat.label} className="text-center" initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ ...spring, delay: 0.3 + i * 0.1 }}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-3xl md:text-4xl font-bold text-gradient mt-1">
              {isInView ? <CountUp value={stat.value}/> : '0'}
            </div>
            <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>
          </framer_motion_1.motion.div>))}
      </framer_motion_1.motion.div>
    </section>);
}
function AudienceCard({ audience, index, }) {
    const ref = (0, react_1.useRef)(null);
    const isInView = (0, framer_motion_1.useInView)(ref, { once: true, margin: '-80px' });
    return (<framer_motion_1.motion.div ref={ref} id={audience.id} className="glass-card-hover rounded-2xl p-8 md:p-10 scroll-mt-24" initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ ...springSlow, delay: 0.1 * index }}>
      <div className="flex items-start gap-5">
        <framer_motion_1.motion.div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${audience.gradient} flex items-center justify-center shrink-0 text-zinc-950`} whileHover={{ scale: 1.05, rotate: -3 }} transition={spring}>
          {audience.icon}
        </framer_motion_1.motion.div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-100">{audience.title}</h2>
          <p className="text-gradient text-lg font-medium mt-1">{audience.tagline}</p>
          <p className="text-zinc-400 mt-4 leading-relaxed">{audience.description}</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audience.features.map((feature, fi) => (<framer_motion_1.motion.div key={fi} className="flex items-center gap-3 text-sm text-zinc-300" initial={{ opacity: 0, x: -10 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ ...spring, delay: 0.3 + fi * 0.05 }}>
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                </div>
                {feature}
              </framer_motion_1.motion.div>))}
          </div>
        </div>
      </div>
    </framer_motion_1.motion.div>);
}
function AudienceSection() {
    return (<section className="relative py-24">
      <div className="absolute inset-0 mesh-gradient opacity-50"/>
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <StaggerChildren>
          <FadeUp>
            <h2 className="text-3xl md:text-5xl font-bold text-center">
              Built for{' '}
              <span className="text-gradient">Everyone</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-zinc-400 text-center mt-4 max-w-xl mx-auto">
              Three pillars, one platform. Whether you're searching, hiring, or planning —
              we've got you covered.
            </p>
          </FadeUp>
        </StaggerChildren>

        <div className="mt-16 space-y-8">
          {audiences.map((audience, i) => (<AudienceCard key={audience.id} audience={audience} index={i}/>))}
        </div>
      </div>
    </section>);
}
function CTASection() {
    const ref = (0, react_1.useRef)(null);
    const isInView = (0, framer_motion_1.useInView)(ref, { once: true });
    return (<section ref={ref} className="relative py-24">
      <div className="absolute inset-0 mesh-gradient"/>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <framer_motion_1.motion.div className="glass-card rounded-3xl p-12 md:p-16" initial={{ opacity: 0, scale: 0.95 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={springSlow}>
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to explore{' '}
            <span className="text-gradient">Egypt's job market?</span>
          </h2>
          <p className="text-zinc-400 mt-4 text-lg max-w-lg mx-auto">
            Join thousands of professionals and organizations leveraging AI-powered labor
            market intelligence.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <framer_motion_1.motion.button className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-base shadow-lg shadow-teal-500/25" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
              Start Exploring
            </framer_motion_1.motion.button>
            <framer_motion_1.motion.button className="px-8 py-3.5 rounded-xl border border-zinc-800 text-zinc-300 font-medium text-base" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
              Book a Demo
            </framer_motion_1.motion.button>
          </div>
        </framer_motion_1.motion.div>
      </div>
    </section>);
}
function Footer() {
    return (<footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                <span className="text-zinc-950 font-bold text-sm">EC</span>
              </div>
              <span className="font-semibold text-zinc-100">
                Egypt Career Map
              </span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              AI-powered labor market intelligence for the Arab Republic of Egypt.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-zinc-300 transition-colors">Job Search</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition-colors">For Recruiters</a></li>
              <li><a href="/planner" className="hover:text-zinc-300 transition-colors">Planner Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">Data</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><span className="hover:text-zinc-300 transition-colors cursor-pointer">LinkedIn</span></li>
              <li><span className="hover:text-zinc-300 transition-colors cursor-pointer">Wuzzuf</span></li>
              <li><span className="hover:text-zinc-300 transition-colors cursor-pointer">Indeed</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-zinc-300 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-zinc-800/50 text-center text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} Egypt Career Map. All rights reserved.
        </div>
      </div>
    </footer>);
}
function Home() {
    return (<main className="bg-zinc-950 min-h-screen overflow-hidden">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <AudienceSection />
      <CTASection />
      <Footer />
    </main>);
}
