"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignupPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const Navbar_1 = __importDefault(require("@/app/components/Navbar"));
const Footer_1 = __importDefault(require("@/app/components/Footer"));
const spring = { type: 'spring', stiffness: 300, damping: 25 };
function SignupPage() {
    const [name, setName] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const handleSubmit = (e) => {
        e.preventDefault();
    };
    return (<main className="min-h-screen bg-zinc-950">
      <Navbar_1.default />
      <div className="mesh-gradient fixed inset-0 opacity-20 pointer-events-none"/>
      <div className="relative z-10 pt-24 pb-16 flex items-center justify-center min-h-screen">
        <framer_motion_1.motion.div className="w-full max-w-md mx-auto px-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Create account</h1>
              <p className="text-zinc-400 text-sm mt-2">Join Egypt Career Map</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm" placeholder="Ahmed Hassan" required/>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm" placeholder="you@example.com" required/>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm" placeholder="At least 8 characters" required minLength={8}/>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium text-sm">
                Create Account
              </button>
            </form>
            <p className="text-center text-sm text-zinc-500 mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-teal-400 hover:underline">Sign in</a>
            </p>
          </div>
        </framer_motion_1.motion.div>
      </div>
      <Footer_1.default />
    </main>);
}
