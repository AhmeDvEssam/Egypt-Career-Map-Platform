"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BulkJobShareModal, { formatJobsList, ShareableJob } from "@/components/BulkJobShareModal";

interface Job {
  id: string | number;
  title: string;
  company: string;
  location: string;
  job_type: string;
  work_type: string;
  experience_needed: string;
  salary: string;
  skills: string;
  description: string;
  source: string;
  url: string;
}

interface JobFeedProps {
  onJobHover?: (location: string | null) => void;
  onJobClick?: (location: string) => void;
}

export default function JobFeed({ 
  onJobHover, 
  onJobClick 
}: JobFeedProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bulk Selection & Share States
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string | number>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [quickCopied, setQuickCopied] = useState(false);

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const hasActiveSearch = Boolean(searchQuery);

  const fetchJobs = (pageNum: number, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", "50");
    params.set("page", pageNum.toString());
    params.set("_t", Date.now().toString());

    fetch(`/api/jobs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        let newJobs: Job[] = [];
        let newTotal = 0;
        
        if (data.jobs && Array.isArray(data.jobs)) {
          newJobs = data.jobs;
          newTotal = data.total || 0;
        } else if (Array.isArray(data)) {
          newJobs = data;
          newTotal = data.length;
        } else {
          console.error("Expected array or object with jobs but got:", data);
        }

        if (isLoadMore) {
          setJobs((prev) => [...prev, ...newJobs]);
        } else {
          setJobs(newJobs);
        }
        
        setTotalJobs(newTotal);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setLoadingMore(false);
      });
  };

  // Reset to page 1, clear selections, and fetch when filters change
  useEffect(() => {
    setSelectedJobIds(new Set());
    setPage(1);
    fetchJobs(1, false);
  }, [searchParams]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, true);
  };

  // Bulk selection handlers
  const handleToggleSelectAll = () => {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const toggleJobSelection = (id: string | number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTargetJobsForShare = (): ShareableJob[] => {
    if (selectedJobIds.size > 0) {
      return jobs.filter((j) => selectedJobIds.has(j.id));
    }
    return jobs;
  };

  const handleQuickCopy = async () => {
    const targetJobs = getTargetJobsForShare();
    if (targetJobs.length === 0) return;

    try {
      const formatted = formatJobsList(targetJobs, searchQuery);
      await navigator.clipboard.writeText(formatted);
      setQuickCopied(true);
      setTimeout(() => setQuickCopied(false), 2200);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  // Helper to extract a generic governorate name from a specific location string
  const extractGovernorate = (fullLocation: string) => {
    const loc = fullLocation.toLowerCase();
    const governorates = [
      "cairo", "giza", "alexandria", "dakahlia", "gharbia", "red sea", "aswan", 
      "luxor", "port said", "suez", "ismailia", "sharqia", "qalyubia", "monufia", 
      "beheira", "faiyum", "beni suef", "minya", "asyut", "sohag", "qena", "kafr", 
      "matruh", "new valley", "north sinai", "south sinai", "damietta", 
      "6th of october", "nasr city", "heliopolis", "maadi", "new cairo", "sheikh zayed"
    ];
    
    for (const gov of governorates) {
      if (loc.includes(gov)) {
        return gov.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    return "Egypt";
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-4 flex justify-center items-center custom-scrollbar">
        <div className="text-secondary animate-pulse flex items-center gap-2 font-medium">
          <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
          Loading jobs from AI Engine...
        </div>
      </div>
    );
  }

  const allSelected = jobs.length > 0 && selectedJobIds.size === jobs.length;
  const targetCount = selectedJobIds.size > 0 ? selectedJobIds.size : jobs.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with counts */}
      <div className="px-6 pt-4 pb-2 shrink-0 flex justify-between items-center border-b border-outline-variant/10">
        <span className="text-on-surface-variant text-sm font-medium">
          Showing <span className="text-secondary font-bold">{jobs.length}</span> of <span className="text-primary font-bold">{totalJobs.toLocaleString()}</span> jobs
        </span>
        {jobs.length < totalJobs && (
          <span className="text-outline text-xs italic">Scroll down to load more</span>
        )}
      </div>

      {/* Bulk Action & Share Bar (Appears when user searches) */}
      {hasActiveSearch && jobs.length > 0 && (
        <div className="px-6 py-2.5 bg-surface-container-high/60 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border border-outline-variant bg-surface-container checked:bg-secondary checked:border-secondary cursor-pointer accent-secondary transition-all"
                checked={allSelected}
                onChange={handleToggleSelectAll}
              />
              <span className="font-semibold text-xs text-on-surface group-hover:text-secondary transition-colors">
                Select All ({jobs.length})
              </span>
            </label>
            {selectedJobIds.size > 0 && (
              <span className="text-[11px] font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full border border-secondary/30">
                {selectedJobIds.size} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Copy Button */}
            <button
              onClick={handleQuickCopy}
              className={`px-3 py-1.5 rounded-lg border font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                quickCopied
                  ? "bg-secondary text-on-secondary border-secondary scale-105 shadow-secondary/30"
                  : "bg-surface-container border-outline-variant/40 text-on-surface hover:border-secondary/50 hover:text-secondary hover:bg-surface-variant"
              }`}
              title={`Copy ${targetCount} formatted job links with numbers`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {quickCopied ? "check" : "content_copy"}
              </span>
              <span>{quickCopied ? "Copied!" : `Copy Links (${targetCount})`}</span>
            </button>

            {/* Share Menu Trigger */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
              title="Share via WhatsApp, Telegram, Email, and more"
            >
              <span className="material-symbols-outlined text-[15px]">share</span>
              <span>Share...</span>
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {jobs.length === 0 && !loading && (
          <div className="text-center text-outline py-10">
            No jobs found matching your criteria.
          </div>
        )}
        
        {jobs.map((job) => {
          const skillsArray = job.skills ? job.skills.split(",").map((s) => s.trim()).slice(0, 4) : [];
          const isLinkedIn = job.source.toLowerCase() === "linkedin";
          const matchedLocation = extractGovernorate(job.location);
          const isSelected = selectedJobIds.has(job.id);

          return (
            <div
              key={job.id}
              onMouseEnter={() => onJobHover?.(matchedLocation)}
              onMouseLeave={() => onJobHover?.(null)}
              onClick={() => onJobClick?.(matchedLocation)}
              className={`block glass-panel p-5 rounded-xl transition-all cursor-pointer group relative overflow-hidden ${
                isSelected 
                  ? "border-secondary/80 bg-secondary/5 shadow-[0_0_20px_rgba(0,229,255,0.12)]" 
                  : "hover:border-secondary/50"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              {/* Checkbox for Multi-Select (When search is active) */}
              {hasActiveSearch && (
                <div 
                  className="absolute top-3.5 right-3.5 z-20 flex items-center justify-center p-1 rounded-md hover:bg-surface-variant/40 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleJobSelection(job.id);
                  }}
                  title={isSelected ? "Deselect job" : "Select job for bulk export"}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-2 border-outline-variant/80 bg-surface-container checked:bg-secondary checked:border-secondary cursor-pointer accent-secondary transition-all"
                  />
                </div>
              )}

              <div className={`flex justify-between items-start mb-4 relative z-10 ${hasActiveSearch ? "pr-8" : ""}`}>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center overflow-hidden shrink-0">
                    <span className={`material-symbols-outlined text-[24px] ${isLinkedIn ? "text-blue-500" : "text-green-500"}`}>
                      work
                    </span>
                  </div>
                  <div>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      <h3 className="font-headline-md text-body-lg font-semibold text-on-surface group-hover:text-secondary transition-colors line-clamp-1">
                        {job.title}
                      </h3>
                    </a>
                    <p className="text-on-surface-variant text-label-md font-label-md mt-1 line-clamp-1">
                      {job.company} • {job.location} {job.work_type && `(${job.work_type})`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full border border-tertiary/30 glow-effect-tertiary">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    <span className="font-label-sm text-label-sm font-bold">MATCH</span>
                  </div>
                  <span className="text-outline text-label-sm font-label-sm">{job.source}</span>
                </div>
              </div>

              <div className="flex justify-between items-end relative z-10">
                <div className="flex gap-2 flex-wrap max-w-[70%]">
                  {skillsArray.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-[11px] border border-outline-variant/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-primary font-label-md font-bold text-[12px] truncate max-w-[100px]" title={job.salary}>
                    {job.salary === "Confidential" ? "Hidden" : job.salary}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Load More Button */}
        {jobs.length > 0 && jobs.length < totalJobs && (
          <div className="flex justify-center pt-6 pb-2">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-full border border-outline-variant/30 bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:border-secondary/50 transition-all shadow-sm font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Loading...
                </>
              ) : (
                <>
                  Load More ({totalJobs - jobs.length} remaining)
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bulk Job Share Modal */}
      <BulkJobShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        jobs={getTargetJobsForShare()}
        searchQuery={searchQuery}
      />
    </div>
  );
}
