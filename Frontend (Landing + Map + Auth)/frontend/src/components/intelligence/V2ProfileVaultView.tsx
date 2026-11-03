"use client";

import React, { useState, useEffect } from "react";
import ApplicationVaultTab from "@/components/profile/ApplicationVaultTab";
import ResumeSectionParserModal from "@/components/profile/ResumeSectionParserModal";

interface SkillItem {
  id: string;
  skillName: string;
  level?: string;
  skill?: { name: string };
  name?: string;
}

interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startYear?: number | null;
  endYear?: number | null;
}

interface MatchedJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  source: string;
  url: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

const COVER_PRESETS = [
  { id: "oceanic", label: "Cyber Oceanic", style: "linear-gradient(135deg, #05162b 0%, #0c2b4d 50%, #0284c7 100%)" },
  { id: "matrix", label: "Obsidian Matrix", style: "linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #312e81 100%)" },
  { id: "emerald", label: "Cyber Emerald", style: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)" },
  { id: "neon", label: "Cosmic Neon", style: "linear-gradient(135deg, #18002e 0%, #3b0764 50%, #701a75 100%)" },
  { id: "solar", label: "Solar Flare", style: "linear-gradient(135deg, #1c1917 0%, #431407 50%, #b45309 100%)" },
];

function formatExperienceDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return dateStr;
  }
}

export default function V2ProfileVaultView() {
  const [activeTab, setActiveTab] = useState<"profile" | "vault" | "matches" | "mirror">("profile");
  const [user, setUser] = useState<any>(null);
  const [, setLoading] = useState(true);
  const [showResumeParser, setShowResumeParser] = useState(false);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Cover & Profile Avatar Customization
  const [activeCover, setActiveCover] = useState(COVER_PRESETS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [showCoverSelector, setShowCoverSelector] = useState(false);

  // Skills Autocomplete & Recommendations
  const [skillInput, setSkillInput] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<{ id: string; name: string }[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Experience Modal & Actions State
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [isNewExp, setIsNewExp] = useState(false);
  const [savingExp, setSavingExp] = useState(false);
  const [expForm, setExpForm] = useState({
    id: "",
    role: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  });

  // Education Modal & Actions State
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [isNewEdu, setIsNewEdu] = useState(false);
  const [savingEdu, setSavingEdu] = useState(false);
  const [eduForm, setEduForm] = useState({
    id: "",
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startYear: 2020,
    endYear: 2024,
  });

  // Real Database Mirror & Batch Auto-Apply State
  const [mirrorJobs, setMirrorJobs] = useState<any[]>([]);
  const [loadingMirror, setLoadingMirror] = useState(false);
  const [selectedWuzzufJobIds, setSelectedWuzzufJobIds] = useState<string[]>([]);
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyToast, setApplyToast] = useState<{ message: string; showMirrorBtn?: boolean } | null>(null);

  // Recommended skills based on role
  const recommendedSkills = [
    "SQL",
    "Python",
    "PowerBI",
    "Tableau",
    "PostgreSQL",
    "Data Modeling",
    "Excel VBA",
    "ETL Pipelines",
    "Machine Learning",
    "Docker",
  ];

  // Fetch real profile from PostgreSQL via /api/profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      if (!res.ok) {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDemo: true }),
        });
        const retryRes = await fetch("/api/profile");
        const retryData = await retryRes.json();
        setUser(retryData.user);
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real applications from PostgreSQL
  const fetchApplications = async () => {
    try {
      setLoadingMirror(true);
      const res = await fetch("/api/profile/applications");
      if (res.ok) {
        const data = await res.json();
        setMirrorJobs(data.applications || []);
      }
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoadingMirror(false);
    }
  };

  // Fetch matched jobs
  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const res = await fetch("/api/profile/matches");
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Error fetching job matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchApplications();
  }, []);

  useEffect(() => {
    if (activeTab === "matches" && matches.length === 0) {
      fetchMatches();
    }
    if (activeTab === "mirror") {
      fetchApplications();
    }
  }, [activeTab]);

  // Search skills in DB on keystroke
  useEffect(() => {
    if (!skillInput.trim() || skillInput.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/skills/search?q=${encodeURIComponent(skillInput.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.skills)) {
            setAutocompleteResults(data.skills.slice(0, 8));
            setShowAutocomplete(true);
          }
        })
        .catch((err) => console.error("Error searching skills:", err));
    }, 250);

    return () => clearTimeout(timer);
  }, [skillInput]);

  // Add a canonical skill
  const handleAddCanonicalSkill = async (skillName: string) => {
    try {
      setIsAddingSkill(true);
      const res = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: skillName.trim(), level: "Intermediate" }),
      });
      if (res.ok) {
        setSkillInput("");
        setShowAutocomplete(false);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error adding skill:", err);
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const res = await fetch(`/api/profile/skills?id=${skillId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error deleting skill:", err);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCustomCoverUrl(base64);
      setShowCoverSelector(false);
      try {
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverImage: base64 }),
        });
      } catch (err) {
        console.error("Failed to save cover image:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUser((prev: any) => ({ ...prev, image: base64 }));
      try {
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
      } catch (err) {
        console.error("Failed to save avatar image:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Experience handlers
  const handleOpenAddExp = () => {
    setExpForm({
      id: "",
      role: "",
      company: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      isCurrent: true,
      description: "",
    });
    setIsNewExp(true);
    setIsExpModalOpen(true);
  };

  const handleOpenEditExp = (exp: ExperienceItem) => {
    setExpForm({
      id: exp.id,
      role: exp.role,
      company: exp.company,
      location: exp.location || "",
      startDate: exp.startDate ? new Date(exp.startDate).toISOString().slice(0, 10) : "",
      endDate: exp.endDate ? new Date(exp.endDate).toISOString().slice(0, 10) : "",
      isCurrent: exp.isCurrent,
      description: exp.description || "",
    });
    setIsNewExp(false);
    setIsExpModalOpen(true);
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.role || !expForm.company || !expForm.startDate) return;
    setSavingExp(true);
    try {
      const endpoint = "/api/profile/experience";
      const method = isNewExp ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expForm),
      });
      if (res.ok) {
        setIsExpModalOpen(false);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error saving experience:", err);
    } finally {
      setSavingExp(false);
    }
  };

  const handleDeleteExp = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience record?")) return;
    try {
      const res = await fetch(`/api/profile/experience?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error deleting experience:", err);
    }
  };

  // Education handlers
  const handleOpenAddEdu = () => {
    setEduForm({
      id: "",
      institution: "",
      degree: "Bachelor's Degree",
      fieldOfStudy: "",
      startYear: 2020,
      endYear: 2024,
    });
    setIsNewEdu(true);
    setIsEduModalOpen(true);
  };

  const handleOpenEditEdu = (edu: EducationItem) => {
    setEduForm({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy || "",
      startYear: edu.startYear || 2020,
      endYear: edu.endYear || 2024,
    });
    setIsNewEdu(false);
    setIsEduModalOpen(true);
  };

  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduForm.institution || !eduForm.degree) return;
    setSavingEdu(true);
    try {
      const endpoint = "/api/profile/education";
      const method = isNewEdu ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eduForm),
      });
      if (res.ok) {
        setIsEduModalOpen(false);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error saving education:", err);
    } finally {
      setSavingEdu(false);
    }
  };

  const handleDeleteEdu = async (id: string) => {
    if (!confirm("Are you sure you want to delete this education record?")) return;
    try {
      const res = await fetch(`/api/profile/education?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchProfile();
      }
    } catch (err) {
      console.error("Error deleting education:", err);
    }
  };

  // Mirror & Auto-Apply Handlers
  const appliedJobIds = new Set(mirrorJobs.map((m) => m.jobId));
  const wuzzufMatches = matches.filter((m) => (m.source || "").toLowerCase().includes("wuzzuf"));

  const handleToggleWuzzufSelect = (jobId: string) => {
    setSelectedWuzzufJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleSelectAllWuzzuf = () => {
    const unappliedWuzzuf = wuzzufMatches.filter((m) => !appliedJobIds.has(m.jobId));
    setSelectedWuzzufJobIds(unappliedWuzzuf.map((m) => m.jobId));
  };

  const handleDeselectAllWuzzuf = () => {
    setSelectedWuzzufJobIds([]);
  };

  const handleApplyWuzzufSingle = async (job: MatchedJob) => {
    try {
      setApplyingJobId(job.jobId);
      const res = await fetch("/api/profile/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId, matchScores: { [job.jobId]: job.matchScore } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch application");
      }
      setApplyToast({
        message: `✓ Successfully applied to "${job.title}" at ${job.company}!`,
        showMirrorBtn: true,
      });
      await fetchApplications();
    } catch (err: any) {
      console.error("Error applying to job:", err);
      alert(err.message || "Failed to auto-apply. Please try again.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleApplyWuzzufBatch = async () => {
    if (selectedWuzzufJobIds.length === 0) return;
    try {
      setIsApplyingBatch(true);
      const matchScoresMap: Record<string, number> = {};
      matches.forEach((m) => {
        if (selectedWuzzufJobIds.includes(m.jobId)) {
          matchScoresMap[m.jobId] = m.matchScore;
        }
      });

      const res = await fetch("/api/profile/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: selectedWuzzufJobIds, matchScores: matchScoresMap }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch batch applications");
      }
      setSelectedWuzzufJobIds([]);
      setApplyToast({
        message: `✓ Successfully dispatched ${data.count || selectedWuzzufJobIds.length} auto-applications!`,
        showMirrorBtn: true,
      });
      await fetchApplications();
    } catch (err: any) {
      console.error("Error batch applying:", err);
      alert(err.message || "Failed to dispatch batch applications.");
    } finally {
      setIsApplyingBatch(false);
    }
  };

  const handleConfirmAllApplications = async () => {
    try {
      setBatchConfirming(true);
      const res = await fetch("/api/profile/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_ALL" }),
      });
      if (res.ok) {
        await fetchApplications();
      }
    } catch (err) {
      console.error("Error confirming all applications:", err);
    } finally {
      setBatchConfirming(false);
    }
  };

  const handleConfirmMirrorApplication = async (appId: string) => {
    try {
      const res = await fetch("/api/profile/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_ONE", applicationId: appId }),
      });
      if (res.ok) {
        setMirrorJobs((prev) =>
          prev.map((app) => (app.id === appId ? { ...app, isConfirmed: true, status: "CONFIRMED_AND_SYNCED" } : app))
        );
      }
    } catch (err) {
      console.error("Error confirming application:", err);
    }
  };

  const handleUpdateMirrorAnswer = async (appId: string, qId: string, newAnswer: string) => {
    setMirrorJobs((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          questions: app.questions.map((q: any) => (q.id === qId ? { ...q, aiAnswer: newAnswer } : q)),
        };
      })
    );

    try {
      await fetch("/api/profile/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_ANSWER", applicationId: appId, qId, newAnswer }),
      });
    } catch (err) {
      console.error("Error syncing answer:", err);
    }
  };

  const handleRegenerateMirrorAnswer = async (appId: string, qId: string) => {
    const targetApp = mirrorJobs.find((a) => a.id === appId);
    const targetQ = targetApp?.questions.find((q: any) => q.id === qId);
    if (!targetQ) return;

    const alternatives = [
      "Experienced software and data engineer with 4+ years delivering production solutions in Egypt across modern frameworks, databases, and automated pipelines.",
      "Proven track record in high-reliability environments in Cairo/Giza, focusing on clean architecture, scalable data models, and active cross-functional delivery.",
      "Certified technical specialist with disciplined engineering methodologies, immediate onboarding readiness, and strong problem-solving capabilities.",
    ];

    const currentIdx = alternatives.indexOf(targetQ.aiAnswer);
    const nextAnswer = alternatives[(currentIdx + 1) % alternatives.length];

    await handleUpdateMirrorAnswer(appId, qId, nextAnswer);
  };

  const p = user?.profile || {};
  const skills: SkillItem[] = p.skills || user?.skills || [];
  const experiences: ExperienceItem[] = p.experiences || user?.experiences || [];
  const educations: EducationItem[] = p.educations || user?.educations || [];

  return (
    <div className="flex-1 h-[calc(100vh-64px)] bg-[#050c17] overflow-y-auto p-6 custom-scrollbar">
      {/* LinkedIn-Style Cover Banner Card */}
      <div className="bg-[#081220]/90 border border-[#142338] rounded-2xl overflow-hidden mb-6 shadow-xl relative">
        {/* Cover Banner */}
        <div
          className="h-44 md:h-52 w-full relative transition-all duration-500"
          style={{
            background: customCoverUrl
              ? `url(${customCoverUrl}) center/cover no-repeat`
              : activeCover.style,
          }}
        >
          {/* Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#00e5ff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Change Cover Button (LinkedIn Style) */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowCoverSelector(!showCoverSelector)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">wallpaper</span>
              <span>Change Cover</span>
            </button>

            {/* Presets & Custom File Upload Dropdown */}
            {showCoverSelector && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0a1526] border border-[#1b2f48] rounded-xl shadow-2xl p-2 z-20 space-y-1">
                {/* Upload Local Image */}
                <label className="w-full flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium text-cyan-300 hover:bg-[#102035] cursor-pointer border border-cyan-500/25 mb-1 bg-cyan-950/40">
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Custom Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </label>

                <div className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">Presets:</div>
                {COVER_PRESETS.map((cov) => (
                  <button
                    key={cov.id}
                    onClick={() => {
                      setCustomCoverUrl(null);
                      setActiveCover(cov);
                      setShowCoverSelector(false);
                    }}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                      !customCoverUrl && activeCover.id === cov.id
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "text-slate-300 hover:bg-[#102035]"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-md border border-white/20 shrink-0" style={{ background: cov.style }} />
                    <span className="truncate">{cov.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Section with Overlapping Avatar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 md:-mt-14 mb-4">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
              {/* Enlarged Avatar with Glowing Border & Camera Upload Button */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 p-1 shadow-[0_0_25px_rgba(0,229,255,0.4)] relative">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl font-black text-cyan-300 overflow-hidden">
                    {user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.image} alt={user?.name || "Profile"} className="w-full h-full object-cover rounded-full" />
                    ) : user?.name ? (
                      user.name.slice(0, 2).toUpperCase()
                    ) : (
                      "HQ"
                    )}
                  </div>
                  {/* Camera Upload Badge */}
                  <label
                    title="Upload Profile Picture"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center cursor-pointer shadow-lg transition-all border-2 border-[#07111f] z-20 group-hover:scale-110"
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  </label>
                </div>
              </div>

              {/* Bio Details */}
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h1 className="text-2xl font-extrabold text-white">
                    {user?.name || "Verified Professional"}
                  </h1>
                  <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    LinkedIn-Synced
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  {p.headline || p.targetRole || "Senior Technology & Data Professional"} &bull; {p.location || "Cairo, Egypt"}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2.5">
                  <span className="bg-[#0c182a] text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-[#182b46]">
                    {user?.email || "candidate@hireq.online"}
                  </span>
                  <span className="bg-[#0c182a] text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-[#182b46]">
                    {p.phoneNumber || "+20 114 230 6520"}
                  </span>
                  <span className="bg-[#0c182a] text-emerald-400 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold">
                    {p.noticePeriod || "Available Immediately"}
                  </span>
                </div>
              </div>
            </div>

            {/* Resume Upload CTA Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowResumeParser(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">upload_file</span>
                <span>Upload & Parse CV (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Tabs: Skills & Experience, Vault, Matched Jobs, and Mirror */}
      <div className="flex bg-[#081220] p-1 rounded-xl border border-[#142338] mb-6 max-w-xl">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "profile"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Skills & Experience
        </button>
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vault"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Application Vault
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "matches"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          AI Matched Jobs
        </button>
        <button
          onClick={() => setActiveTab("mirror")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "mirror"
              ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          🪞 Mirror (Auto-Apply)
          {mirrorJobs.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black">
              {mirrorJobs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Skills & Experience */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Skills Management */}
          <div className="bg-[#07111f]/90 border border-[#142338] rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-lg">verified</span>
                  Verified Skills in Profile ({skills.length})
                </h2>
                <span className="text-xs text-slate-400">
                  Search canonical skills directly from the PostgreSQL database or select from recommendations.
                </span>
              </div>

              {/* Add Skill Input with Autocomplete */}
              <div className="relative">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (skillInput.trim()) handleAddCanonicalSkill(skillInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Search database skill (e.g. Python, SQL)..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    className="w-64 bg-[#0b1728] border border-[#1b2f48] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={isAddingSkill || !skillInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isAddingSkill ? "Adding..." : "+ Add"}
                  </button>
                </form>

                {/* Autocomplete Dropdown from PostgreSQL */}
                {showAutocomplete && autocompleteResults.length > 0 && (
                  <div className="absolute left-0 mt-1.5 w-64 bg-[#0a1728] border border-cyan-500/40 rounded-xl shadow-2xl p-1.5 z-30 max-h-48 overflow-y-auto custom-scrollbar">
                    {autocompleteResults.map((sk) => (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => handleAddCanonicalSkill(sk.name)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors flex items-center justify-between"
                      >
                        <span>{sk.name}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">+ add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Skills */}
            <div className="mb-4 p-3 rounded-xl bg-[#0a1628]/60 border border-[#16273d]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Recommended for your profile &bull; In-Demand in Egypt:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recommendedSkills.map((rec) => {
                  const alreadyAdded = skills.some(
                    (s) => (s.skillName || s.skill?.name || s.name || "").toLowerCase() === rec.toLowerCase()
                  );
                  if (alreadyAdded) return null;
                  return (
                    <button
                      key={rec}
                      onClick={() => handleAddCanonicalSkill(rec)}
                      className="px-2.5 py-1 rounded-lg bg-[#0e1c30] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-[#1e334e] hover:border-cyan-400/50 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>+</span>
                      <span>{rec}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Render Candidate Skills */}
            {skills.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No skills detected yet. Click &quot;Upload & Parse CV (PDF)&quot; above to extract skills automatically.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1728] border border-cyan-500/30 text-xs font-semibold text-slate-200 group hover:border-cyan-400 transition-colors"
                  >
                    <span>{s.skillName || s.skill?.name || s.name || "Skill"}</span>
                    {s.level && (
                      <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/20">
                        {s.level}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteSkill(s.id)}
                      title="Remove skill"
                      className="text-slate-500 hover:text-rose-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work Experience with Edit, Delete & Add Actions */}
          <div className="bg-[#07111f]/90 border border-[#142338] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-lg">work_history</span>
                Parsed Work Experience ({experiences.length})
              </h2>
              <button
                type="button"
                onClick={handleOpenAddExp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Experience</span>
              </button>
            </div>

            {experiences.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No experience records found. Upload your CV or click &quot;Add Experience&quot; to populate your history.
              </div>
            ) : (
              <div className="space-y-4">
                {experiences.map((exp) => (
                  <div key={exp.id} className="p-4 rounded-xl bg-[#0a1728]/70 border border-[#14263d] group hover:border-cyan-500/40 transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{exp.role}</h3>
                        <span className="text-xs text-cyan-400 font-medium">{exp.company}</span>
                        {exp.location && <span className="text-xs text-slate-400"> &bull; {exp.location}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatExperienceDate(exp.startDate)} - {exp.isCurrent ? "Present" : formatExperienceDate(exp.endDate) || "N/A"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditExp(exp)}
                          title="Edit experience"
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-[#14263d] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExp(exp.id)}
                          title="Delete experience"
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-[#14263d] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education with Edit, Delete & Add Actions */}
          <div className="bg-[#07111f]/90 border border-[#142338] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-lg">school</span>
                Parsed Education ({educations.length})
              </h2>
              <button
                type="button"
                onClick={handleOpenAddEdu}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Education</span>
              </button>
            </div>

            {educations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No education records found. Upload your CV or click &quot;Add Education&quot; to extract your academic degrees.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {educations.map((edu) => (
                  <div key={edu.id} className="p-4 rounded-xl bg-[#0a1728]/70 border border-[#14263d] group hover:border-cyan-500/40 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{edu.institution}</h3>
                        <p className="text-xs text-cyan-400 mt-0.5">
                          {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                        </p>
                        {(edu.startYear || edu.endYear) && (
                          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                            {edu.startYear || ""} - {edu.endYear || "Present"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEdu(edu)}
                          title="Edit education"
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-[#14263d] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEdu(edu.id)}
                          title="Delete education"
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-[#14263d] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Application Vault */}
      {activeTab === "vault" && (
        <div className="bg-[#07111f]/90 border border-[#142338] rounded-2xl p-6 shadow-xl">
          <ApplicationVaultTab />
        </div>
      )}

      {/* Tab 3: Matched Jobs with Multi-Select Auto-Apply for Wuzzuf */}
      {activeTab === "matches" && (
        <div className="bg-[#07111f]/90 border border-[#142338] rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-lg">fact_check</span>
                Direct Job Matches
              </h2>
              <span className="text-xs text-slate-400">
                Calculated by intersecting candidate skills with active PostgreSQL vacancies.
              </span>
            </div>
            <button
              onClick={fetchMatches}
              disabled={loadingMatches}
              className="text-xs text-cyan-400 bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:bg-cyan-900 cursor-pointer self-start sm:self-auto"
            >
              {loadingMatches ? "Recalculating..." : "↻ Refresh Matches"}
            </button>
          </div>

          {/* Sticky Batch Auto-Apply Bar for Wuzzuf Jobs */}
          {wuzzufMatches.length > 0 && (
            <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-[#0d1f36] to-[#0a182a] border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-400 font-black">⚡ Wuzzuf Automation:</span>
                  <span>{selectedWuzzufJobIds.length} of {wuzzufMatches.length} selected</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllWuzzuf}
                    className="text-[11px] text-cyan-300 hover:text-white bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 cursor-pointer transition-colors"
                  >
                    Select All Wuzzuf ({wuzzufMatches.length})
                  </button>
                  {selectedWuzzufJobIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAllWuzzuf}
                      className="text-[11px] text-slate-400 hover:text-slate-200 bg-[#070e1a] px-2 py-0.5 rounded border border-[#16273d] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyWuzzufBatch}
                disabled={selectedWuzzufJobIds.length === 0 || isApplyingBatch}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>
                  {isApplyingBatch
                    ? "Applying with AI..."
                    : `Batch Auto-Apply (${selectedWuzzufJobIds.length})`}
                </span>
              </button>
            </div>
          )}

          {loadingMatches ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
              <div>Matching candidate skills against active vacancies...</div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching jobs found yet. Make sure your profile has skills added or upload your CV.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((job) => {
                const isWuzzuf = (job.source || "").toLowerCase().includes("wuzzuf");
                const isAlreadyApplied = appliedJobIds.has(job.jobId);
                const isSelected = selectedWuzzufJobIds.includes(job.jobId);

                return (
                  <div
                    key={job.jobId}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-[#0e213b] border-cyan-400 shadow-[0_0_18px_rgba(0,229,255,0.2)]"
                        : "bg-[#0a1728]/70 border-[#14263d] hover:border-cyan-400/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox for Wuzzuf multi-select batch apply */}
                      {isWuzzuf && !isAlreadyApplied && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleWuzzufSelect(job.jobId)}
                          className="mt-1 w-4 h-4 rounded border-cyan-500/50 bg-[#070e1a] text-cyan-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-white">{job.title}</h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            {job.matchScore}% Match
                          </span>
                          {isWuzzuf ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
                              ⚡ Wuzzuf Verified
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                              {job.source}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-cyan-400 mb-2">
                          {job.company} &bull; <span className="text-slate-400">{job.location}</span>
                          {job.salary && (
                            <>
                              {" "}
                              &bull; <span className="text-slate-300 font-mono">{job.salary}</span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {job.matchedSkills.map((sk) => (
                            <span
                              key={sk}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-medium"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                          {job.missingSkills.slice(0, 3).map((sk) => (
                            <span
                              key={sk}
                              className="text-[10px] px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/20 font-medium"
                            >
                              ✕ {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: BOTH 1) Visit official job site & 2) Auto-Apply via AI Engine */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap justify-end">
                      {/* Button 1: Always available - Visit Job on Official Website */}
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${job.title} directly on ${job.source}`}
                        className="px-3 py-1.5 rounded-xl bg-[#0b1728] hover:bg-[#122238] text-slate-300 hover:text-cyan-300 border border-[#1b2f48] hover:border-cyan-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                      >
                        <span>View on {job.source || "Site"}</span>
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>

                      {/* Button 2: Automation AI Application */}
                      {isAlreadyApplied ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab("mirror")}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all shrink-0"
                        >
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          <span>Auto-Applied (View Mirror)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyWuzzufSingle(job)}
                          disabled={applyingJobId === job.jobId || isApplyingBatch}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer transition-all disabled:opacity-50 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {applyingJobId === job.jobId ? "sync" : "bolt"}
                          </span>
                          <span>
                            {applyingJobId === job.jobId
                              ? "Applying with AI..."
                              : isWuzzuf
                              ? "⚡ Auto-Apply (Wuzzuf AI)"
                              : `⚡ Auto-Apply (${job.source})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Real Database Mirror (Auto-Apply Screening Questions & AI Answers Tracker) */}
      {activeTab === "mirror" && (
        <div className="bg-[#07111f]/90 border border-[#142338] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#142338] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-xl">auto_fix_high</span>
                <h2 className="text-base font-bold text-white">Application Review Mirror</h2>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  AI Auto-Apply Engine Active
                </span>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {mirrorJobs.length} Applications Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                The AI automatically matches employer screening questions against your Application Vault and verified profile. Review, edit answers, and click confirm below.
              </p>
            </div>

            {/* Batch Confirm All Button */}
            {mirrorJobs.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmAllApplications}
                disabled={batchConfirming || mirrorJobs.every((a) => a.isConfirmed)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                <span>
                  {batchConfirming
                    ? "Confirming All..."
                    : mirrorJobs.every((a) => a.isConfirmed)
                    ? "All Applications Confirmed"
                    : "✓ Confirm & Sync All Applications"}
                </span>
              </button>
            )}
          </div>

          {loadingMirror && (
            <div className="text-center py-12 text-slate-500 text-xs">
              <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
              <div>Querying user application records from PostgreSQL...</div>
            </div>
          )}

          {!loadingMirror && mirrorJobs.length === 0 && (
            <div className="text-center py-16 px-4 bg-[#081322]/50 border border-dashed border-[#172b44] rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-cyan-400 mb-2">bolt</span>
              <h3 className="text-sm font-bold text-white mb-1">No Auto-Applications Submitted Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Switch to the &quot;AI Matched Jobs&quot; tab above and click &quot;⚡ Auto-Apply (Wuzzuf AI)&quot; on any matched vacancy to let the AI answer screening questions on your behalf!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("matches")}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold cursor-pointer"
              >
                View AI Matched Jobs
              </button>
            </div>
          )}

          {/* List of Applications with Screening Questions & AI Answers */}
          {!loadingMirror && (
            <div className="space-y-6">
              {mirrorJobs.map((app) => (
                <div key={app.id} className="p-5 rounded-2xl bg-[#091526]/80 border border-cyan-500/30 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#15273e]">
                    <div>
                      <h3 className="text-sm font-bold text-white">{app.title}</h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span className="text-cyan-300 font-semibold">{app.company}</span> &bull; {app.source} &bull; Applied on {app.appliedAt}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full self-start sm:self-auto border ${
                        app.isConfirmed
                          ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                          : "bg-cyan-950 text-cyan-300 border-cyan-500/30"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Screening Questions Breakdown */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Screening Questions & AI Vault Answers:
                    </span>
                    {app.questions.map((qItem: any, idx: number) => (
                      <div key={qItem.id || idx} className="p-3.5 rounded-xl bg-[#070e1a] border border-[#172b44] space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-slate-200 gap-2">
                          <span className="flex items-center gap-1.5 flex-1">
                            <span className="text-cyan-400 font-mono font-bold">Q{idx + 1}:</span>
                            <span>{qItem.q}</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/25">
                              {qItem.source}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRegenerateMirrorAnswer(app.id, qItem.id)}
                              title="Regenerate this answer with AI"
                              className="text-[10px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/70 hover:bg-cyan-900/80 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                              <span>AI Regenerate</span>
                            </button>
                          </div>
                        </div>

                        {/* Editable Answer Textarea */}
                        <textarea
                          rows={2}
                          value={qItem.aiAnswer}
                          onChange={(e) => handleUpdateMirrorAnswer(app.id, qItem.id, e.target.value)}
                          placeholder="Customize screening answer..."
                          className="w-full p-2.5 rounded-lg bg-[#0a1728] border border-cyan-500/25 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400 transition-colors resize-y leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#15273e] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400 text-center sm:text-left">
                      {app.isConfirmed
                        ? "✓ All screening questions verified and synced with employer portal."
                        : "Answers match candidate profile. You can edit answers or regenerate before confirming."}
                    </span>
                    <button
                      onClick={() => handleConfirmMirrorApplication(app.id)}
                      disabled={app.isConfirmed}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        app.isConfirmed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                          : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {app.isConfirmed ? "check_circle" : "sync_saved_locally"}
                      </span>
                      <span>{app.isConfirmed ? "Confirmed & Synced" : "Confirm & Sync"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Experience Add / Edit */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0a1728] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#16273d] pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">work</span>
                <span>{isNewExp ? "Add Work Experience" : "Edit Work Experience"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExp} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  value={expForm.role}
                  onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                  placeholder="e.g. Senior Data Engineer"
                  className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                    placeholder="e.g. Vodafone"
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={expForm.location}
                    onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                    placeholder="e.g. Cairo, Egypt"
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={expForm.startDate}
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={expForm.isCurrent}
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400 disabled:opacity-40"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={expForm.isCurrent}
                  onChange={(e) => setExpForm({ ...expForm, isCurrent: e.target.checked })}
                  className="rounded border-cyan-500/50 bg-[#070e1a] text-cyan-400"
                />
                <span>I currently work here (Present)</span>
              </label>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Responsibilities & Achievements</label>
                <textarea
                  rows={3}
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  placeholder="Outline key technical contributions, architecture, and project impact..."
                  className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16273d]">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#070e1a] hover:bg-[#122238] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExp}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingExp ? "Saving..." : "Save Experience"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Education Add / Edit */}
      {isEduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0a1728] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#16273d] pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">school</span>
                <span>{isNewEdu ? "Add Education" : "Edit Education"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEduModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdu} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Institution / University *</label>
                <input
                  type="text"
                  required
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                  placeholder="e.g. Cairo University"
                  className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Degree *</label>
                  <input
                    type="text"
                    required
                    value={eduForm.degree}
                    onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                    placeholder="e.g. Bachelor's Degree"
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Field of Study</label>
                  <input
                    type="text"
                    value={eduForm.fieldOfStudy}
                    onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Year</label>
                  <input
                    type="number"
                    value={eduForm.startYear}
                    onChange={(e) => setEduForm({ ...eduForm, startYear: Number(e.target.value) })}
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Year</label>
                  <input
                    type="number"
                    value={eduForm.endYear}
                    onChange={(e) => setEduForm({ ...eduForm, endYear: Number(e.target.value) })}
                    className="w-full bg-[#070e1a] border border-[#1b2f48] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16273d]">
                <button
                  type="button"
                  onClick={() => setIsEduModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#070e1a] hover:bg-[#122238] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdu}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingEdu ? "Saving..." : "Save Education"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Real Resume Section Parser Modal */}
      {showResumeParser && (
        <ResumeSectionParserModal
          isOpen={showResumeParser}
          onClose={() => setShowResumeParser(false)}
          onProfileUpdated={fetchProfile}
        />
      )}

      {/* Floating Success Toast for Auto-Apply */}
      {applyToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#08182b] border border-cyan-400 text-white px-4 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,229,255,0.4)] animate-in slide-in-from-bottom-5">
          <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0">check_circle</span>
          <div className="text-xs">
            <span className="font-bold block text-white">{applyToast.message}</span>
            <span className="text-slate-400 text-[11px]">Screening questions & answers saved in Mirror tab.</span>
          </div>
          {applyToast.showMirrorBtn && (
            <button
              type="button"
              onClick={() => {
                setApplyToast(null);
                setActiveTab("mirror");
              }}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-lg transition-all cursor-pointer shrink-0 shadow-sm"
            >
              View in Mirror 🪞
            </button>
          )}
          <button
            type="button"
            onClick={() => setApplyToast(null)}
            className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
