"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ApplicationVaultTab from "@/components/profile/ApplicationVaultTab";
import ApplicationReviewMirrorModal from "@/components/profile/ApplicationReviewMirrorModal";
import ResumeSectionParserModal from "@/components/profile/ResumeSectionParserModal";


interface SkillItem {
  id: string;
  skillName: string;
  level?: string;
  skill?: {
    id: string;
    name: string;
    domain?: string;
  };
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
  candidateYears: number;
}

interface AutocompleteSkill {
  id: string;
  name: string;
  domain: string | null;
  subCategory: string | null;
  matchedAlias?: string | null;
  jobCount: number;
}

const PRESET_AVATARS = [
  { label: "AI & Data Engineer", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" },
  { label: "Software Architect", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" },
  { label: "Full Stack Dev", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80" },
  { label: "Cloud & DevOps", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80" },
  { label: "Tech Lead", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80" },
  { label: "Product & Data Specialist", url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80" },
];

const PRESET_COVERS = [
  { label: "Obsidian Matrix", style: "linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #312e81 100%)" },
  { label: "Cyber Emerald", style: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)" },
  { label: "Cosmic Neon", style: "linear-gradient(135deg, #18002e 0%, #3b0764 50%, #701a75 100%)" },
  { label: "Midnight Blue", style: "linear-gradient(135deg, #030712 0%, #0c4a6e 50%, #0284c7 100%)" },
  { label: "Solar Flare", style: "linear-gradient(135deg, #1c1917 0%, #431407 50%, #b45309 100%)" },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "matches" | "vault" | "dispatched">("profile");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Multi-Job Selection & Bulk Apply
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [mirrorJobs, setMirrorJobs] = useState<any[]>([]);
  const [showReviewMirror, setShowReviewMirror] = useState(false);
  const [showResumeParser, setShowResumeParser] = useState(false);
  const [dispatchedApps, setDispatchedApps] = useState<any[]>([]);
  const [loadingDispatched, setLoadingDispatched] = useState(false);


  // Domains & Recommended Skills
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [availableSkills, setAvailableSkills] = useState<AutocompleteSkill[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteSkill[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillFeedback, setSkillFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Job Matches
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Editing Profile Data
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    headline: "",
    bio: "",
    location: "",
    category: "",
    targetRole: "",
    careerLevel: "",
    expectedSalary: "",
    noticePeriod: "",
    workModePref: "",
    phoneNumber: "",
  });

  // Photo & Cover Modals
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [customCoverInput, setCustomCoverInput] = useState("");
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  // Experience Modal
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState({
    role: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  });
  const [savingExp, setSavingExp] = useState(false);

  // Education Modal
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [eduForm, setEduForm] = useState({
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startYear: "",
    endYear: "",
  });
  const [savingEdu, setSavingEdu] = useState(false);

  // Close autocomplete on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Current User on mount
  useEffect(() => {
    fetchProfile();
    fetchDomains();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      if (!res.ok) {
        // Auto-login as demo user if session is missing
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDemo: true }),
        });
        const retryRes = await fetch("/api/profile");
        const retryData = await retryRes.json();
        setUser(retryData.user);
        initForm(retryData.user);
        return;
      }
      const data = await res.json();
      setUser(data.user);
      initForm(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initForm = (u: any) => {
    if (!u) return;
    const p = u.profile || {};
    setEditForm({
      name: u.name || "",
      headline: p.headline || "",
      bio: p.bio || "",
      location: p.location || "Cairo, Egypt",
      category: p.category || "Data & Analytics",
      targetRole: p.targetRole || "Data Analyst",
      careerLevel: p.careerLevel || "Mid-Senior Level",
      expectedSalary: p.expectedSalary?.toString() || "25000",
      noticePeriod: p.noticePeriod || "Immediately Available",
      workModePref: p.workModePref || "Remote / Hybrid",
      phoneNumber: p.phoneNumber || "+20 114 230 6520",
    });
    setSelectedDomain(p.category || "Data & Analytics");
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/skills/domains");
      const data = await res.json();
      setDomains(data.domains || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Top Market Demanded Skills for Target Role & Domain
  useEffect(() => {
    const roleParam = editForm.targetRole ? `role=${encodeURIComponent(editForm.targetRole)}&` : "";
    const domainParam = selectedDomain ? `domain=${encodeURIComponent(selectedDomain)}` : "";
    fetch(`/api/skills/search?${roleParam}${domainParam}`)
      .then((r) => r.json())
      .then((d) => setAvailableSkills(d.skills || []))
      .catch(() => {});
  }, [selectedDomain, editForm.targetRole]);

  // Live Autocomplete as user types
  useEffect(() => {
    const trimmed = skillInput.trim();
    if (!trimmed) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/skills/search?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((d) => {
          setAutocompleteResults(d.skills || []);
          setShowAutocomplete(true);
        })
        .catch(() => {});
    }, 180);

    return () => clearTimeout(timer);
  }, [skillInput]);

  // Fetch Matches or Dispatched Applications when tab changes
  useEffect(() => {
    if (activeTab === "matches") {
      setLoadingMatches(true);
      fetch("/api/profile/matches")
        .then((r) => r.json())
        .then((d) => setMatches(d.matches || []))
        .catch(console.error)
        .finally(() => setLoadingMatches(false));
    } else if (activeTab === "dispatched") {
      fetchDispatched();
    }
  }, [activeTab]);

  const fetchDispatched = async () => {
    try {
      setLoadingDispatched(true);
      const res = await fetch("/api/profile/apply");
      const data = await res.json();
      if (data.success) {
        setDispatchedApps(data.applications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDispatched(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const selectAllJobs = () => {
    if (selectedJobIds.length === matches.length && matches.length > 0) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(matches.map((m) => m.jobId));
    }
  };


  // Handle Add Skill
  const handleAddSkill = async (nameToAdd?: string) => {
    const raw = (nameToAdd || skillInput).trim();
    if (!raw) return;

    setAddingSkill(true);
    setSkillFeedback(null);
    setShowAutocomplete(false);

    try {
      const res = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: raw }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSkillFeedback({ type: "error", text: data.error || "Skill verification failed" });
        return;
      }

      setSkillFeedback({
        type: "success",
        text: data.message || "Skill added successfully",
      });
      setSkillInput("");
      fetchProfile();
    } catch (err: any) {
      setSkillFeedback({ type: "error", text: "Connection error while verifying skill" });
    } finally {
      setAddingSkill(false);
    }
  };

  // Handle Delete Skill
  const handleDeleteSkill = async (skillName: string) => {
    try {
      await fetch(`/api/profile/skills?skillName=${encodeURIComponent(skillName)}`, {
        method: "DELETE",
      });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Avatar
  const updateAvatar = async (url: string) => {
    if (!url) return;
    setUpdatingPhoto(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      setShowAvatarModal(false);
      setCustomAvatarInput("");
      fetchProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // Update Cover
  const updateCover = async (coverStyleOrUrl: string) => {
    if (!coverStyleOrUrl) return;
    setUpdatingPhoto(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: coverStyleOrUrl }),
      });
      setShowCoverModal(false);
      setCustomCoverInput("");
      fetchProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // File Upload to DataURL helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === "avatar") updateAvatar(result);
      else updateCover(result);
    };
    reader.readAsDataURL(file);
  };

  // Experience Actions
  const openAddExp = () => {
    setEditingExpId(null);
    setExpForm({
      role: "",
      company: "",
      location: "Cairo, Egypt",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isCurrent: true,
      description: "",
    });
    setShowExpModal(true);
  };

  const openEditExp = (exp: ExperienceItem) => {
    setEditingExpId(exp.id);
    setExpForm({
      role: exp.role,
      company: exp.company,
      location: exp.location || "",
      startDate: exp.startDate ? new Date(exp.startDate).toISOString().split("T")[0] : "",
      endDate: exp.endDate ? new Date(exp.endDate).toISOString().split("T")[0] : "",
      isCurrent: exp.isCurrent,
      description: exp.description || "",
    });
    setShowExpModal(true);
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExp(true);
    try {
      const method = editingExpId ? "PUT" : "POST";
      const payload = editingExpId ? { id: editingExpId, ...expForm } : expForm;
      const res = await fetch("/api/profile/experience", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowExpModal(false);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingExp(false);
    }
  };

  const handleDeleteExp = async (id: string) => {
    if (!confirm("Are you sure you want to remove this experience record?")) return;
    try {
      await fetch(`/api/profile/experience?id=${id}`, { method: "DELETE" });
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Education Actions
  const openAddEdu = () => {
    setEditingEduId(null);
    setEduForm({
      institution: "",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      startYear: "2018",
      endYear: "2022",
    });
    setShowEduModal(true);
  };

  const openEditEdu = (edu: EducationItem) => {
    setEditingEduId(edu.id);
    setEduForm({
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy || "",
      startYear: edu.startYear ? edu.startYear.toString() : "",
      endYear: edu.endYear ? edu.endYear.toString() : "",
    });
    setShowEduModal(true);
  };

  const handleSaveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdu(true);
    try {
      const method = editingEduId ? "PUT" : "POST";
      const payload = editingEduId ? { id: editingEduId, ...eduForm } : eduForm;
      const res = await fetch("/api/profile/education", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowEduModal(false);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdu(false);
    }
  };

  const handleDeleteEdu = async (id: string) => {
    if (!confirm("Are you sure you want to remove this education record?")) return;
    try {
      await fetch(`/api/profile/education?id=${id}`, { method: "DELETE" });
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-secondary animate-pulse text-lg flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
          Loading your verified career profile...
        </div>
      </div>
    );
  }

  const p = user?.profile || {};
  const currentSkills: SkillItem[] = p.skills || [];
  const currentExperiences: ExperienceItem[] = p.experiences || [];
  const currentEducations: EducationItem[] = p.educations || [];

  const coverStyle = p.coverImage
    ? p.coverImage.startsWith("linear-gradient")
      ? { background: p.coverImage }
      : { backgroundImage: `url(${p.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #312e81 100%)" };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased overflow-x-hidden pt-24 pb-16">
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 flex flex-col gap-6">

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-2 md:gap-3 border-b border-outline-variant/30 pb-3 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "profile"
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "bg-surface-container hover:bg-surface-variant text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Profile & Skills</span>
          </button>

          <button
            onClick={() => setActiveTab("matches")}
            className={`px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === "matches"
                ? "bg-secondary text-on-secondary shadow-lg shadow-secondary/20"
                : "bg-surface-container hover:bg-surface-variant text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>🎯 Matched Jobs</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-tertiary text-on-tertiary">
              {matches.length > 0 ? `${matches.length} Jobs` : "Live Match"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === "vault"
                ? "bg-gradient-to-r from-secondary to-emerald-500 text-on-secondary shadow-lg shadow-secondary/20"
                : "bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-outline-variant/30"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            <span>Application Vault (ATS Survey)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-surface-container-highest text-secondary border border-secondary/30">
              16 Questions
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("dispatched");
              fetchDispatched();
            }}
            className={`px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "dispatched"
                ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                : "bg-surface-container hover:bg-surface-variant text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
            <span>Dispatched Applications</span>
            {dispatchedApps.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-white">
                {dispatchedApps.length}
              </span>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PROFILE & SKILLS VIEW */}
        {/* ======================================================== */}
        {activeTab === "profile" && (
          <div className="flex flex-col gap-6">
            
            {/* Cover & Header Card (LinkedIn Style) */}
            <section className="glass-panel rounded-2xl overflow-hidden border border-outline-variant/30 shadow-2xl relative">
              
              {/* Cover Banner with Customization Trigger */}
              <div 
                className="h-48 w-full relative transition-all duration-300"
                style={coverStyle}
              >
                <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
                <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowResumeParser(true)}
                    className="bg-secondary/20 hover:bg-secondary/30 text-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold border border-secondary/40 flex items-center gap-1.5 transition-all shadow-md backdrop-blur-md"
                    title="Import CV / Resume Text"
                  >
                    <span className="material-symbols-outlined text-[15px]">document_scanner</span>
                    <span>Import Resume</span>
                  </button>
                  <button
                    onClick={() => setShowCoverModal(true)}
                    className="bg-black/60 hover:bg-black/80 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all shadow-md"
                    title="Change Cover Banner"
                  >
                    <span className="material-symbols-outlined text-[15px]">palette</span>
                    <span>Change Cover</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-background/85 hover:bg-background text-on-surface px-4 py-1.5 rounded-xl text-xs font-bold border border-outline-variant/50 flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </button>
                </div>
              </div>

              {/* Avatar & Main Info */}
              <div className="px-6 md:px-8 pb-8 relative">
                
                {/* Avatar with Camera Trigger */}
                <div className="w-28 h-28 rounded-2xl border-4 border-[#0B1326] bg-surface-container overflow-hidden absolute -top-14 left-6 md:left-8 shadow-2xl z-10 group cursor-pointer">
                  {user?.image ? (
                    <img 
                      src={user.image} 
                      alt={user?.name || "Candidate Avatar"} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-highest text-primary">
                      <span className="material-symbols-outlined text-6xl">person</span>
                    </div>
                  )}

                  {/* Hover Camera Overlay */}
                  <div 
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold"
                  >
                    <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                    <span>Change</span>
                  </div>
                </div>

                <div className="pt-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-on-surface flex items-center gap-2">
                      {user?.name || "Mohamed Ahmed"}
                      <span className="material-symbols-outlined text-secondary text-[22px]" title="Verified Profile">
                        verified
                      </span>
                    </h1>
                    <p className="text-secondary font-semibold text-base mt-1">
                      {p.headline || "Senior Data Scientist & AI Specialist"}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-outline text-xs">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {p.location || "Cairo, Egypt"}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">category</span>
                        {p.category || "Data Science & Analytics"}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">target</span>
                        Target: <span className="font-bold text-on-surface">{p.targetRole || "Data Scientist"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        {p.expectedSalary ? `${Number(p.expectedSalary).toLocaleString()} EGP` : "45,000 EGP"} Expected
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setActiveTab("matches")}
                      className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      <span>View Matched Jobs</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Edit Profile Form (If Open) */}
            {isEditing && (
              <section className="glass-panel p-6 rounded-2xl border border-secondary/40 shadow-xl animate-in fade-in duration-200">
                <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                  Edit Profile & Preferences
                </h3>
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Target Job Title (Target Role)</label>
                    <input
                      type="text"
                      value={editForm.targetRole}
                      onChange={(e) => setEditForm({ ...editForm, targetRole: e.target.value })}
                      placeholder="e.g. Data Scientist, Full Stack Developer..."
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Professional Headline</label>
                    <input
                      type="text"
                      value={editForm.headline}
                      onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Location / Governorate</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Domain / Track (Category)</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => {
                        setEditForm({ ...editForm, category: e.target.value });
                        setSelectedDomain(e.target.value);
                      }}
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                    >
                      {domains.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Expected Salary (EGP)</label>
                    <input
                      type="number"
                      value={editForm.expectedSalary}
                      onChange={(e) => setEditForm({ ...editForm, expectedSalary: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Summary / Bio</label>
                    <textarea
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/50 rounded-xl p-3 text-sm text-on-surface outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-lg"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: About, Experience & Education */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* About Box */}
                <section className="glass-panel p-6 rounded-2xl border border-outline-variant/30">
                  <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                    About Me
                  </h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {p.bio || "No summary provided yet. Click 'Edit Profile' to add your professional bio."}
                  </p>
                </section>

                {/* Experience Box (Interactive Management) */}
                <section className="glass-panel p-6 rounded-2xl border border-outline-variant/30">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[20px]">work_history</span>
                      Work Experience & Responsibilities ({currentExperiences.length})
                    </h3>
                    <button
                      onClick={openAddExp}
                      className="px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-secondary text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Add Experience
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentExperiences.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-outline-variant/40 text-center text-outline text-xs">
                        No experience records added yet. Click "+ Add Experience" above to list your career history.
                      </div>
                    ) : (
                      currentExperiences.map((exp) => (
                        <div key={exp.id} className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20 flex justify-between gap-4 group hover:border-outline-variant/50 transition-all">
                          <div className="flex gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center text-secondary shrink-0">
                              <span className="material-symbols-outlined text-[20px]">domain</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-on-surface">{exp.role}</h4>
                                {exp.isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/20 text-secondary">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-secondary font-medium mt-0.5">
                                {exp.company} {exp.location ? `• ${exp.location}` : ""}
                              </p>
                              <p className="text-[11px] text-outline mt-0.5">
                                {new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - {" "}
                                {exp.isCurrent ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                              </p>
                              {exp.description && (
                                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed whitespace-pre-line bg-surface-container/30 p-2.5 rounded-lg border border-outline-variant/15">
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Edit / Delete Buttons */}
                          <div className="flex items-start gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditExp(exp)}
                              className="p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors"
                              title="Edit Experience"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteExp(exp.id)}
                              className="p-1.5 rounded-lg hover:bg-error/20 text-outline hover:text-error transition-colors"
                              title="Delete Experience"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Education Box (Interactive Management) */}
                <section className="glass-panel p-6 rounded-2xl border border-outline-variant/30">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">school</span>
                      Education & Degrees ({currentEducations.length})
                    </h3>
                    <button
                      onClick={openAddEdu}
                      className="px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Add Education
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentEducations.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-outline-variant/40 text-center text-outline text-xs">
                        No education records added yet. Click "+ Add Education" to add your academic degrees.
                      </div>
                    ) : (
                      currentEducations.map((edu) => (
                        <div key={edu.id} className="p-4 rounded-xl bg-surface-container/50 border border-outline-variant/20 flex justify-between gap-4 group hover:border-outline-variant/50 transition-all">
                          <div className="flex gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center text-primary shrink-0">
                              <span className="material-symbols-outlined text-[20px]">account_balance</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-on-surface">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}</h4>
                              <p className="text-xs text-secondary font-medium mt-0.5">{edu.institution}</p>
                              {(edu.startYear || edu.endYear) && (
                                <p className="text-[11px] text-outline mt-0.5">
                                  {edu.startYear ? edu.startYear : ""} {edu.endYear ? `- ${edu.endYear}` : ""}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditEdu(edu)}
                              className="p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors"
                              title="Edit Education"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteEdu(edu.id)}
                              className="p-1.5 rounded-lg hover:bg-error/20 text-outline hover:text-error transition-colors"
                              title="Delete Education"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

              </div>

              {/* Right Column: Database Skills Manager & Smart Autocomplete */}
              <div className="flex flex-col gap-6">
                <section className="glass-panel p-6 rounded-2xl border border-outline-variant/30 shadow-lg relative">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-[20px]">psychology</span>
                      Verified Skills ({currentSkills.length})
                    </h3>
                  </div>
                  <p className="text-xs text-outline mb-4">
                    Skills selected here are deterministically matched with real job criteria for 100% precision.
                  </p>

                  {/* Active Skills Badges */}
                  <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
                    {currentSkills.length === 0 ? (
                      <span className="text-xs text-outline italic">No skills added yet.</span>
                    ) : (
                      currentSkills.map((s) => (
                        <span
                          key={s.id}
                          className="px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/40 text-on-surface text-xs font-semibold flex items-center gap-1.5 group hover:border-error/50 transition-colors"
                        >
                          <span>{s.skillName}</span>
                          <button
                            onClick={() => handleDeleteSkill(s.skillName)}
                            className="text-outline group-hover:text-error hover:scale-110 transition-all"
                            title="Remove Skill"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Skill Feedback Alert */}
                  {skillFeedback && (
                    <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      skillFeedback.type === "success"
                        ? "bg-secondary/15 border border-secondary/30 text-secondary"
                        : "bg-error/15 border border-error/30 text-error"
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {skillFeedback.type === "success" ? "check_circle" : "warning"}
                      </span>
                      <span>{skillFeedback.text}</span>
                    </div>
                  )}

                  {/* Skill Search & Smart Autocomplete */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-outline-variant/20 relative" ref={autocompleteRef}>
                    <label className="text-xs font-bold text-on-surface">Add New Skill</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onFocus={() => {
                          if (autocompleteResults.length > 0) setShowAutocomplete(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Type skill name (e.g. Data Modeling, Python, Dash)..."
                        className="flex-1 bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                      />
                      <button
                        onClick={() => handleAddSkill()}
                        disabled={addingSkill}
                        className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        {addingSkill ? "Checking..." : "Add"}
                      </button>
                    </div>

                    {/* Instant Autocomplete & "Did you mean...?" Dropdown */}
                    {showAutocomplete && autocompleteResults.length > 0 && (
                      <div className="absolute top-[72px] left-0 right-0 z-30 bg-[#0E1626] border border-secondary/40 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
                        <div className="p-2 bg-surface-container-high/60 border-b border-outline-variant/20 text-[10px] font-bold text-secondary uppercase tracking-wider flex justify-between items-center">
                          <span>Verified Database Matches</span>
                          <span className="text-outline text-[9px]">Click to add</span>
                        </div>
                        {autocompleteResults.map((sk) => {
                          const isAlreadyAdded = currentSkills.some(
                            (cs) => cs.skillName.toLowerCase() === sk.name.toLowerCase()
                          );
                          return (
                            <div
                              key={sk.id}
                              onClick={() => {
                                if (!isAlreadyAdded) handleAddSkill(sk.name);
                              }}
                              className={`p-2.5 px-3 flex items-center justify-between border-b border-outline-variant/10 text-xs transition-colors cursor-pointer ${
                                isAlreadyAdded
                                  ? "opacity-50 bg-surface-container/20 cursor-not-allowed"
                                  : "hover:bg-secondary/15 hover:text-secondary"
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-on-surface flex items-center gap-1.5">
                                  {sk.name}
                                  {sk.matchedAlias && (
                                    <span className="text-[10px] font-normal text-secondary/80">
                                      (Matched: &quot;{sk.matchedAlias}&quot;)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-outline">
                                  {sk.domain || "Technical"} {sk.subCategory ? `• ${sk.subCategory}` : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {sk.jobCount > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/20 text-outline">
                                    {sk.jobCount} jobs
                                  </span>
                                )}
                                <span className="text-secondary font-bold text-xs">
                                  {isAlreadyAdded ? "Added" : "+ Add"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Top In-Demand Suggestions for Target Role */}
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-semibold text-outline">
                          Top In-Demand for <span className="text-secondary font-bold">{editForm.targetRole || selectedDomain}</span>:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                        {availableSkills
                          .filter((sk) => !currentSkills.some((cs) => cs.skillName.toLowerCase() === sk.name.toLowerCase()))
                          .slice(0, 18)
                          .map((sk) => (
                            <button
                              key={sk.id}
                              onClick={() => handleAddSkill(sk.name)}
                              className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/30 hover:border-secondary/60 hover:text-secondary text-[11px] text-on-surface-variant transition-colors flex items-center gap-1"
                            >
                              <span>+ {sk.name}</span>
                              {sk.jobCount > 0 && (
                                <span className="text-[9px] text-outline opacity-75">
                                  ({sk.jobCount})
                                </span>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                </section>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MATCHED JOBS VIEW */}
        {/* ======================================================== */}
        {activeTab === "matches" && (
          <div className="flex flex-col gap-6">
            <div className="p-5 rounded-2xl bg-surface-container-high/40 border border-secondary/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span>🎯 Real-Time Job Matches For You</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/20 text-secondary border border-secondary/30">
                    {matches.length} Matches Found
                  </span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Ranked via Precision Role & Skills Matching Engine (45% Target Role & Domain + 40% Core Technical Skills + 15% Experience Fit).
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectAllJobs}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {selectedJobIds.length === matches.length && matches.length > 0 ? "check_box" : "check_box_outline_blank"}
                  </span>
                  <span>{selectedJobIds.length === matches.length && matches.length > 0 ? "Deselect All" : "Select All"}</span>
                </button>

                <button
                  onClick={() => {
                    setLoadingMatches(true);
                    fetch("/api/profile/matches")
                      .then((r) => r.json())
                      .then((d) => setMatches(d.matches || []))
                      .finally(() => setLoadingMatches(false));
                  }}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => {
                    const chosen = matches.filter((m) => selectedJobIds.includes(m.jobId));
                    if (chosen.length === 0) {
                      alert("Please select at least 1 job to launch multi-apply");
                      return;
                    }
                    setMirrorJobs(chosen);
                    setShowReviewMirror(true);
                  }}
                  disabled={selectedJobIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold hover:bg-secondary/90 shadow-lg shadow-secondary/20 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>Auto-Apply via Vault ({selectedJobIds.length})</span>
                </button>
              </div>
            </div>

            {loadingMatches ? (
              <div className="p-16 flex justify-center items-center text-secondary animate-pulse gap-2">
                <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
                Calculating weighted compatibility across 23,000+ jobs...
              </div>
            ) : matches.length === 0 ? (
              <div className="p-12 text-center text-outline">
                No matches found yet. Try adding more skills or refining your target role in your profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((job) => {
                  const isSelected = selectedJobIds.includes(job.jobId);
                  const s = (job.source || "").toLowerCase();
                  const u = (job.url || "").toLowerCase();
                  let sourceInfo = {
                    name: job.source || "Direct Portal",
                    colorClass: "bg-surface-container text-on-surface-variant border-outline-variant/40",
                    badgeText: job.source || "Direct Portal",
                    icon: "link",
                    openLabel: "Open Job",
                  };

                  if (s.includes("linkedin") || u.includes("linkedin.com")) {
                    sourceInfo = {
                      name: "LinkedIn",
                      colorClass: "bg-[#0A66C2]/20 text-[#38bdf8] border-[#0A66C2]/50",
                      badgeText: "LinkedIn Easy Apply",
                      icon: "work",
                      openLabel: "Open LinkedIn",
                    };
                  } else if (s.includes("wuzzuf") || u.includes("wuzzuf.net")) {
                    sourceInfo = {
                      name: "WUZZUF",
                      colorClass: "bg-blue-600/20 text-blue-400 border-blue-500/50",
                      badgeText: "WUZZUF Direct",
                      icon: "business_center",
                      openLabel: "Open WUZZUF",
                    };
                  } else if (s.includes("bayt") || u.includes("bayt.com")) {
                    sourceInfo = {
                      name: "Bayt",
                      colorClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
                      badgeText: "Bayt Job",
                      icon: "apartment",
                      openLabel: "Open Bayt",
                    };
                  }

                  return (
                    <div
                      key={job.jobId}
                      className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 group relative overflow-hidden ${
                        isSelected
                          ? "border-secondary ring-2 ring-secondary/40 bg-secondary/[0.04]"
                          : "border-outline-variant/30 hover:border-secondary/50"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleJobSelection(job.jobId)}
                              className="mt-0.5 text-secondary hover:scale-110 transition-transform"
                              title={isSelected ? "Deselect Job" : "Select for Multi-Apply"}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isSelected ? "check_box" : "check_box_outline_blank"}
                              </span>
                            </button>
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${sourceInfo.colorClass}`}>
                                  <span className="material-symbols-outlined text-[12px]">{sourceInfo.icon}</span>
                                  <span>{sourceInfo.badgeText}</span>
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-on-surface group-hover:text-secondary transition-colors line-clamp-1">
                                {job.title}
                              </h4>
                              <p className="text-xs text-secondary font-medium mt-0.5">
                                {job.company} • {job.location}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-base font-extrabold px-3 py-1 rounded-xl border ${
                              job.matchScore >= 80
                                ? "bg-secondary/20 text-secondary border-secondary/40"
                                : job.matchScore >= 60
                                ? "bg-primary/20 text-primary border-primary/40"
                                : "bg-surface-container text-outline border-outline-variant/30"
                            }`}>
                              {job.matchScore}%
                            </span>
                            <span className="text-[10px] text-outline mt-0.5 font-bold">Match Score</span>
                          </div>
                        </div>

                        {/* Matched Skills Chips */}
                        <div className="mt-4">
                          <span className="text-[11px] font-semibold text-outline block mb-1.5">
                            Matching Criteria ({job.matchedSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {job.matchedSkills.map((sk) => (
                              <span key={sk} className="px-2 py-0.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary text-[11px] font-medium">
                                ✓ {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Missing Skills Chips */}
                        {job.missingSkills.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[11px] font-semibold text-outline block mb-1.5">
                              Missing Skills ({job.missingSkills.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {job.missingSkills.slice(0, 5).map((sk) => (
                                <span key={sk} className="px-2 py-0.5 rounded-lg bg-surface-container-highest border border-outline-variant/30 text-outline text-[11px]">
                                  + {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs">
                        <div className="flex flex-col">
                          <span className="text-on-surface font-semibold text-xs">
                            {job.salary && job.salary !== "Confidential" ? `💰 ${job.salary}` : "الراتب غير معلن (حسب المقابلة)"}
                          </span>
                          <span className="text-[10px] text-outline font-medium flex items-center gap-1 mt-0.5">
                            المصدر: <span className="font-extrabold text-secondary">{sourceInfo.name}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setMirrorJobs([job]);
                              setShowReviewMirror(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary hover:bg-secondary hover:text-white font-bold text-xs border border-secondary/30 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[13px]">rocket_launch</span>
                            <span>Apply via Vault</span>
                          </button>
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            title={`فتح رابط الوظيفة الأصلي على منصة ${sourceInfo.name}: ${job.url}`}
                            className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-outline-variant/40 transition-all flex items-center gap-1"
                          >
                            <span>{sourceInfo.openLabel}</span>
                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: APPLICATION VAULT (ATS PRE-FILL SURVEY) */}
        {/* ======================================================== */}
        {activeTab === "vault" && (
          <ApplicationVaultTab
            onOpenDispatched={() => {
              setActiveTab("dispatched");
              fetchDispatched();
            }}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 4: DISPATCHED APPLICATIONS AUDIT LOG */}
        {/* ======================================================== */}
        {activeTab === "dispatched" && (
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">history_edu</span>
                  <span>Dispatched Applications Audit Log</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/20 text-secondary">
                    {dispatchedApps.length} Recorded
                  </span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Track all job applications submitted using your verified Candidate Application Vault responses.
                </p>
              </div>

              <button
                onClick={fetchDispatched}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Refresh History</span>
              </button>
            </div>

            {loadingDispatched ? (
              <div className="p-16 flex justify-center items-center text-secondary animate-pulse gap-2">
                <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
                Loading application history...
              </div>
            ) : dispatchedApps.length === 0 ? (
              <div className="p-16 text-center text-outline glass-panel rounded-2xl border border-outline-variant/20 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[36px] text-outline/60">work_outline</span>
                <span className="text-sm">No applications dispatched yet.</span>
                <button
                  onClick={() => setActiveTab("matches")}
                  className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold shadow-md"
                >
                  Explore Matched Jobs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dispatchedApps.map((app) => (
                  <div
                    key={app.id}
                    className="glass-panel p-5 rounded-2xl border border-outline-variant/30 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-sm text-on-surface">{app.jobTitle}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/30">
                          {app.status}
                        </span>
                      </div>
                      <span className="text-xs text-secondary font-medium block mt-0.5">
                        {app.company} • {app.location}
                      </span>
                      <span className="text-[10px] text-outline block mt-1">
                        Dispatched: {new Date(app.submittedAt).toLocaleString()} via {app.source}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs">
                      <span className="text-secondary text-[11px] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        Verified Vault Snapshot
                      </span>
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface font-semibold text-xs border border-outline-variant/40 flex items-center gap-1"
                      >
                        <span>Open Application</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </main>

      {/* ======================================================== */}
      {/* MODAL 1: CHANGE AVATAR PHOTO */}
      {/* ======================================================== */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1626] border border-outline-variant/40 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                Change Profile Picture
              </h3>
              <button onClick={() => setShowAvatarModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Presets Grid */}
              <div>
                <label className="text-xs font-semibold text-outline block mb-2">Select Professional Avatar Preset:</label>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateAvatar(av.url)}
                      className="group relative rounded-xl overflow-hidden border border-outline-variant/30 hover:border-primary transition-all aspect-square"
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white p-1 text-center truncate">
                        {av.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Local File */}
              <div className="pt-2 border-t border-outline-variant/20">
                <label className="text-xs font-semibold text-outline block mb-1.5">Or Upload Photo from Device:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "avatar")}
                  className="w-full text-xs text-outline file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-surface-container file:text-on-surface hover:file:bg-surface-container-highest cursor-pointer"
                />
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Or Paste Image URL:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={customAvatarInput}
                    onChange={(e) => setCustomAvatarInput(e.target.value)}
                    className="flex-1 bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => updateAvatar(customAvatarInput)}
                    disabled={!customAvatarInput || updatingPhoto}
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CHANGE COVER BANNER */}
      {/* ======================================================== */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1626] border border-outline-variant/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">palette</span>
                Customize Cover Banner
              </h3>
              <button onClick={() => setShowCoverModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Presets Gradients */}
              <div>
                <label className="text-xs font-semibold text-outline block mb-2">Curated Gradient Themes:</label>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_COVERS.map((cov, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateCover(cov.style)}
                      className="h-16 rounded-xl border border-outline-variant/30 hover:border-secondary flex items-end p-2 transition-all relative overflow-hidden group"
                      style={{ background: cov.style }}
                    >
                      <span className="text-[11px] font-bold text-white drop-shadow-md z-10">
                        {cov.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Local File */}
              <div className="pt-2 border-t border-outline-variant/20">
                <label className="text-xs font-semibold text-outline block mb-1.5">Or Upload Banner Image:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "cover")}
                  className="w-full text-xs text-outline file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-surface-container file:text-on-surface hover:file:bg-surface-container-highest cursor-pointer"
                />
              </div>

              {/* Custom Cover URL */}
              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Or Paste Banner URL:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/cover.jpg"
                    value={customCoverInput}
                    onChange={(e) => setCustomCoverInput(e.target.value)}
                    className="flex-1 bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  />
                  <button
                    onClick={() => updateCover(customCoverInput)}
                    disabled={!customCoverInput || updatingPhoto}
                    className="px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD / EDIT WORK EXPERIENCE */}
      {/* ======================================================== */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1626] border border-outline-variant/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">work</span>
                {editingExpId ? "Edit Work Experience" : "Add Work Experience"}
              </h3>
              <button onClick={() => setShowExpModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveExp} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Data Analyst"
                  value={expForm.role}
                  onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vodafone Egypt"
                    value={expForm.company}
                    onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Cairo, Egypt or Remote"
                    value={expForm.location}
                    onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={expForm.startDate}
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={expForm.isCurrent}
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isCurrentExp"
                  checked={expForm.isCurrent}
                  onChange={(e) => setExpForm({ ...expForm, isCurrent: e.target.checked })}
                  className="rounded accent-secondary"
                />
                <label htmlFor="isCurrentExp" className="text-xs text-on-surface font-semibold cursor-pointer">
                  I currently work in this role
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Key Responsibilities & Achievements</label>
                <textarea
                  rows={4}
                  placeholder="• Developed automated data pipelines using Python and SQL...&#10;• Designed executive Power BI dashboards saving 15 hours weekly..."
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-secondary leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExp}
                  className="px-5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary/90 shadow-md disabled:opacity-50"
                >
                  {savingExp ? "Saving..." : editingExpId ? "Update Experience" : "Add Experience"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD / EDIT EDUCATION */}
      {/* ======================================================== */}
      {showEduModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1626] border border-outline-variant/40 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">school</span>
                {editingEduId ? "Edit Education" : "Add Education"}
              </h3>
              <button onClick={() => setShowEduModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdu} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Institution / University *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cairo University, Faculty of Science"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Degree *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bachelor of Science (B.Sc.)"
                  value={eduForm.degree}
                  onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Field of Study</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Statistics, Mathematics"
                  value={eduForm.fieldOfStudy}
                  onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">Start Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2018"
                    value={eduForm.startYear}
                    onChange={(e) => setEduForm({ ...eduForm, startYear: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">End Year (Graduation)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2022"
                    value={eduForm.endYear}
                    onChange={(e) => setEduForm({ ...eduForm, endYear: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEduModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdu}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-md disabled:opacity-50"
                >
                  {savingEdu ? "Saving..." : editingEduId ? "Update Education" : "Add Education"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: APPLICATION REVIEW MIRROR (MULTI-JOB DISPATCH) */}
      {/* ======================================================== */}
      <ApplicationReviewMirrorModal
        isOpen={showReviewMirror}
        onClose={() => {
          setShowReviewMirror(false);
          setMirrorJobs([]);
        }}
        selectedJobs={mirrorJobs}
        user={user}
        onDispatchedSuccess={(count) => {
          setSelectedJobIds([]);
          fetchDispatched();
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 6: DETERMINISTIC RESUME SECTION PARSER */}
      {/* ======================================================== */}
      <ResumeSectionParserModal
        isOpen={showResumeParser}
        onClose={() => setShowResumeParser(false)}
        onProfileUpdated={() => {
          fetchProfile();
        }}
      />

    </div>
  );
}

