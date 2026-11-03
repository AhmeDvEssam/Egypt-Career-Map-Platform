"use client";

import React from "react";

interface MiniDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function IntelligenceMiniDock({ activeTab, onTabChange }: MiniDockProps) {
  const dockItems = [
    { id: "map", icon: "map", label: "Career Map & Live Jobs" },
    { id: "analytics", icon: "insights", label: "Labor Market Analytics" },
    { id: "ai", icon: "auto_awesome", label: "AI Career Copilot" },
    { id: "profile", icon: "badge", label: "Candidate Profile & Vault" },
  ];

  return (
    <aside className="w-[60px] h-[calc(100vh-64px)] bg-[#07111f] border-r border-[#142338] flex flex-col justify-between items-center py-4 shrink-0 z-20">
      {/* Top Group */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {dockItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={item.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0c182a]"
              }`}
            >
              <span className="material-symbols-outlined text-[21px]">{item.icon}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Group */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          onClick={() => onTabChange("ai")}
          title="Ask AI Assistant"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-[#0c182a] flex items-center justify-center transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>
      </div>
    </aside>
  );
}
