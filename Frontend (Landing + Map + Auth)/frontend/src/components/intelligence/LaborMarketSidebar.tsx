"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import { FilterState } from "./IntelligenceFilterDrawer";

interface LaborMarketProps {
  selectedLocation: string | null;
  filters?: FilterState;
}

interface MetricsData {
  totalJobs: number;
  activeJobs: number;
  location: string;
  topSkills: { name: string; count: number; share: number }[];
  workTypes: { type: string; count: number; share: number }[];
  careerLevels: { level: string; count: number; share: number }[];
  topCompanies: { company: string; count: number }[];
  salaryBrackets: { bracket: string; count: number }[];
  governorates: { location: string; count: number }[];
}

export default function LaborMarketSidebar({ selectedLocation, filters }: LaborMarketProps) {
  const [activeTab, setActiveTab] = useState<"demand" | "analytics">("demand");
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch live metrics directly from PostgreSQL via /api/intelligence/metrics with active filters
  useEffect(() => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (selectedLocation && selectedLocation !== "Egypt" && selectedLocation !== "All") {
      queryParams.set("location", selectedLocation);
    }
    if (filters?.categories && filters.categories.length > 0) {
      queryParams.set("categories", filters.categories.join(","));
    }
    if (filters?.skillTypes && filters.skillTypes.length > 0) {
      queryParams.set("skillTypes", filters.skillTypes.join(","));
    }
    if (filters?.workTypes && filters.workTypes.length > 0) {
      queryParams.set("workTypes", filters.workTypes.join(","));
    }
    if (filters?.careerLevels && filters.careerLevels.length > 0) {
      queryParams.set("careerLevels", filters.careerLevels.join(","));
    }
    if (filters?.sources && filters.sources.length > 0) {
      queryParams.set("sources", filters.sources.join(","));
    }
    if (filters?.salaryMin) {
      queryParams.set("salaryMin", filters.salaryMin.toString());
    }

    const qStr = queryParams.toString();
    fetch(`/api/intelligence/metrics${qStr ? `?${qStr}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching live metrics:", err);
        setLoading(false);
      });
  }, [selectedLocation, filters]);

  const topSkills = metrics?.topSkills || [];
  const workTypes = metrics?.workTypes || [];
  const salaryBrackets = metrics?.salaryBrackets || [];
  const careerLevels = metrics?.careerLevels || [];

  // Top 4 skills for concentric rings
  const ringColors = ["#00e5ff", "#38bdf8", "#818cf8", "#2dd4bf"];
  const ringRadii = [66, 53, 40, 27];
  const ringCircumferences = [414, 333, 251, 170];

  return (
    <aside className="w-[340px] xl:w-[380px] h-[calc(100vh-64px)] bg-[#070d18] border-l border-[#172338] flex flex-col shrink-0 z-10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#172338] flex items-center justify-between shrink-0 bg-[#070d18]/90 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-base tracking-wide">
              Labor Market Intelligence
            </h2>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <span className="text-[11px] text-slate-400">
            {selectedLocation && selectedLocation !== "Egypt"
              ? `Focus: ${selectedLocation} (${metrics?.activeJobs || 0} active)`
              : `Egypt Nationwide (${metrics?.activeJobs ? metrics.activeJobs.toLocaleString() : "20,808"} active)`}
          </span>
        </div>
        <Link
          href="/market"
          title="Open Full Analytics Dashboard"
          className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3.5 pb-2 shrink-0">
        <div className="flex bg-[#0d1624] p-1 rounded-xl border border-[#172338]">
          <button
            onClick={() => setActiveTab("demand")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "demand"
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Skill Demand
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Analytics & Pay
          </button>
        </div>
      </div>

      {/* Content Area with Clean Scrollbar */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-xs">Aggregating PostgreSQL live data...</span>
          </div>
        ) : activeTab === "demand" ? (
          <>
            {/* Widget 1: Concentric Circular Arcs (Real Top 4 Skills Saturation) */}
            <div className="bg-[#0d1624]/85 border border-[#18263c] rounded-2xl p-4 shadow-lg flex flex-col items-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-300 tracking-wide">
                  Top Skills Saturation
                </span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 font-medium">
                  Live Radar
                </span>
              </div>

              {/* SVG Concentric Arcs */}
              <div className="relative w-44 h-44 flex items-center justify-center my-1">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  {topSkills.slice(0, 4).map((skill, idx) => {
                    const r = ringRadii[idx];
                    const circ = ringCircumferences[idx];
                    const pct = Math.min(100, Math.max(10, skill.share));
                    const strokeDashoffset = circ - (circ * pct) / 100;
                    return (
                      <React.Fragment key={skill.name}>
                        <circle cx="80" cy="80" r={r} fill="none" stroke="#121e33" strokeWidth="6" />
                        <circle
                          cx="80"
                          cy="80"
                          r={r}
                          fill="none"
                          stroke={ringColors[idx]}
                          strokeWidth="6"
                          strokeDasharray={circ}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </React.Fragment>
                    );
                  })}
                </svg>

                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Demand
                  </span>
                  <span className="text-sm font-black text-white">
                    {topSkills[0] ? `${topSkills[0].share}%` : "0%"}
                  </span>
                  <span className="text-[9px] text-cyan-400 truncate max-w-[90px]">
                    {topSkills[0]?.name || "No Filtered Skills"}
                  </span>
                </div>
              </div>

              {/* Legend with Real DB Numbers */}
              <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#18263c]">
                {topSkills.slice(0, 4).map((skill, idx) => (
                  <div key={skill.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ringColors[idx] }}></span>
                      <span className="text-slate-300 truncate">{skill.name}</span>
                    </div>
                    <span className="font-extrabold text-white shrink-0">{skill.share}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Real In-Demand Skills Table */}
            <div className="bg-[#0d1624]/85 border border-[#18263c] rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white tracking-wide">
                  Top Verified Skills (PostgreSQL)
                </span>
                <span className="text-[10px] text-slate-400">
                  {metrics?.activeJobs ? `${metrics.activeJobs.toLocaleString()} jobs` : ""}
                </span>
              </div>

              <div className="space-y-2">
                {topSkills.slice(0, 6).map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#08101c] hover:bg-[#0b1728] border border-[#142338] transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">
                        {skill.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {skill.count.toLocaleString()} postings ({skill.share}%)
                      </span>
                    </div>
                    <div className="w-16 bg-[#132238] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, skill.share * 2)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Real Top Hiring Companies */}
            {metrics?.topCompanies && metrics.topCompanies.length > 0 && (
              <div className="bg-[#0d1624]/85 border border-[#18263c] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Top Hiring Employers
                  </span>
                  <span className="text-[10px] text-slate-400">Active Roles</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {metrics.topCompanies.slice(0, 6).map((comp) => (
                    <div key={comp.company} className="p-2 rounded-lg bg-[#08101c] border border-[#142338]">
                      <span className="text-[11px] font-semibold text-slate-200 block truncate" title={comp.company}>
                        {comp.company}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {comp.count} active roles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* TAB 2: ANALYTICS & PAY */
          <>
            {/* Work Types Real Breakdown */}
            <div className="bg-[#0d1624]/85 border border-[#18263c] rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white tracking-wide">
                  Workplace Models (Real PostgreSQL)
                </span>
                <span className="text-[10px] text-slate-400">Distribution</span>
              </div>

              <div className="space-y-2.5">
                {workTypes.map((wt) => (
                  <div key={wt.type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">{wt.type}</span>
                      <span className="text-cyan-300 font-bold">{wt.count.toLocaleString()} ({wt.share}%)</span>
                    </div>
                    <div className="w-full bg-[#132238] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          wt.type === "On-site" ? "bg-cyan-400" : wt.type === "Remote" ? "bg-emerald-400" : wt.type === "Hybrid" ? "bg-indigo-400" : "bg-slate-500"
                        }`}
                        style={{ width: `${wt.share}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Salary Distribution Real Brackets */}
            <div className="bg-[#0d1624]/85 border border-[#18263c] rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white tracking-wide">
                  Salary Benchmark Distribution
                </span>
                <span className="text-[10px] text-slate-400">EGP / month</span>
              </div>

              <div className="h-28 flex items-end justify-between gap-2 px-1 pt-4">
                {salaryBrackets.map((sb) => {
                  const maxCount = Math.max(...salaryBrackets.map((s) => s.count), 1);
                  const heightPct = Math.max(15, Math.round((sb.count / maxCount) * 100));
                  return (
                    <div key={sb.bracket} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[9px] text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {sb.count}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-cyan-900/60 to-cyan-400/80 border border-cyan-400/50 group-hover:to-cyan-300 transition-all"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">
                        {sb.bracket.replace(" EGP", "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Career Levels Breakdown */}
            <div className="bg-[#0d1624]/85 border border-[#18263c] rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  Career Experience Levels
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                {careerLevels.slice(0, 5).map((cl) => (
                  <div key={cl.level} className="flex justify-between items-center py-1 border-b border-[#142338]/60">
                    <span className="text-slate-300 truncate max-w-[170px]">{cl.level}</span>
                    <span className="text-emerald-400 font-bold">{cl.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
