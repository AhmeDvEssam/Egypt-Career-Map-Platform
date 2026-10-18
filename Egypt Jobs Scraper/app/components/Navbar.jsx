"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Navbar;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const spring = { type: 'spring', stiffness: 300, damping: 25 };
const navLinks = [
    { href: '/jobs', label: 'Explore Jobs' },
    { href: '/skills', label: 'Skills Explorer' },
    { href: '/planner', label: 'Planner' },
];
function Navbar() {
    const [scrolled, setScrolled] = (0, react_1.useState)(false);
    const [mobileOpen, setMobileOpen] = (0, react_1.useState)(false);
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
          {navLinks.map((link) => (<a key={link.href} href={link.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              {link.label}
            </a>))}
        </div>

        <div className="flex items-center gap-3">
          <framer_motion_1.motion.a href="/login" className="text-sm px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors" whileHover={{ scale: 1.02 }} transition={spring}>
            Log In
          </framer_motion_1.motion.a>
          <framer_motion_1.motion.a href="/signup" className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
            Sign Up
          </framer_motion_1.motion.a>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-zinc-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}/>
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (<framer_motion_1.motion.div className="md:hidden bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (<a key={link.href} href={link.href} className="block text-sm text-zinc-400 hover:text-zinc-100" onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>))}
          </div>
        </framer_motion_1.motion.div>)}
    </framer_motion_1.motion.header>);
}
