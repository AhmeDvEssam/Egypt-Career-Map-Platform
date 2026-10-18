"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";

export interface ShareableJob {
  id: string | number;
  title: string;
  company: string;
  location: string;
  job_type?: string;
  work_type?: string;
  salary?: string;
  url: string;
  source?: string;
}

interface BulkJobShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ShareableJob[];
  searchQuery?: string;
}

export function formatJobsList(jobs: ShareableJob[], searchQuery?: string): string {
  const count = jobs.length;
  const topic = searchQuery ? ` for "${searchQuery}"` : "";
  const header = `🚀 Egypt's Career Map — Curated Job Matches (${count} Opportunities)${topic}\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const body = jobs.map((job, idx) => {
    const loc = job.location ? ` | 📍 ${job.location}` : "";
    const wt = job.work_type ? ` (${job.work_type})` : "";
    const jt = job.job_type ? ` • ${job.job_type}` : "";
    const sal = (job.salary && job.salary !== "Confidential" && job.salary !== "Hidden") ? `\n   💰 ${job.salary}` : "";
    const link = job.url || "Link not available";

    return `${idx + 1}. ${job.title}\n` +
           `   🏢 ${job.company}${loc}${wt}${jt}${sal}\n` +
           `   🔗 Direct Link: ${link}`;
  }).join("\n\n");

  const footer = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `🔍 Explored live on Egypt's Career Map\n` +
                 `🌐 https://egyptcareermap.com`;

  return `${header}\n\n${body}\n\n${footer}`;
}

export function formatLinksOnly(jobs: ShareableJob[]): string {
  return jobs.map((j, i) => `${i + 1}. ${j.title} (${j.company}): ${j.url}`).join("\n");
}

export default function BulkJobShareModal({
  isOpen,
  onClose,
  jobs,
  searchQuery = "",
}: BulkJobShareModalProps) {
  const [copiedType, setCopiedType] = useState<"full" | "links" | null>(null);

  if (!isOpen || typeof document === "undefined") return null;

  const fullText = formatJobsList(jobs, searchQuery);
  const linksOnlyText = formatLinksOnly(jobs);

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedType("full");
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error("Clipboard error:", e);
    }
  };

  const handleCopyLinksOnly = async () => {
    try {
      await navigator.clipboard.writeText(linksOnlyText);
      setCopiedType("links");
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error("Clipboard error:", e);
    }
  };

  const handleShareWhatsApp = () => {
    // WhatsApp URL limit is generous (~4000-8000 chars)
    const encoded = encodeURIComponent(fullText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handleShareTelegram = () => {
    const encoded = encodeURIComponent(fullText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent("https://egyptcareermap.com")}&text=${encoded}`, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Curated Job Opportunities (${jobs.length} jobs) - Egypt's Career Map`);
    const body = encodeURIComponent(fullText);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Egypt's Career Map - ${jobs.length} Jobs`,
          text: fullText,
        });
      } catch (err) {
        // User cancelled share
      }
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `egypt_jobs_${jobs.length}_matches.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">send</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                Share Curated Job List
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/20 text-secondary border border-secondary/30">
                  {jobs.length} Jobs
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                {searchQuery ? `Targeted results for query "${searchQuery}"` : "Formatted numbered summary with direct application links"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Channels Grid */}
        <div className="p-5 border-b border-outline-variant/15 bg-surface-container-lowest shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-outline mb-3">
            Instant 1-Click Share
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              WhatsApp
            </button>

            {/* Telegram */}
            <button
              onClick={handleShareTelegram}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/30 text-[#0088cc] hover:bg-[#0088cc]/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Telegram
            </button>

            {/* Email */}
            <button
              onClick={handleShareEmail}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              Email
            </button>

            {/* Native OS Share (if supported) */}
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-tertiary/10 border border-tertiary/30 text-tertiary hover:bg-tertiary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              More Apps
            </button>
          </div>
        </div>

        {/* Text Preview Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-outline">
            <span>Message Preview</span>
            <span className="text-[11px] font-normal text-on-surface-variant">Ready to paste or send</span>
          </div>

          <div className="relative rounded-xl bg-surface-container-high border border-outline-variant/30 p-4 font-mono text-xs text-on-surface/90 whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto select-all custom-scrollbar">
            {fullText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low flex flex-wrap gap-2.5 justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTxt}
              className="px-3.5 py-2 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download .txt
            </button>
            <button
              onClick={handleCopyLinksOnly}
              className="px-3.5 py-2 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              {copiedType === "links" ? "Copied Links! ✓" : "Copy Links Only"}
            </button>
          </div>

          <button
            onClick={handleCopyFull}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              copiedType === "full"
                ? "bg-secondary text-on-secondary shadow-secondary/30 scale-105"
                : "bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {copiedType === "full" ? "check" : "content_copy"}
            </span>
            {copiedType === "full" ? "Copied Full List! ✓" : "Copy Formatted List"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
