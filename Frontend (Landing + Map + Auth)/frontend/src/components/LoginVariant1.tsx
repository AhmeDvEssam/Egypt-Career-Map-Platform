"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginVariant1() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDemo: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login failed");

      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida/AEtjO1WN0JZDgoeU8gNA9oKIK86VIh5XjYi3YrWyUKahng_HEalczajfx60KF5ON6lHW3y_6fzRq1sWCDQFk7O-rQLGcehn2YmD-MfA3rbnmYDQIXu-3QCNDh-F7kPMgZzmLVVxB5xU8H-OZkSWk3bGPDvu7QuQNiN4cY_qjU1n5JvV7Mpopm2-X2NvANKlW0Zhq7LLhfPyDcvLu3JbVoQXEIVfgR6hleA6it6D8fHGnMSYcQGhng-XKAW2OCw')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/95" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full min-h-screen flex items-center px-6 md:px-12 max-w-7xl mx-auto py-12">
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-12">
          
          {/* Left Branding Area */}
          <div className="w-full md:w-1/2 flex flex-col gap-4 text-left">
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>language</span>
              <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">Platform Access</span>
            </div>
            <h1 className="font-headline-lg text-4xl md:text-5xl font-extrabold text-secondary tracking-tight">
              EGYPT'S CAREER MAP
            </h1>
            <p className="font-body-lg text-lg text-on-surface-variant max-w-xl leading-relaxed">
              Egypt's AI-powered labor intelligence and precision career engine. Search, match skills deterministically, and automate your job applications.
            </p>

            {/* Quick Demo Button */}
            <div className="mt-4 pt-4 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary hover:bg-secondary/25 hover:border-secondary transition-all font-bold text-sm shadow-lg shadow-secondary/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>⚡ Instant 1-Click Demo Account Access</span>
              </button>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="w-full md:w-[480px]">
            <div className="bg-surface-container-highest/20 backdrop-blur-[24px] border border-outline-variant/30 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />
              
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="font-headline-lg text-2xl font-bold text-on-surface">
                  {isRegister ? "Create Account" : "Sign In"}
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant">
                  {isRegister
                    ? "Set up your verified career profile and unlock precision job matching."
                    : "Welcome back! Sign in to view matching jobs and manage your applications."}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {isRegister && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="name">Full Name</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">person</span>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Mohamed Ahmed"
                        required={isRegister}
                        className="w-full bg-surface-container-lowest/60 border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant" htmlFor="email">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">mail</span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="w-full bg-surface-container-lowest/60 border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="password">Password</label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">lock</span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-surface-container-lowest/60 border border-outline-variant/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary/90 transition-all flex justify-center items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <span>{loading ? "Processing..." : (isRegister ? "Create Account" : "Sign In")}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px bg-outline-variant/30 flex-1" />
                <span className="text-xs text-outline">or</span>
                <div className="h-px bg-outline-variant/30 flex-1" />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-xs text-secondary hover:underline font-semibold"
                >
                  {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register free"}
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
