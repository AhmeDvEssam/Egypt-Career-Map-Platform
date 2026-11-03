"use client";

import React from "react";
import Link from "next/link";

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateTab: (tabId: string) => void;
  userImage?: string | null;
  userName?: string | null;
  activeTab?: string;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  isFullScreenMap?: boolean;
  onToggleFullScreen?: () => void;
}

export default function IntelligenceTopNav({
  searchQuery,
  onSearchChange,
  onNavigateTab,
  userImage,
  userName,
  activeTab = "map",
  onOpenFilters,
  activeFilterCount = 0,
  isFullScreenMap = false,
  onToggleFullScreen,
}: TopNavProps) {
  return (
    <header className="h-[64px] w-full bg-[#07111f]/95 backdrop-blur-xl border-b border-[#142338] px-5 flex items-center justify-between z-30 shrink-0">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigateTab("map")}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-400 to-sky-300 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_28px_rgba(6,182,212,0.6)] transition-all">
            <span className="text-black font-black text-xl tracking-tighter">Q</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white tracking-wide">Hire Q</span>
            <span className="text-slate-600 font-light">|</span>
            <span className="text-slate-300 text-sm font-medium hidden sm:inline-block tracking-normal">
              Egypt Career Intelligence Platform
            </span>
          </div>
        </button>
      </div>

      {/* Center: Filter + Expand Map + Search Bar */}
      <div className="flex-1 max-w-xl mx-4 flex items-center gap-2">
        {/* Filter Button Moved Beside Search */}
        {onOpenFilters && (
          <button
            onClick={onOpenFilters}
            title="Open Advanced Filters"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm ${
              activeFilterCount > 0
                ? "bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-[#0b1728] border-[#1b2f48] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/60"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Expand / Fullscreen Map Button Moved Beside Search */}
        {onToggleFullScreen && activeTab === "map" && (
          <button
            onClick={onToggleFullScreen}
            title={isFullScreenMap ? "Restore Split Feed View" : "Expand Fullscreen Map"}
            className="w-8 h-8 rounded-full bg-[#0b1728] border border-[#1b2f48] text-slate-300 hover:text-cyan-300 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isFullScreenMap ? "close_fullscreen" : "open_in_full"}
            </span>
          </button>
        )}

        {/* Search Governorate / Role / Skill Input */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search governorate, role, or skill..."
            className="w-full bg-[#0b1728] border border-[#1b2f48] rounded-full py-2 pl-10 pr-4 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/40 shadow-inner transition-all"
          />
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Application Vault Shortcut */}
        <button
          onClick={() => onNavigateTab("profile")}
          title="Candidate Profile & Application Vault"
          className="w-9 h-9 rounded-xl bg-[#0b1728] border border-[#1b2f48] flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[19px]">account_balance_wallet</span>
        </button>

        {/* AI Copilot Shortcut */}
        <button
          onClick={() => onNavigateTab("ai")}
          title="Open AI Career Copilot"
          className="w-9 h-9 rounded-xl bg-[#0b1728] border border-[#1b2f48] flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
        </button>

        {/* Notifications with Badge */}
        <button
          title="8 New Vacancies Match Your Profile"
          className="relative w-9 h-9 rounded-xl bg-[#0b1728] border border-[#1b2f48] flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[19px]">notifications</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]">
            8
          </span>
        </button>

        {/* Profile Avatar (Opens V2 Profile) */}
        <button
          onClick={() => onNavigateTab("profile")}
          className="flex items-center gap-2 pl-1 cursor-pointer group"
          title={`View Profile: ${userName || "Candidate"}`}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 p-[1.5px] shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_18px_rgba(6,182,212,0.7)] transition-all">
              <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-xs font-bold text-cyan-300">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userImage}
                    alt={userName || "Candidate Profile"}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{userName ? userName.slice(0, 2).toUpperCase() : "AE"}</span>
                )}
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#07111f] rounded-full"></span>
          </div>
        </button>
      </div>
    </header>
  );
}
