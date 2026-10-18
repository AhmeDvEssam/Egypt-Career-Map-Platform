'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

const spring = { type: 'spring' as const, stiffness: 300, damping: 25 };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="mesh-gradient fixed inset-0 opacity-20 pointer-events-none" />
      <div className="relative z-10 pt-24 pb-16 flex items-center justify-center min-h-screen">
        <motion.div
          className="w-full max-w-md mx-auto px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Welcome back</h1>
              <p className="text-zinc-400 text-sm mt-2">Sign in to your account</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 text-sm"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium text-sm"
              >
                Sign In
              </button>
            </form>
            <p className="text-center text-sm text-zinc-500 mt-6">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-teal-400 hover:underline">Sign up</a>
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}
