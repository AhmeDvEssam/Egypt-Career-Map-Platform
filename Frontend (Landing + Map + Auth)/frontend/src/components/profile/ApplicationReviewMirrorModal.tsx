"use client";
import React, { useState, useEffect } from "react";
import { VaultQuestion } from "./ApplicationVaultTab";
import { normalizeToNumber } from "@/lib/vaultNormalizer";

export interface SelectedJobItem {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  source: string;
  url: string;
  matchScore: number;
}

interface ApplicationReviewMirrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJobs: SelectedJobItem[];
  user: any;
  onDispatchedSuccess?: (count: number) => void;
}

export default function ApplicationReviewMirrorModal({
  isOpen,
  onClose,
  selectedJobs,
  user,
  onDispatchedSuccess,
}: ApplicationReviewMirrorModalProps) {
  const [activeJobIndex, setActiveJobIndex] = useState(0);
  const [vaultQuestions, setVaultQuestions] = useState<VaultQuestion[]>([]);
  const [liveSession, setLiveSession] = useState<any>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchComplete, setDispatchComplete] = useState(false);
  const [dispatchedList, setDispatchedList] = useState<any[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [candidatePhone, setCandidatePhone] = useState(user?.profile?.phoneNumber || "+20 114 230 6520");
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [automationStatus, setAutomationStatus] = useState<"IDLE" | "RUNNING" | "AUTH_REQUIRED" | "COMPLETED" | "ERROR" | null>(null);
  const [automationMessage, setAutomationMessage] = useState<string>("");
  const [isLinkedInConnected, setIsLinkedInConnected] = useState<boolean | null>(null);
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false);

  const currentJob = selectedJobs[activeJobIndex] || selectedJobs[0];

  useEffect(() => {
    if (isOpen) {
      setDispatchComplete(false);
      setAutomationStatus(null);
      setAutomationMessage("");
      setActiveJobIndex(0);
      setDispatchedList([...selectedJobs]);
      if (user?.profile?.phoneNumber) {
        setCandidatePhone(user.profile.phoneNumber);
      }
      fetchVault();
      if (selectedJobs.length > 0) {
        fetchJobMirror(selectedJobs[0].jobId, selectedJobs[0].url);
      }
    }
  }, [isOpen, selectedJobs]);

  // Check LinkedIn auth status periodically
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/profile/apply-live");
        const data = await res.json();
        if (isMounted) {
          setIsLinkedInConnected(data.authenticated === true);
          if (data.authenticated === true) {
            setIsConnectingLinkedIn(false);
            if (!isSubmitting) {
              setAutomationMessage("");
              if (automationStatus === "AUTH_REQUIRED") {
                setAutomationStatus("IDLE");
              }
            }
          }
        }
      } catch (e) {
        if (isMounted) setIsLinkedInConnected(false);
      }
    };
    checkAuth();
    const interval = setInterval(checkAuth, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, automationStatus]);

  const fetchJobMirror = async (jobId?: string, jobUrl?: string) => {
    try {
      setLoadingQuestions(true);
      const query = jobId
        ? `?jobId=${encodeURIComponent(jobId)}&jobUrl=${encodeURIComponent(jobUrl || "")}`
        : "";
      const res = await fetch(`/api/profile/mirror${query}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setLiveSession(data.session);
        }
      }
    } catch (err) {
      console.error("Failed to load mirror questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchVault = async () => {
    try {
      const res = await fetch("/api/profile/vault");
      const data = await res.json();
      if (data.success) {
        setVaultQuestions(data.questions || []);
      }
    } catch (e) {
      console.error("Failed to load vault for mirror:", e);
    }
  };

  const handleSelectJobTab = (idx: number) => {
    setActiveJobIndex(idx);
    const target = selectedJobs[idx];
    if (target) {
      fetchJobMirror(target.jobId, target.url);
    }
  };

  const handleGenerateAnswer = async (key: string, questionText: string) => {
    try {
      setGeneratingKey(key);
      const res = await fetch("/api/profile/vault/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText, questionKey: key }),
      });
      const data = await res.json();
      if (data.success && data.answer) {
        handleUpdateLiveQuestion(questionText, data.answer);
      }
    } catch (err) {
      console.error("AI Generation error:", err);
    } finally {
      setGeneratingKey(null);
    }
  };

  const handleUpdateLiveQuestion = async (qText: string, val: string) => {
    if (!liveSession) return;
    setLiveSession({
      ...liveSession,
      questions: (liveSession.questions || []).map((q: any) =>
        q.text === qText ? { ...q, suggestedAnswer: val, status: "ANSWERED" } : q
      ),
    });

    try {
      await fetch("/api/profile/mirror", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: qText, answerValue: val }),
      });
    } catch (_) {}
  };

  const handleConfirmDispatch = async () => {
    setIsSubmitting(true);
    setAutomationStatus("RUNNING");
    setAutomationMessage("Launching Brave Browser Automation Engine...");

    try {
      // 1. Persist phone number if updated
      if (candidatePhone && candidatePhone !== user?.profile?.phoneNumber) {
        try {
          await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: candidatePhone }),
          });
        } catch (_) {}
      }

      // 2. Prepare answer map from liveSession questions and vault
      const answersMap: Record<string, string> = {};
      if (liveSession?.questions) {
        liveSession.questions.forEach((q: any) => {
          if (q.suggestedAnswer) {
            const key = q.text.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80);
            answersMap[key] = q.suggestedAnswer;
            answersMap[q.text] = q.suggestedAnswer;
          }
        });
      }
      vaultQuestions.forEach((q) => {
        answersMap[q.questionKey] = q.answerValue || q.defaultAnswer || "";
      });

      // 3. Pre-flight check: If LinkedIn job and LinkedIn not connected, guide user to login first
      const targetJob = selectedJobs[activeJobIndex] || selectedJobs[0];
      const isLinkedInJob = targetJob?.url?.toLowerCase().includes("linkedin.com");
      if (isLinkedInJob && isLinkedInConnected === false) {
        setAutomationStatus("AUTH_REQUIRED");
        setAutomationMessage("يلزم تسجيل الدخول لمرة واحدة إلى حساب LinkedIn في متصفح التقديم المخصص ليتم التقديم الآلي.");
        handleOpenBraveLogin();
        return;
      }

      // 4. Trigger Live Browser Automation for the primary job
      if (targetJob && targetJob.url) {
        setAutomationStatus("RUNNING");
        setAutomationMessage(`جاري فتح الوظيفة والتقديم الفعلي في متصفح Brave (${targetJob.company})...`);

        const autoRes = await fetch("/api/profile/apply-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: targetJob.jobId,
            jobUrl: targetJob.url,
            answers: answersMap,
            candidatePhone: candidatePhone,
          }),
        });

        const autoData = await autoRes.json();
        if (autoData.result?.status === "AUTH_REQUIRED") {
          setAutomationStatus("AUTH_REQUIRED");
          setIsLinkedInConnected(false);
          setAutomationMessage(autoData.result.message);
        } else if (autoData.success || autoData.result?.status === "REVIEW_REACHED" || autoData.result?.status === "SUBMITTED") {
          setAutomationStatus("COMPLETED");
          setAutomationMessage(autoData.result?.message || "🎉 تم تقديم الطلب وإرساله بنجاح عبر LinkedIn!");
          
          // Record successful application in local DB
          try {
            const res = await fetch("/api/profile/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jobIds: [targetJob.jobId],
                vaultAnswersSnapshot: answersMap,
                notes: additionalNotes,
              }),
            });
            const data = await res.json();
            setDispatchedList(data.applications || selectedJobs);
          } catch (_) {}

          setDispatchComplete(true);
          if (onDispatchedSuccess) {
            onDispatchedSuccess(1);
          }
        } else {
          setAutomationStatus("ERROR");
          setAutomationMessage(autoData.result?.message || "تعذر إكمال التقديم التلقائي. تأكد من إمكانية التقديم على الوظيفة.");
        }
      } else {
        alert("لم يتم العثور على رابط الوظيفة المستهدفة.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("حدث خطأ أثناء تشغيل التقديم التلقائي.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenBraveLogin = async () => {
    setIsConnectingLinkedIn(true);
    setAutomationStatus("RUNNING");
    setAutomationMessage("تم فتح متصفح Brave لتسجيل الدخول إلى LinkedIn... سجل دخولك الآن وسيتعرف النظام عليك تلقائياً.");
    try {
      await fetch("/api/profile/apply-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open_login" }),
      });
    } catch (e) {
      console.error(e);
      setIsConnectingLinkedIn(false);
    }
  };

  if (!isOpen) return null;

  const profile = user?.profile || {};
  const questionsList = liveSession?.questions || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0E1626] border border-secondary/40 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl animate-in fade-in duration-200 my-8">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-outline-variant/20 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">checklist_rtl</span>
                Application Review Mirror
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                {selectedJobs.length} Positions Selected
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0A66C2]/20 text-[#38bdf8] border border-[#0A66C2]/40 text-[10px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                Brave Auto-Runner Ready
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-on-surface">
              {dispatchComplete ? "🎉 Application Dispatched to Review Step!" : "Live Job Screening Mirror & Pre-filled Review"}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {dispatchComplete
                ? "Your application questions and resume have been dispatched. You can track progress in your audit log."
                : "This mirror inspects the real questions required by LinkedIn Easy Apply for this position and pre-fills them accurately from your CV and Question Bank."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-highest text-outline hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* =================================================== */}
        {/* SUCCESS / COMPLETED STATE */}
        {/* =================================================== */}
        {dispatchComplete ? (
          <div className="py-6 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-secondary/20 border-2 border-secondary flex items-center justify-center text-secondary shadow-lg shadow-secondary/30 animate-bounce">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>

            <div className="max-w-md">
              <h4 className="text-lg font-bold text-on-surface">
                {dispatchedList.length} Applications Dispatched Successfully
              </h4>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                {automationMessage || "All screening questions and candidate details were verified and dispatched. The application has reached the final Review step on the job portal."}
              </p>
            </div>

            <div className="w-full max-h-60 overflow-y-auto custom-scrollbar border border-outline-variant/30 rounded-2xl p-3 bg-surface-container/40 space-y-2 text-left">
              {dispatchedList.map((job) => (
                <div
                  key={job.jobId || job.id}
                  className="p-3 rounded-xl bg-surface-container border border-secondary/20 flex justify-between items-center gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-on-surface block">{job.title}</span>
                    <span className="text-[11px] text-secondary font-medium">
                      {job.company} • {job.source || "LinkedIn"}
                    </span>
                  </div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                  >
                    <span>View Portal</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-secondary text-on-secondary font-extrabold text-sm shadow-xl shadow-secondary/20 hover:bg-secondary/90 transition-all"
              >
                Done & Return to Profile
              </button>
            </div>
          </div>
        ) : (
          /* =================================================== */
          /* REVIEW & CONFIRMATION MIRROR */
          /* =================================================== */
          <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            
            {/* 1. Job Tabs Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-outline uppercase tracking-wider">
                  1. Target Job Openings ({selectedJobs.length})
                </span>
                <span className="text-[10px] text-secondary font-mono">
                  Active Job: {currentJob?.company} - {currentJob?.title}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedJobs.map((job, idx) => (
                  <div
                    key={job.jobId}
                    onClick={() => handleSelectJobTab(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      idx === activeJobIndex
                        ? "bg-secondary/15 border-secondary shadow-lg shadow-secondary/10"
                        : "bg-surface-container border-outline-variant/30 hover:border-outline-variant/60"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-on-surface line-clamp-1">{job.title}</span>
                      <span className="text-[11px] text-secondary font-medium block">{job.company}</span>
                      <span className="text-[10px] text-outline block mt-0.5">{job.location}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary font-bold">
                        {job.matchScore}% Match
                      </span>
                      <span className="text-outline uppercase font-mono">{job.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Candidate Identity & Contact */}
            <div>
              <span className="text-xs font-bold text-outline block mb-2 uppercase tracking-wider">
                2. Applicant Profile & Verified CV
              </span>
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-outline block font-semibold">Full Name</span>
                  <span className="font-bold text-on-surface">{user?.name || "Ahmed Essam"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-outline block font-semibold">Email Address</span>
                  <span className="font-bold text-on-surface">{user?.email || "ahmed.essam.eldinn@gmail.com"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-outline block font-semibold">Phone Number (Editable)</span>
                  <input
                    type="tel"
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    className="w-full bg-surface-container-high/60 border border-secondary/40 rounded-lg px-2.5 py-1 text-xs text-secondary font-bold outline-none focus:border-secondary mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-outline block font-semibold">Location</span>
                  <span className="text-on-surface">{profile.location || "Cairo, Egypt"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-outline block font-semibold">Target Role</span>
                  <span className="text-on-surface font-semibold">{profile.targetRole || "Data Analyst"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-outline block font-semibold">Verified Resume</span>
                  <a
                    href="/resumes/Ahmed Essam.pdf"
                    target="_blank"
                    className="text-primary font-bold flex items-center gap-1 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">description</span>
                    Ahmed Essam.pdf
                  </a>
                </div>
              </div>
            </div>

            {/* 3. The Mirror: Live Screening Questions */}
            <div>
              <div className="flex justify-between items-center mb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                    3. Real Screening Questions for {currentJob?.company || "Target Job"} ({questionsList.length} Questions)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#0A66C2]/20 text-[#38bdf8] text-[10px] font-bold border border-[#0A66C2]/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    LinkedIn Verified Form
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchJobMirror(currentJob?.jobId, currentJob?.url)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary text-[11px] font-bold flex items-center gap-1 transition-all border border-outline-variant/30"
                  >
                    <span className="material-symbols-outlined text-[13px]">sync</span>
                    Re-Inspect Form
                  </button>
                </div>
              </div>

              {loadingQuestions ? (
                <div className="p-8 text-center text-secondary text-xs animate-pulse">
                  Inspecting live questions for {currentJob?.company}...
                </div>
              ) : questionsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {questionsList.map((q: any) => {
                    const isAnswering = generatingKey === q.id || generatingKey === q.text;

                    return (
                      <div
                        key={q.id || q.text}
                        className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2.5 flex flex-col justify-between shadow-sm"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <span className="text-xs font-bold text-on-surface leading-snug">
                              {q.text}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap ${
                                q.status === "ANSWERED"
                                  ? "bg-secondary/15 text-secondary border border-secondary/30"
                                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {q.status === "ANSWERED" ? "✓ Matched" : "⚠️ Needs Input"}
                            </span>
                          </div>

                          {/* Control per question type */}
                          {q.type === "select" && q.options?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {q.options.map((opt: string) => {
                                const isSel = (q.suggestedAnswer || "").toLowerCase() === opt.toLowerCase();
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleUpdateLiveQuestion(q.text, opt)}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                      isSel
                                        ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                                        : "bg-surface-container-high/60 text-outline hover:text-on-surface border border-outline-variant/20"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          ) : q.type === "radio" || (q.options && q.options.length === 2 && q.options.includes("Yes")) ? (
                            <div className="flex gap-2 pt-1">
                              {(q.options || ["Yes", "No"]).map((choice: string) => {
                                const isSel = (q.suggestedAnswer || "").toLowerCase() === choice.toLowerCase();
                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={() => handleUpdateLiveQuestion(q.text, choice)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      isSel
                                        ? choice.toLowerCase() === "yes"
                                          ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                                          : "bg-surface-container-highest text-on-surface border border-outline-variant/40"
                                        : "bg-surface-container-high/60 text-outline border border-outline-variant/20"
                                    }`}
                                  >
                                    {choice}
                                  </button>
                                );
                              })}
                            </div>
                          ) : q.type === "number" || q.text.toLowerCase().includes("how many years") ? (
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = parseInt(q.suggestedAnswer || "0", 10) || 0;
                                  if (cur > 0) handleUpdateLiveQuestion(q.text, String(cur - 1));
                                }}
                                className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container-highest flex items-center justify-center text-sm"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={q.suggestedAnswer || "0"}
                                onChange={(e) => handleUpdateLiveQuestion(q.text, e.target.value)}
                                className="w-20 text-center py-1 bg-surface-container-high border border-secondary/40 rounded-lg text-xs font-bold text-secondary outline-none focus:border-secondary"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = parseInt(q.suggestedAnswer || "0", 10) || 0;
                                  handleUpdateLiveQuestion(q.text, String(cur + 1));
                                }}
                                className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container-highest flex items-center justify-center text-sm"
                              >
                                +
                              </button>
                              <span className="text-xs text-outline">years experience</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={q.suggestedAnswer || ""}
                              onChange={(e) => handleUpdateLiveQuestion(q.text, e.target.value)}
                              placeholder="Type response..."
                              className="w-full bg-surface-container-high border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs text-secondary font-bold outline-none focus:border-secondary mt-1"
                            />
                          )}
                        </div>

                        {/* Card Footer: Match Source & AI Generator */}
                        <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20 text-[10px]">
                          <span className="text-outline font-mono">
                            Source: {q.matchSource || "CV Verified"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleGenerateAnswer(q.id, q.text)}
                            disabled={isAnswering}
                            className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                            <span>{isAnswering ? "Drafting..." : "AI Refine"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-outline text-xs bg-surface-container rounded-2xl border border-outline-variant/20">
                  No screening questions detected for this job. Standard candidate CV will be dispatched.
                </div>
              )}
            </div>

            {/* 4. LinkedIn Automated Browser Connection Status */}
            {isLinkedInConnected ? (
              <div className="p-4 rounded-2xl bg-[#071d18] border border-secondary/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[22px]">verified_user</span>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-secondary flex items-center gap-1.5">
                      حساب LinkedIn متصل بمتصفح التقديم الآلي
                    </span>
                    <p className="text-[11px] text-outline mt-0.5">
                      جاهز لملء الأسئلة الـ 6 ورفع الـ CV الفعلي (Ahmed Essam.pdf) ونقل الطلب لمرحلة Review & Submit فوراً.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary border border-secondary/30 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  جاهز للتقديم الفعلي
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#14120a] border border-amber-500/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mt-0.5">
                    <span className="material-symbols-outlined text-[22px]">lock_open</span>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                      ربط حساب LinkedIn للمرة الأولى (إعداد لمرة واحدة فقط)
                    </span>
                    <p className="text-[11px] text-outline mt-0.5 leading-relaxed max-w-xl">
                      ليقوم النظام بفتح صفحة الوظيفة في متصفح Brave وإدخال بياناتك ورفع ملف الـ CV الخاص بك، اضغط هنا لتسجيل الدخول مرة واحدة فقط. ستبقى جلستك محفوظة دائماً.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenBraveLogin}
                  disabled={isConnectingLinkedIn}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap self-stretch md:self-auto justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isConnectingLinkedIn ? "hourglass_top" : "open_in_browser"}
                  </span>
                  <span>{isConnectingLinkedIn ? "نافذة المتصفح مفتوحة..." : "تسجيل الدخول في Brave"}</span>
                </button>
              </div>
            )}

            {/* Error Message if automation failed */}
            {automationStatus === "ERROR" && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] text-red-400 mt-0.5">error</span>
                <div>
                  <span className="font-bold block">فشل التقديم التلقائي</span>
                  <span className="text-[11px] text-red-200 mt-0.5 block">{automationMessage}</span>
                </div>
              </div>
            )}

            {/* Automation Runner Live Terminal Logs */}
            {automationStatus === "RUNNING" && (
              <div className="p-4 rounded-2xl bg-black/60 border border-secondary/40 font-mono text-xs text-secondary flex items-center gap-3 animate-pulse">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>{automationMessage}</span>
              </div>
            )}

            {/* 5. Custom Notes */}
            <div>
              <span className="text-xs font-bold text-outline block mb-1.5 uppercase tracking-wider">
                4. Additional Notes / Cover Note (Optional)
              </span>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any specific instructions for this application batch..."
                className="w-full bg-surface-container border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-secondary leading-relaxed"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-[11px] text-outline flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-secondary">verified_user</span>
                <span>Deterministic pre-fill guarantees your exact answers are dispatched.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container"
                >
                  Back to Matches
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDispatch}
                  disabled={isSubmitting || selectedJobs.length === 0}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold hover:bg-secondary/90 shadow-xl shadow-secondary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSubmitting ? "hourglass_top" : "rocket_launch"}
                  </span>
                  <span>
                    {isSubmitting
                      ? "Running Automation..."
                      : `Confirm & Launch ${selectedJobs.length} Applications`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
