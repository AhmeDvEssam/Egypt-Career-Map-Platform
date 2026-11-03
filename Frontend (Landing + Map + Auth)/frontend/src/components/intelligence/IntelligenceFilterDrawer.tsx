"use client";

import React from "react";

export interface FilterState {
  categories: string[];
  skillTypes: string[];
  workTypes: string[];
  careerLevels: string[];
  sources: string[];
  salaryMin: number | null;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (newFilters: FilterState) => void;
  onReset: () => void;
}

const CATEGORIES_LIST = [
  "Software Engineering & IT",
  "Data Science & Analytics",
  "Sales & Marketing",
  "Business & Finance",
  "Engineering & Construction",
  "Customer Service & Support",
  "Human Resources",
  "Project Management",
  "Supply Chain & Logistics",
  "Healthcare & Medical",
];

const SKILL_TYPES_LIST = [
  { id: "Tool / Software", label: "Tool / Software (e.g. Docker, PowerBI, Excel)" },
  { id: "Hard Skill", label: "Hard Technical Skill (e.g. Python, SQL, React)" },
  { id: "Soft Skill", label: "Soft Skill (e.g. Leadership, Problem Solving)" },
  { id: "Language", label: "Language Proficiency (e.g. English, German)" },
  { id: "Certification", label: "Professional Certification (e.g. PMP, AWS)" },
  { id: "Methodology", label: "Methodology (e.g. Agile, Scrum, ETL)" },
];

const WORK_TYPES_LIST = ["On-site", "Remote", "Hybrid"];

const CAREER_LEVELS_LIST = [
  "Entry level",
  "Mid-Level",
  "Experienced",
  "Senior",
  "Manager",
  "Director",
];

const SOURCES_LIST = ["LinkedIn", "Wuzzuf", "Bayt"];

export default function IntelligenceFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const toggleItem = (key: keyof Omit<FilterState, "salaryMin">, value: string) => {
    setLocalFilters((prev) => {
      const current = prev[key] as string[];
      const exists = current.includes(value);
      const next = exists ? current.filter((x) => x !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleApplyClick = () => {
    onApply(localFilters);
    onClose();
  };

  const handleResetClick = () => {
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-[#07111f] border-l border-[#142338] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-[#142338] flex items-center justify-between bg-[#081424]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 text-xl">tune</span>
            <h2 className="text-base font-bold text-white">Market Intelligence Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0d1c30] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Scrollable Filters Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
          {/* Section 1: Job Categories */}
          <div>
            <span className="text-cyan-300 font-bold uppercase tracking-wider block mb-2 text-[11px]">
              Job Industry & Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES_LIST.map((cat) => {
                const isSelected = localFilters.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleItem("categories", cat)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm"
                        : "bg-[#0b1728] border-[#182a44] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Skill Types (From Database Column: skill_type) */}
          <div>
            <span className="text-cyan-300 font-bold uppercase tracking-wider block mb-2 text-[11px]">
              Skill Classification (PostgreSQL skill_type)
            </span>
            <div className="space-y-1.5">
              {SKILL_TYPES_LIST.map((st) => {
                const isSelected = localFilters.skillTypes.includes(st.id);
                return (
                  <label
                    key={st.id}
                    onClick={() => toggleItem("skillTypes", st.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-[#0b1728] border-[#182a44] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                    />
                    <span className="text-xs">{st.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 3: Workplace Models */}
          <div>
            <span className="text-cyan-300 font-bold uppercase tracking-wider block mb-2 text-[11px]">
              Workplace Model
            </span>
            <div className="grid grid-cols-3 gap-2">
              {WORK_TYPES_LIST.map((wt) => {
                const isSelected = localFilters.workTypes.includes(wt);
                return (
                  <button
                    key={wt}
                    onClick={() => toggleItem("workTypes", wt)}
                    className={`py-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm"
                        : "bg-[#0b1728] border-[#182a44] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {wt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Career & Seniority Levels */}
          <div>
            <span className="text-cyan-300 font-bold uppercase tracking-wider block mb-2 text-[11px]">
              Seniority & Career Level
            </span>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_LEVELS_LIST.map((cl) => {
                const isSelected = localFilters.careerLevels.includes(cl);
                return (
                  <button
                    key={cl}
                    onClick={() => toggleItem("careerLevels", cl)}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm"
                        : "bg-[#0b1728] border-[#182a44] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {cl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Sources */}
          <div>
            <span className="text-cyan-300 font-bold uppercase tracking-wider block mb-2 text-[11px]">
              Verified Platform Source
            </span>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES_LIST.map((src) => {
                const isSelected = localFilters.sources.includes(src);
                return (
                  <button
                    key={src}
                    onClick={() => toggleItem("sources", src)}
                    className={`py-1.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm"
                        : "bg-[#0b1728] border-[#182a44] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#142338] bg-[#081424] flex items-center justify-between gap-3">
          <button
            onClick={handleResetClick}
            className="px-4 py-2 rounded-xl bg-[#0d1c30] text-slate-300 hover:text-white border border-[#1b2f48] text-xs font-semibold transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyClick}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all"
          >
            Apply Active Filters
          </button>
        </div>
      </div>
    </div>
  );
}
