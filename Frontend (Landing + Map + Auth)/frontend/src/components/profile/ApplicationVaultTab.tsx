"use client";
import React, { useState, useEffect } from "react";
import { normalizeToNumber } from "@/lib/vaultNormalizer";

export interface VaultQuestion {
  questionKey: string;
  category: "BEHAVIORAL" | "WORK_PREFERENCES" | "TECHNICAL_SCREENING" | "COMPENSATION" | "LOGISTICS" | "EQUAL_OPPORTUNITY" | "BACKGROUND" | "CUSTOM" | string;
  questionText: string;
  type: "text" | "textarea" | "boolean" | "select" | "number";
  options?: string[];
  placeholder?: string;
  helpText?: string;
  defaultAnswer?: string;
  answerValue: string;
  isAiGenerated: boolean;
  isSaved: boolean;
  updatedAt: string | null;
  isCustom?: boolean;
}

export interface VaultStats {
  answeredCount: number;
  totalCount: number;
  completionPercentage: number;
  isReadyForAutoApply: boolean;
}

const CATEGORY_META: Record<string, { label: string; icon: string; desc: string }> = {
  ALL: { label: "All Questions", icon: "dashboard", desc: "Complete screening catalog" },
  BEHAVIORAL: { label: "Behavioral & Essays", icon: "psychology", desc: "Achievements, motivation & relevant experience" },
  WORK_PREFERENCES: { label: "Work Preferences", icon: "tune", desc: "Remote, full-time & EST timezone overlap" },
  TECHNICAL_SCREENING: { label: "Technical Screening", icon: "terminal", desc: "Hands-on tools & years of experience" },
  COMPENSATION: { label: "Compensation", icon: "payments", desc: "Monthly USD gross & EGP net salary expectations" },
  LOGISTICS: { label: "Logistics & Availability", icon: "schedule", desc: "Travel, notice period & referral sources" },
  EQUAL_OPPORTUNITY: { label: "Equal Opportunity & Background", icon: "diversity_3", desc: "Demographics & prior employment compliance" },
  BACKGROUND: { label: "Equal Opportunity & Background", icon: "diversity_3", desc: "Demographics & prior employment compliance" },
  CUSTOM: { label: "Custom Questions", icon: "add_circle", desc: "User-defined questions" },
};

interface ApplicationVaultTabProps {
  onOpenDispatched?: () => void;
}

export default function ApplicationVaultTab({ onOpenDispatched }: ApplicationVaultTabProps) {
  const [questions, setQuestions] = useState<VaultQuestion[]>([]);
  const [stats, setStats] = useState<VaultStats>({
    answeredCount: 0,
    totalCount: 16,
    completionPercentage: 0,
    isReadyForAutoApply: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Add Custom Question Modal
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    questionText: "",
    category: "BEHAVIORAL",
    type: "textarea" as "text" | "textarea" | "boolean" | "select" | "number",
    answerValue: "",
    helpText: "",
  });

  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile/vault");
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
      setFeedback({ type: "error", text: "Failed to load Application Vault questions" });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionKey: string, newValue: string) => {
    setQuestions((prev) => {
      const next = prev.map((q) => {
        if (q.questionKey === questionKey) {
          return { ...q, answerValue: newValue, isSaved: false, isAiGenerated: false };
        }
        return q;
      });

      const answered = next.filter((q) => q.answerValue.trim().length > 0).length;
      const total = next.length;
      const pct = Math.round((answered / total) * 100);
      setStats({
        answeredCount: answered,
        totalCount: total,
        completionPercentage: pct,
        isReadyForAutoApply: pct >= 80,
      });

      return next;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionKey: q.questionKey,
          category: q.category,
          questionText: q.questionText,
          answerValue: q.answerValue,
          isAiGenerated: q.isAiGenerated,
        })),
      };

      const res = await fetch("/api/profile/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", text: "All Vault Answers Saved Successfully!" });
        setQuestions((prev) => prev.map((q) => ({ ...q, isSaved: true })));
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to save answers" });
      }
    } catch (e) {
      console.error(e);
      setFeedback({ type: "error", text: "Network error while saving answers" });
    } finally {
      setSaving(false);
    }
  };

  // AI Generation from actual candidate profile
  const handleGenerateViaAi = async () => {
    setGeneratingAi(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/profile/vault/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate answers");
      }

      const generatedMap = data.answers;
      setQuestions((prev) =>
        prev.map((q) => {
          if (generatedMap[q.questionKey]) {
            return {
              ...q,
              answerValue: generatedMap[q.questionKey],
              isAiGenerated: true,
              isSaved: false,
            };
          }
          return q;
        })
      );

      setFeedback({
        type: "success",
        text: "⚡ Tailored answers generated from your real profile! Please review and click 'Save All Answers'.",
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", text: err.message || "AI generation failed" });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handlePrefillRecommended = () => {
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        answerValue: q.answerValue || q.defaultAnswer || "",
        isSaved: false,
      }))
    );
    setTimeout(() => {
      handleSaveAll();
    }, 100);
  };

  const handleAddCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.questionText.trim()) return;

    const newKey = "custom_" + Date.now();
    const newQuestion: VaultQuestion = {
      questionKey: newKey,
      category: customForm.category,
      questionText: customForm.questionText.trim(),
      type: customForm.type,
      answerValue: customForm.answerValue.trim(),
      helpText: customForm.helpText.trim() || "Custom question added by candidate",
      isAiGenerated: false,
      isSaved: false,
      updatedAt: new Date().toISOString(),
      isCustom: true,
    };

    const updated = [newQuestion, ...questions];
    setQuestions(updated);
    setShowAddCustomModal(false);
    setCustomForm({
      questionText: "",
      category: "BEHAVIORAL",
      type: "textarea",
      answerValue: "",
      helpText: "",
    });

    // Save immediately
    try {
      await fetch("/api/profile/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: [
            {
              questionKey: newQuestion.questionKey,
              category: newQuestion.category,
              questionText: newQuestion.questionText,
              answerValue: newQuestion.answerValue,
              isAiGenerated: false,
            },
          ],
        }),
      });
      setFeedback({ type: "success", text: "New custom question added to your Vault!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (_) {}
  };

  const handleDeleteCustom = (key: string) => {
    setQuestions((prev) => prev.filter((q) => q.questionKey !== key));
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesCategory =
      selectedCategory === "ALL" ||
      q.category === selectedCategory ||
      (selectedCategory === "EQUAL_OPPORTUNITY" && q.category === "BACKGROUND") ||
      (selectedCategory === "CUSTOM" && q.isCustom);
    const matchesSearch =
      !searchQuery ||
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answerValue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-16 flex flex-col justify-center items-center text-secondary gap-3 animate-pulse">
        <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
        <span className="text-sm font-semibold">Loading Candidate Application Vault...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Vault Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-secondary/40 shadow-2xl relative overflow-hidden bg-gradient-to-r from-surface-container via-[#0d1b2a] to-surface-container">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">verified_user</span>
                Pre-Fill Screening Survey
              </span>
              <span className="text-xs text-outline font-medium">Pinpoint HQ • Workday • Concentrix • Lever</span>
            </div>
            <h2 className="text-2xl font-extrabold text-on-surface">
              Candidate Application Vault
            </h2>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Store candidate-verified answers to common screening questions. Automatically type-cast into numbers, booleans, or dropdown options when applying across different ATS portals — with zero hallucinations and zero token burning.
            </p>
          </div>

          {/* Completion Progress & Stats */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-on-surface">
                  {stats.answeredCount} of {stats.totalCount} Completed
                </div>
                <div className="text-[11px] text-secondary font-medium">
                  {stats.isReadyForAutoApply ? "✓ Ready for Auto-Apply" : "Needs 80%+ to unlock 1-click apply"}
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-surface-container-highest border border-secondary/40 flex items-center justify-center font-black text-base text-secondary shadow-lg">
                {stats.completionPercentage}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full sm:w-48 h-2.5 rounded-full bg-surface-container-highest border border-outline-variant/30 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  stats.completionPercentage >= 80
                    ? "bg-gradient-to-r from-secondary to-emerald-400"
                    : "bg-gradient-to-r from-primary to-secondary"
                }`}
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="mt-6 pt-4 border-t border-outline-variant/20 flex flex-wrap justify-between items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGenerateViaAi}
              disabled={generatingAi}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 transition-all disabled:opacity-50"
              title="Read your experiences and draft personalized answers"
            >
              <span className="material-symbols-outlined text-[16px]">
                {generatingAi ? "sync" : "auto_awesome"}
              </span>
              <span>{generatingAi ? "Generating from Profile..." : "Generate Answers from My CV"}</span>
            </button>

            <button
              onClick={() => setShowAddCustomModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-variant border border-secondary/40 text-xs font-bold text-secondary flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Add Custom Question</span>
            </button>

            <button
              onClick={handlePrefillRecommended}
              className="px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-variant border border-outline-variant/40 text-xs font-semibold text-outline hover:text-on-surface flex items-center gap-1 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">playlist_add_check</span>
              <span>Prefill Benchmark</span>
            </button>

            {onOpenDispatched && (
              <button
                onClick={onOpenDispatched}
                className="px-3 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-variant border border-outline-variant/40 text-xs font-semibold text-outline hover:text-on-surface flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">history_edu</span>
                <span>History</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {feedback && (
              <div
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in ${
                  feedback.type === "success"
                    ? "bg-secondary/20 text-secondary border border-secondary/30"
                    : "bg-error/20 text-error border border-error/30"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {feedback.type === "success" ? "check_circle" : "warning"}
                </span>
                <span>{feedback.text}</span>
              </div>
            )}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary/90 transition-all flex items-center gap-1.5 shadow-lg shadow-secondary/20 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saving ? "hourglass_top" : "save"}
              </span>
              <span>{saving ? "Saving Vault..." : "Save All Answers"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {["ALL", "BEHAVIORAL", "WORK_PREFERENCES", "TECHNICAL_SCREENING", "COMPENSATION", "LOGISTICS", "EQUAL_OPPORTUNITY", "CUSTOM"].map(
            (cat) => {
              const meta = CATEGORY_META[cat] || { label: cat, icon: "label" };
              const count =
                cat === "ALL"
                  ? questions.length
                  : cat === "CUSTOM"
                  ? questions.filter((q) => q.isCustom).length
                  : questions.filter(
                      (q) =>
                        q.category === cat ||
                        (cat === "EQUAL_OPPORTUNITY" && q.category === "BACKGROUND")
                    ).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                      : "bg-surface-container hover:bg-surface-container-highest text-on-surface-variant border border-outline-variant/30"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedCategory === cat ? "bg-black/30 text-white" : "bg-surface-container-highest text-outline"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[16px] text-outline">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or keywords..."
            className="w-full bg-surface-container border border-outline-variant/40 rounded-xl pl-8 pr-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
          />
        </div>
      </div>

      {/* Questions Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuestions.map((q, idx) => {
          const isAnswered = q.answerValue.trim().length > 0;
          const meta = CATEGORY_META[q.category] || { label: q.category, icon: "quiz" };
          const numericEquivalent = normalizeToNumber(q.answerValue);

          return (
            <div
              key={q.questionKey}
              className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden ${
                q.type === "textarea" ? "md:col-span-2" : ""
              } ${
                isAnswered
                  ? "border-outline-variant/40 hover:border-secondary/50"
                  : "border-amber-500/30 bg-amber-500/[0.02]"
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-container-highest border border-outline-variant/30 text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                    {q.isAiGenerated ? (
                      <span className="px-2 py-0.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
                        AI Drafted from Profile (Verify Below)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary text-[10px] font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">verified</span>
                        Candidate Verified
                      </span>
                    )}

                    {/* Smart Numeric Normalization Indicator */}
                    {(q.type === "number" || q.questionKey.includes("experience") || q.questionKey.includes("salary")) && numericEquivalent > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-surface-container border border-outline-variant/30 text-outline text-[10px] font-mono" title="If target ATS form requires integer">
                        Mapped Numeric: {numericEquivalent}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {q.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(q.questionKey)}
                        className="text-outline hover:text-error text-xs"
                        title="Delete custom question"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-outline">#{idx + 1}</span>
                  </div>
                </div>

                <label className="text-sm font-bold text-on-surface block leading-snug">
                  {q.questionText}
                </label>

                {q.helpText && (
                  <p className="text-[11px] text-outline mt-1 leading-normal flex items-start gap-1">
                    <span className="material-symbols-outlined text-[13px] text-secondary/70 mt-0.5">
                      info
                    </span>
                    <span>{q.helpText}</span>
                  </p>
                )}
              </div>

              {/* Form Input based on Question Type */}
              <div className="pt-2">
                {/* 1. TEXTAREA */}
                {q.type === "textarea" && (
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={q.answerValue}
                      onChange={(e) => handleAnswerChange(q.questionKey, e.target.value)}
                      placeholder={q.placeholder || "Type your detailed answer here..."}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-secondary leading-relaxed transition-all"
                    />
                    <div className="flex justify-between items-center text-[10px] text-outline mt-1 px-1">
                      <span>{q.answerValue.length} characters</span>
                      {q.defaultAnswer && q.answerValue !== q.defaultAnswer && (
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.questionKey, q.defaultAnswer || "")}
                          className="text-secondary hover:underline"
                        >
                          Reset to Benchmark
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. BOOLEAN PILL TOGGLES */}
                {q.type === "boolean" && (
                  <div className="flex items-center gap-2">
                    {["Yes", "No"].map((opt) => {
                      const isSelected = q.answerValue.toLowerCase() === opt.toLowerCase();
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(q.questionKey, opt)}
                          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? opt === "Yes"
                                ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                                : "bg-error/80 text-white"
                              : "bg-surface-container hover:bg-surface-container-highest text-on-surface border border-outline-variant/40"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {opt === "Yes" ? "check" : "close"}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. SELECT DROPDOWN */}
                {q.type === "select" && (
                  <div className="relative">
                    <select
                      value={q.answerValue}
                      onChange={(e) => handleAnswerChange(q.questionKey, e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-secondary appearance-none cursor-pointer"
                    >
                      <option value="">-- Select an option --</option>
                      {(q.options || []).map((opt) => (
                        <option key={opt} value={opt} className="bg-[#0B1326] text-on-surface">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3 text-[16px] text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                )}

                {/* 4. NUMBER */}
                {q.type === "number" && (
                  <div className="relative">
                    <input
                      type="number"
                      value={q.answerValue}
                      onChange={(e) => handleAnswerChange(q.questionKey, e.target.value)}
                      placeholder={q.placeholder || "Enter amount"}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-bold text-outline uppercase">
                      {q.questionKey.includes("usd") ? "USD Gross" : "EGP Net"}
                    </span>
                  </div>
                )}

                {/* 5. STANDARD TEXT */}
                {q.type === "text" && (
                  <input
                    type="text"
                    value={q.answerValue}
                    onChange={(e) => handleAnswerChange(q.questionKey, e.target.value)}
                    placeholder={q.placeholder || "Type answer..."}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD CUSTOM QUESTION */}
      {/* ======================================================== */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E1626] border border-secondary/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">add_circle</span>
                Add Custom Screening Question
              </h3>
              <button onClick={() => setShowAddCustomModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomQuestion} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Question Text *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Do you have a valid passport / visa?"
                  value={customForm.questionText}
                  onChange={(e) => setCustomForm({ ...customForm, questionText: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">Category</label>
                  <select
                    value={customForm.category}
                    onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  >
                    <option value="BEHAVIORAL">Behavioral</option>
                    <option value="WORK_PREFERENCES">Work Preferences</option>
                    <option value="TECHNICAL_SCREENING">Technical Screening</option>
                    <option value="COMPENSATION">Compensation</option>
                    <option value="LOGISTICS">Logistics</option>
                    <option value="EQUAL_OPPORTUNITY">Legal / Background</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-outline block mb-1">Answer Type</label>
                  <select
                    value={customForm.type}
                    onChange={(e) => setCustomForm({ ...customForm, type: e.target.value as any })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  >
                    <option value="textarea">Essay (Textarea)</option>
                    <option value="text">Single Line Text</option>
                    <option value="boolean">Yes / No (Boolean)</option>
                    <option value="number">Number Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-outline block mb-1">Your Verified Answer *</label>
                {customForm.type === "textarea" ? (
                  <textarea
                    rows={3}
                    required
                    placeholder="Type your answer..."
                    value={customForm.answerValue}
                    onChange={(e) => setCustomForm({ ...customForm, answerValue: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-secondary leading-relaxed"
                  />
                ) : customForm.type === "boolean" ? (
                  <div className="flex gap-2">
                    {["Yes", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomForm({ ...customForm, answerValue: opt })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                          customForm.answerValue === opt
                            ? "bg-secondary text-on-secondary border-secondary"
                            : "bg-surface-container border-outline-variant/40 text-on-surface"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type={customForm.type === "number" ? "number" : "text"}
                    required
                    placeholder="Type answer..."
                    value={customForm.answerValue}
                    onChange={(e) => setCustomForm({ ...customForm, answerValue: e.target.value })}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary/90 shadow-md"
                >
                  Save Question to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
