"use client";

import React, { useState, useEffect } from "react";
import { FilterState } from "./IntelligenceFilterDrawer";

export interface JobItem {
  id: string | number;
  title: string;
  company: string;
  location: string;
  salaryText?: string;
  workModel?: string;
  careerLevel?: string;
  jobType?: string;
  skills?: string[];
  url?: string;
  source?: string;
  logo_url?: string | null;
  logoType?: "chip" | "f" | "cube" | "terminal" | "default";
}

interface LiveJobsFeedProps {
  selectedLocation: string | null;
  onJobSelect?: (job: JobItem) => void;
  onJobHover?: (job: JobItem | null) => void;
  hoveredJobId?: string | number | null;
  searchQuery?: string;
  filters?: FilterState;
}

export default function LiveJobsFeed({
  selectedLocation,
  onJobSelect,
  onJobHover,
  hoveredJobId,
  searchQuery = "",
  filters,
}: LiveJobsFeedProps) {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterType, setFilterType] = useState<"all" | "tech" | "remote">("all");
  const [loading, setLoading] = useState(true);
  const [expandedJobSkills, setExpandedJobSkills] = useState<Record<string | number, boolean>>({});

  const toggleSkillsExpand = (e: React.MouseEvent, jobId: string | number) => {
    e.stopPropagation();
    setExpandedJobSkills((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  // Fetch real jobs from PostgreSQL via /api/jobs with filters
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const queryParams = new URLSearchParams();
    queryParams.set("limit", "40");

    if (selectedLocation && selectedLocation.toLowerCase() !== "egypt" && selectedLocation.toLowerCase() !== "all") {
      queryParams.set("locations", selectedLocation);
    }
    if (searchQuery) {
      queryParams.set("q", searchQuery);
    }
    if (filterType === "remote") {
      queryParams.set("workTypes", "Remote,Work from home");
    }

    // Apply active advanced filters
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
      queryParams.set("experienceLevels", filters.careerLevels.join(","));
    }
    if (filters?.sources && filters.sources.length > 0) {
      queryParams.set("sources", filters.sources.join(","));
    }
    if (filters?.salaryMin) {
      queryParams.set("salaryMin", filters.salaryMin.toString());
    }

    fetch(`/api/jobs?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load jobs");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        const rawList = Array.isArray(data.jobs)
          ? data.jobs
          : Array.isArray(data)
          ? data
          : [];

        if (data.total !== undefined) {
          setTotalCount(data.total);
        }

        const mapped: JobItem[] = rawList.map((j: any, i: number) => {
          let parsedSkills: string[] = [];
          if (typeof j.skills === "string") {
            parsedSkills = j.skills
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (Array.isArray(j.skills)) {
            parsedSkills = j.skills
              .map((s: any) => (typeof s === "string" ? s : s.skillName || ""))
              .filter(Boolean);
          }

          let sal = j.salary || "Confidential";
          if (sal === "Confidential" || !sal) {
            sal = "Negotiable (EGP)";
          }

          const rawWork = (j.work_type || "").trim();
          const cleanWork = rawWork && rawWork.toLowerCase() !== "not specified" ? rawWork : "On-site";
          const rawCareer = (j.experience_needed || j.career_level || "").trim();
          const cleanCareer = rawCareer && rawCareer.toLowerCase() !== "not specified" && rawCareer.toLowerCase() !== "not applicable" ? rawCareer : "";

          return {
            id: j.id || i,
            title: j.title || "Job Opening",
            company: j.company || "Enterprise Corp",
            location: j.location || selectedLocation || "Egypt",
            salaryText: sal,
            workModel: cleanWork,
            careerLevel: cleanCareer,
            jobType: j.job_type || "",
            skills: parsedSkills,
            url: j.url || "#",
            source: j.source || "LinkedIn",
            logo_url: j.logo_url || null,
            logoType: (["chip", "f", "cube", "terminal"] as const)[i % 4],
          };
        });

        setJobs(mapped);
      })
      .catch((err) => {
        console.error("Error fetching live jobs:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLocation, searchQuery, filterType, filters]);

  const renderCompanyLogo = (logoUrl?: string | null, companyName?: string, logoType?: string) => {
    if (logoUrl) {
      return (
        <div className="w-10 h-10 rounded-xl bg-[#0e192a] border border-cyan-500/30 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={companyName || "Company"} className="w-full h-full object-contain rounded-lg" />
        </div>
      );
    }

    const firstLetter = (companyName || "C").charAt(0).toUpperCase();
    switch (logoType) {
      case "chip":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] shrink-0">
            <span className="material-symbols-outlined text-[20px]">memory</span>
          </div>
        );
      case "f":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-black text-lg shrink-0">
            {firstLetter}
          </div>
        );
      case "cube":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
          </div>
        );
      case "terminal":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <span className="material-symbols-outlined text-[20px]">terminal</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/60 border border-slate-600/40 flex items-center justify-center text-slate-300 shrink-0 font-bold">
            {firstLetter}
          </div>
        );
    }
  };

  const renderSourceBadge = (source?: string) => {
    const srcLower = (source || "").toLowerCase();
    if (srcLower.includes("linkedin")) {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0077b5]/15 border border-[#0077b5]/40 text-[#00a0dc] text-[9px] font-bold tracking-tight">
          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
          LinkedIn
        </span>
      );
    }
    if (srcLower.includes("wuzzuf")) {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
          ⚡ Wuzzuf
        </span>
      );
    }
    if (srcLower.includes("bayt")) {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/40 text-blue-300 text-[9px] font-bold">
          💼 Bayt
        </span>
      );
    }
    return (
      <span className="text-[9px] text-slate-400 font-semibold uppercase">
        {source || "Verified"}
      </span>
    );
  };

  return (
    <div className="w-[340px] xl:w-[380px] h-[calc(100vh-64px)] bg-[#070d18] border-r border-[#172338] flex flex-col shrink-0 z-10 overflow-hidden">
      {/* Header with Title, Count, and Filter Dropdown */}
      <div className="p-4 border-b border-[#172338] flex items-center justify-between shrink-0 bg-[#070d18]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-bold text-base tracking-wide">Live Jobs</h2>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          {totalCount > 0 && (
            <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 font-semibold">
              {totalCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="appearance-none bg-[#0e1726] border border-[#1e2f4a] rounded-lg py-1 pl-3 pr-7 text-xs text-slate-300 font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">Show all</option>
            <option value="tech">Tech & Data</option>
            <option value="remote">Remote Only</option>
          </select>
          <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {/* Scrollable Job Cards Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-xs">Querying PostgreSQL live vacancies...</span>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-12 px-4 text-xs text-slate-400 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-slate-600 text-3xl">
              search_off
            </span>
            <span>No live jobs match this governorate or active filters in database.</span>
          </div>
        )}

        {!loading &&
          jobs.map((job) => {
            const isHovered = hoveredJobId === job.id;
            return (
              <div
                key={job.id}
                onMouseEnter={() => onJobHover?.(job)}
                onMouseLeave={() => onJobHover?.(null)}
                onClick={() => {
                  onJobSelect?.(job);
                  if (job.url && job.url !== "#") {
                    window.open(job.url, "_blank");
                  }
                }}
                className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg ${
                  isHovered
                    ? "bg-[#11233d] border-2 border-cyan-400 shadow-[0_4px_28px_rgba(0,229,255,0.35)] scale-[1.01]"
                    : "bg-[#0d1624]/85 hover:bg-[#111f36] border border-[#18263c] hover:border-cyan-400/80 hover:shadow-[0_4px_24px_rgba(0,229,255,0.2)]"
                }`}
              >
              {/* Top row: Logo + Titles + External Link */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3 overflow-hidden">
                  {renderCompanyLogo(job.logo_url, job.company, job.logoType)}
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-slate-400 tracking-wide block truncate">
                      {job.company}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {job.title}
                    </h3>
                  </div>
                </div>

                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open Official Job Posting"
                  className="text-slate-500 hover:text-cyan-400 p-1 rounded-lg transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                </a>
              </div>

              {/* Sub-details: Location, Work Model & Career Level Chips, and Salary */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-[13px] text-slate-500 shrink-0">
                      location_on
                    </span>
                    <span className="truncate">{job.location}</span>
                  </span>

                  {job.workModel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-[#0a182c] text-cyan-300 border border-cyan-500/25 flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-[11px]">
                        {job.workModel.toLowerCase().includes("remote")
                          ? "home"
                          : job.workModel.toLowerCase().includes("hybrid")
                          ? "sync_alt"
                          : "apartment"}
                      </span>
                      {job.workModel}
                    </span>
                  )}

                  {job.careerLevel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#0f172a] text-slate-300 border border-slate-700/50 shrink-0">
                      {job.careerLevel}
                    </span>
                  )}
                </div>

                {/* Prominent Salary pill */}
                <div className="bg-cyan-950/70 border border-cyan-500/40 rounded-md px-2 py-0.5 flex items-center shrink-0">
                  <span className="text-cyan-300 text-[11px] font-bold tracking-tight">
                    {job.salaryText}
                  </span>
                </div>
              </div>

              {/* Bottom Tag Pills: Clean Technical Skills Only + Official Platform Source Logo */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#172338]/60">
                <div className="flex flex-wrap items-center gap-1.5 overflow-hidden flex-1">
                  {job.skills && job.skills.length > 0 ? (
                    <>
                      {(expandedJobSkills[job.id] ? job.skills : job.skills.slice(0, 3)).map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-[#0c182a] text-cyan-200 text-[10px] font-medium px-2 py-0.5 rounded-md border border-cyan-500/20 truncate max-w-[110px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => toggleSkillsExpand(e, job.id)}
                          title={expandedJobSkills[job.id] ? "Show less" : "Show all skills"}
                          className="text-[9px] font-bold text-slate-400 hover:text-cyan-300 bg-[#0d1624] px-1.5 py-0.5 rounded border border-[#1b2b42] hover:border-cyan-500/40 transition-colors cursor-pointer"
                        >
                          {expandedJobSkills[job.id] ? "Show less" : `+${job.skills.length - 3} more`}
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Standard Qualifications</span>
                  )}
                </div>

                <div className="shrink-0">
                  {renderSourceBadge(job.source)}
                </div>
              </div>
            </div>
            );
          })}
      </div>
    </div>
  );
}
