"use client";
import React, { useState, useRef } from "react";

export interface ParsedResumeData {
  name?: string;
  headline?: string;
  bio?: string;
  skills: string[];
  experiences: {
    role: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string | null;
    isCurrent: boolean;
    description: string;
  }[];
  educations: {
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startYear?: number | null;
    endYear?: number | null;
  }[];
}

interface ResumeSectionParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export default function ResumeSectionParserModal({
  isOpen,
  onClose,
  onProfileUpdated,
}: ResumeSectionParserModalProps) {
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResumeData | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleParse = async () => {
    setIsParsing(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      let res;
      if (inputMode === "file") {
        if (!selectedFile) {
          setErrorMessage("Please select a resume file (PDF or DOCX)");
          setIsParsing(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        res = await fetch("/api/profile/resume/parse", {
          method: "POST",
          body: formData,
        });
      } else {
        if (!rawText.trim()) {
          setErrorMessage("Please paste your resume text");
          setIsParsing(false);
          return;
        }

        res = await fetch("/api/profile/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse resume");
      }

      setParsed(data.parsed);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to parse resume. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    if (!parsed) return;
    setParsed({
      ...parsed,
      skills: parsed.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleApplyToProfile = async () => {
    if (!parsed) return;
    setIsApplying(true);
    setFeedback(null);

    try {
      // 1. Update basic profile info
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: parsed.headline,
          bio: parsed.bio,
          targetRole: parsed.headline || undefined,
        }),
      });

      // 2. Add verified skills
      for (const skill of parsed.skills.slice(0, 25)) {
        try {
          await fetch("/api/profile/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ skillName: skill }),
          });
        } catch (_) {}
      }

      // 3. Add work experiences
      for (const exp of parsed.experiences) {
        try {
          await fetch("/api/profile/experience", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exp),
          });
        } catch (_) {}
      }

      // 4. Add educations
      for (const edu of parsed.educations) {
        try {
          await fetch("/api/profile/education", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(edu),
          });
        } catch (_) {}
      }

      setFeedback("Profile updated successfully from resume!");
      setTimeout(() => {
        onProfileUpdated();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to update profile from resume.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0E1626] border border-secondary/40 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl animate-in fade-in duration-200 my-8">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-outline-variant/20 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                Smart Resume Parser
              </span>
              <span className="text-[11px] text-outline font-medium">PDF Upload & AI Section Extractor</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface">
              Import Verified Data from Resume
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Select your resume PDF directly. The parser automatically structures your Experience, Education, and Verified Technical Skills without manual copy-pasting.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-highest text-outline hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Input Mode Selector & Upload Area */}
        {!parsed ? (
          <div className="space-y-5">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-3">
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  inputMode === "file"
                    ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                    : "bg-surface-container hover:bg-surface-container-highest text-outline"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Select PDF File</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  inputMode === "text"
                    ? "bg-secondary text-on-secondary shadow-md shadow-secondary/20"
                    : "bg-surface-container hover:bg-surface-container-highest text-outline"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">text_fields</span>
                <span>Paste Text</span>
              </button>
            </div>

            {/* Mode 1: File Upload */}
            {inputMode === "file" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-secondary/40 hover:border-secondary bg-surface-container/40 hover:bg-surface-container/70 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform mb-3 shadow-lg">
                  <span className="material-symbols-outlined text-[32px]">
                    {selectedFile ? "task" : "cloud_upload"}
                  </span>
                </div>
                {selectedFile ? (
                  <div>
                    <span className="text-sm font-bold text-on-surface block">{selectedFile.name}</span>
                    <span className="text-[11px] text-secondary font-semibold mt-1 block">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                    </span>
                    <span className="text-[10px] text-outline mt-1 block">Click to choose another file</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-bold text-on-surface block">
                      Click to choose or drag & drop your Resume PDF
                    </span>
                    <span className="text-xs text-outline mt-1 block">Supports .pdf, .docx, .txt (up to 10MB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Paste Raw Text */}
            {inputMode === "text" && (
              <div>
                <textarea
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the full text of your resume here..."
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-2xl p-4 text-xs font-mono text-on-surface outline-none focus:border-secondary leading-relaxed custom-scrollbar"
                />
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleParse}
                disabled={isParsing || (inputMode === "file" && !selectedFile) || (inputMode === "text" && !rawText.trim())}
                className="px-6 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold hover:bg-secondary/90 shadow-lg shadow-secondary/20 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isParsing ? "sync" : "psychology"}
                </span>
                <span>{isParsing ? "Analyzing & Structuring Resume..." : "Extract Profile Sections"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Parsed Structure Preview */
          <div className="space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2">
            {/* Extracted Headline & Bio */}
            <div className="p-4 rounded-2xl bg-surface-container border border-secondary/30 space-y-2">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                Extracted Summary & Headline
              </span>
              <p className="text-xs text-on-surface font-semibold">{parsed.headline || parsed.name || "Candidate"}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed italic">{parsed.bio}</p>
            </div>

            {/* Verified Skills */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                  Verified Technical Skills ({parsed.skills.length})
                </span>
                <span className="text-[10px] text-outline">Click &apos;×&apos; to remove any skill</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsed.skills.map((sk) => (
                  <span
                    key={sk}
                    className="px-2.5 py-1 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary text-xs font-semibold flex items-center gap-1.5 group"
                  >
                    <span>✓ {sk}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(sk)}
                      className="text-secondary/60 hover:text-error text-xs ml-0.5"
                      title="Remove skill"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Extracted Work Experiences */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-3">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                Extracted Work Experience ({parsed.experiences.length})
              </span>
              {parsed.experiences.length === 0 ? (
                <span className="text-xs text-outline italic">No work experiences detected.</span>
              ) : (
                parsed.experiences.map((exp, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant/20 text-xs">
                    <div className="font-bold text-on-surface">{exp.role} @ {exp.company}</div>
                    <div className="text-[10px] text-secondary mt-0.5">
                      {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate || "Present"} {exp.location ? `• ${exp.location}` : ""}
                    </div>
                    <p className="text-[11px] text-outline mt-1.5 whitespace-pre-line leading-relaxed">{exp.description}</p>
                  </div>
                ))
              )}
            </div>

            {/* Extracted Education */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-2">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                Extracted Education ({parsed.educations.length})
              </span>
              {parsed.educations.length === 0 ? (
                <span className="text-xs text-outline italic">No education entries detected.</span>
              ) : (
                parsed.educations.map((edu, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant/20 text-xs">
                    <div className="font-bold text-on-surface">{edu.degree}</div>
                    <div className="text-[11px] text-secondary font-medium">
                      {edu.institution} {edu.startYear && edu.endYear ? `(${edu.startYear} - ${edu.endYear})` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setParsed(null)}
                className="text-xs text-outline hover:text-on-surface underline"
              >
                ← Back to Upload
              </button>

              <div className="flex items-center gap-3">
                {feedback && <span className="text-xs text-secondary font-bold">{feedback}</span>}
                <button
                  type="button"
                  onClick={handleApplyToProfile}
                  disabled={isApplying}
                  className="px-6 py-2.5 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold hover:bg-secondary/90 shadow-lg shadow-secondary/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isApplying ? "sync" : "check_circle"}
                  </span>
                  <span>{isApplying ? "Populating Profile..." : "Apply Extracted Data to Profile"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
