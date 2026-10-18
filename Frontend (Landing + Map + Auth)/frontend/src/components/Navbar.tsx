"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FilterPanel from "@/components/FilterPanel";

const NAV_LINKS = [
  { href: "/", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/market", label: "Market" },
  { href: "/salaries", label: "Salaries" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close profile on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_0_20px_rgba(173,198,255,0.05)] h-20">
      <div className="flex justify-between items-center h-full px-6 lg:px-12 max-w-7xl mx-auto">
        {/* ─── Brand ─── */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
            Egypt&apos;s Career Map
          </span>
        </Link>

        {/* ─── Desktop Nav Links (Centered) ─── */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  text-sm font-medium transition-colors duration-200
                  ${isActive
                    ? "text-primary border-b-2 border-primary pb-1"
                    : "text-on-surface-variant hover:text-primary"
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ─── Right Actions ─── */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Global Filters */}
            <Suspense fallback={<div className="w-24 h-10"></div>}><FilterPanel /></Suspense>
            {/* Ask AI */}
          <Link href="/#ai-chat" className="hidden md:flex items-center gap-2 bg-primary-container/20 border border-primary/30 text-primary px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-container/30 hover:shadow-[0_0_15px_rgba(77,142,255,0.2)] transition-all duration-300">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Ask AI
          </Link>

          {/* Notification */}
          <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
          </button>

          {/* Profile / Account Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high"
              aria-label="Account menu"
            >
              <span className="material-symbols-outlined text-[22px]">account_circle</span>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-xl border border-outline-variant/30 shadow-xl overflow-hidden z-[100]">
                <div className="p-3 border-b border-outline-variant/20">
                  <p className="text-on-surface text-sm font-semibold">Welcome</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">Sign in to unlock full potential</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/login"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">login</span>
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-tertiary">person_add</span>
                    Create Account
                  </Link>
                </div>
                <div className="border-t border-outline-variant/20 py-1">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    My Profile
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-on-surface-variant hover:text-primary transition-colors p-2"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Mobile Menu ─── */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-surface/95 backdrop-blur-xl border-b border-outline-variant/20 shadow-lg">
          <div className="flex flex-col px-6 py-4 gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`
                    px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? "text-primary bg-primary/10"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-2 px-4 py-3 rounded-lg text-sm font-medium text-tertiary bg-tertiary/10 text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
