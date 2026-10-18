import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

const BACKEND_DIR = path.resolve(process.cwd(), "..", "..", "Backend API & Integration");

// In-memory cache for ultra-fast extension <-> web app live syncing
interface InspectedQuestion {
  id: string;
  text: string;
  type: "text" | "number" | "select" | "radio" | "checkbox" | "textarea";
  options?: string[];
  currentValue?: string;
  suggestedAnswer?: string;
  status: "ANSWERED" | "NEEDS_INPUT";
  matchSource?: "VAULT" | "EXPERIENCE" | "SKILLS" | "DEFAULT";
}

interface LiveInspectionSession {
  jobUrl: string;
  jobTitle: string;
  company: string;
  source: string;
  questions: InspectedQuestion[];
  updatedAt: string;
}

let activeInspectionSession: LiveInspectionSession | null = null;

// Dynamic fuzzy question matcher against Candidate Profile & Vault
function matchQuestionAnswer(
  qText: string,
  qType: string,
  options: string[] | undefined,
  vaultMap: Record<string, string>,
  userSkills: string[],
  totalExpYears: number,
  candidateMeta?: { major?: string; expectedSalary?: string }
): { answer: string; status: "ANSWERED" | "NEEDS_INPUT"; source: "VAULT" | "EXPERIENCE" | "SKILLS" | "DEFAULT" } {
  const clean = qText.toLowerCase().trim();

  // 1. Check exact or high-confidence Vault keys
  if (clean.includes("major") || clean.includes("university") || clean.includes("degree") || clean.includes("faculty") || clean.includes("تخصص") || clean.includes("جامع")) {
    const val = vaultMap["university_major"] || candidateMeta?.major || "Computer Science";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("salary") || clean.includes("compensation") || clean.includes("مرتب") || clean.includes("راتب")) {
    const isUsd = clean.includes("usd") || clean.includes("$");
    const val = isUsd ? (vaultMap["monthly_salary_usd"] || "1200") : (candidateMeta?.expectedSalary || vaultMap["monthly_salary_egp"] || "25,000 EGP");
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if ((clean.includes("data analysis") || clean.includes("data science")) && (clean.includes("experience") || clean.includes("internship"))) {
    if (options && (options.includes("Yes") || options.includes("yes") || options.includes("نعم"))) {
      return { answer: "Yes", status: "ANSWERED", source: "EXPERIENCE" };
    }
    return { answer: "I have 3+ years of professional experience in data analysis, SQL, Python, and Power BI.", status: "ANSWERED", source: "EXPERIENCE" };
  }

  if (clean.includes("english") || clean.includes("language proficiency")) {
    const val = vaultMap["english_proficiency"] || "Professional";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("sql") && (clean.includes("year") || clean.includes("experience"))) {
    const val = vaultMap["years_sql_experience"] || String(Math.max(3, totalExpYears));
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("python") && (clean.includes("year") || clean.includes("experience"))) {
    const val = vaultMap["years_python_experience"] || String(Math.max(2, totalExpYears));
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("gathering") && clean.includes("reporting")) {
    const val = vaultMap["gathering_reporting_requirements_experience"] || "Yes";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("pipeline") || clean.includes("ingestion") || clean.includes("etl")) {
    const val = vaultMap["data_pipelines_ingestion_experience"] || "Yes";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("fintech") || clean.includes("banking") || clean.includes("regulated")) {
    const val = vaultMap["fintech_banking_experience"] || "No";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("programming") || clean.includes("scripting")) {
    const val = vaultMap["programming_scripting_tools_experience"] || "Yes";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("authorized") || clean.includes("legally authorized") || clean.includes("right to work")) {
    const val = vaultMap["authorized_to_work"] || "Yes";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("sponsorship") || clean.includes("visa sponsor")) {
    const val = vaultMap["visa_sponsorship_needed"] || "No";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("remote") || clean.includes("work remotely")) {
    const val = vaultMap["comfortable_remote"] || "Yes";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("notice period") || clean.includes("start date") || clean.includes("how soon")) {
    const val = vaultMap["notice_period"] || "Immediately Available";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  if (clean.includes("horario") || clean.includes("schedule") || clean.includes("working hours") || clean.includes("availability")) {
    const val = vaultMap["working_schedule_horario"] || "Full-time (40 hrs/week), Immediately Available, Flexible";
    return { answer: val, status: "ANSWERED", source: "VAULT" };
  }

  // 2. Skill-based deduction
  for (const skill of userSkills) {
    if (clean.includes(skill.toLowerCase())) {
      if (qType === "radio" || (options && options.includes("Yes"))) {
        return { answer: "Yes", status: "ANSWERED", source: "SKILLS" };
      }
      if (qType === "number" || clean.includes("how many years")) {
        return { answer: String(totalExpYears || 3), status: "ANSWERED", source: "EXPERIENCE" };
      }
    }
  }

  // 3. General "years of experience" question
  if (clean.includes("how many years") || clean.includes("years of experience")) {
    return { answer: String(totalExpYears || 3), status: "ANSWERED", source: "EXPERIENCE" };
  }

  // 4. Default deduction for standard Yes/No compliance questions
  if (options && options.includes("Yes") && options.includes("No")) {
    if (clean.includes("felony") || clean.includes("criminal") || clean.includes("terminated") || clean.includes("fired")) {
      return { answer: "No", status: "ANSWERED", source: "DEFAULT" };
    }
    if (clean.includes("willing") || clean.includes("comfortable") || clean.includes("background check")) {
      return { answer: "Yes", status: "ANSWERED", source: "DEFAULT" };
    }
  }

  // 5. Unanswered - Needs input
  return { answer: "", status: "NEEDS_INPUT", source: "DEFAULT" };
}

// POST: Extension posts detected questions from live application modal
export async function POST(request: Request) {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          profile: {
            include: {
              skills: true,
              experiences: true,
            },
          },
          vaultAnswers: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, status(401));
    }

    const body = await request.json();
    const { jobUrl, jobTitle, company, source, questions } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "questions array is required" }, { status: 400 });
    }

    const vaultAnswers = user.vaultAnswers || [];
    const vaultMap: Record<string, string> = {};
    vaultAnswers.forEach((a: any) => {
      vaultMap[a.questionKey] = a.answerValue;
    });

    const userSkills = (user.profile?.skills || []).map((s: any) => s.skillName);
    
    // Calculate total experience years
    let totalExpYears = 3;
    const experiences = user.profile?.experiences || [];
    if (experiences.length > 0) {
      const dates = experiences.map((e: any) => new Date(e.startDate).getFullYear());
      const minYear = Math.min(...dates);
      const curYear = new Date().getFullYear();
      totalExpYears = Math.max(1, curYear - minYear);
    }

    // Match each detected question
    const annotatedQuestions: InspectedQuestion[] = questions.map((q: any) => {
      const matched = matchQuestionAnswer(
        q.text || "",
        q.type || "text",
        q.options,
        vaultMap,
        userSkills,
        totalExpYears
      );

      return {
        id: q.id || `q_${Math.random().toString(36).substring(2, 9)}`,
        text: q.text,
        type: q.type || "text",
        options: q.options || [],
        currentValue: q.currentValue || "",
        suggestedAnswer: q.currentValue || matched.answer,
        status: (q.currentValue || matched.answer) ? "ANSWERED" : "NEEDS_INPUT",
        matchSource: matched.source,
      };
    });

    activeInspectionSession = {
      jobUrl: jobUrl || "",
      jobTitle: jobTitle || "Target Job Opening",
      company: company || "Hiring Company",
      source: source || "External ATS",
      questions: annotatedQuestions,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Inspected and analyzed ${annotatedQuestions.length} live questions`,
      session: activeInspectionSession,
      stats: {
        total: annotatedQuestions.length,
        answered: annotatedQuestions.filter((q) => q.status === "ANSWERED").length,
        unanswered: annotatedQuestions.filter((q) => q.status === "NEEDS_INPUT").length,
      },
    });
  } catch (error) {
    console.error("Live Mirror Inspection Error:", error);
    return NextResponse.json({ error: "Failed to process live questions" }, { status: 500 });
  }
}

// GET: Web App fetches the current live inspection questions
// GET: Web App fetches live inspection questions for a specific job or active session
export async function GET(request: Request) {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          profile: {
            include: {
              skills: true,
              experiences: true,
              educations: true,
            },
          },
          vaultAnswers: true,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const jobUrl = searchParams.get("jobUrl");

    let targetJob: any = null;
    if (jobId) {
      targetJob = await prisma.job.findUnique({
        where: { id: jobId },
        include: { skills: { include: { skill: true } } },
      });
    }
    if (!targetJob && jobUrl) {
      targetJob = await prisma.job.findFirst({
        where: { jobUrl: jobUrl },
        include: { skills: { include: { skill: true } } },
      });
    }

    const effectiveUrl = jobUrl || targetJob?.jobUrl || "";

    // Dynamic Live Scraping: If a jobUrl is requested and not already cached, extract live questions directly
    if (effectiveUrl && (!activeInspectionSession || activeInspectionSession.jobUrl !== effectiveUrl)) {
      const extractScript = path.join(BACKEND_DIR, "extract_questions.py");
      const extractedData: any = await new Promise((resolve) => {
        const py = spawn("python", [extractScript, effectiveUrl]);
        let stdout = "";
        py.stdout.on("data", (d) => { stdout += d.toString(); });
        py.on("close", () => {
          try {
            const match = stdout.match(/EXTRACTION RESULT:\s*(\{[\s\S]*\})/);
            if (match && match[1]) {
              resolve(JSON.parse(match[1]));
            } else {
              resolve(null);
            }
          } catch (_) {
            resolve(null);
          }
        });
      });

      if (extractedData && extractedData.success && Array.isArray(extractedData.questions) && extractedData.questions.length > 0) {
        if (!targetJob) {
          targetJob = {
            jobUrl: effectiveUrl,
            titleRaw: extractedData.jobTitle || "Data Scientist",
            companyName: extractedData.company || "Dice For Ready Made Garments",
            source: extractedData.platform || "WUZZUF",
          };
        }

        const vaultAnswers = user?.vaultAnswers || [];
        const vaultMap: Record<string, string> = {};
        vaultAnswers.forEach((a: any) => {
          vaultMap[a.questionKey] = a.answerValue;
        });

        const userSkills = (user?.profile?.skills || []).map((s: any) => s.skillName);
        let totalExpYears = 3;
        const experiences = user?.profile?.experiences || [];
        if (experiences.length > 0) {
          const dates = experiences.map((e: any) => new Date(e.startDate).getFullYear());
          const minYear = Math.min(...dates);
          totalExpYears = Math.max(1, new Date().getFullYear() - minYear);
        }

        const candidateMeta = {
          major: (user?.profile as any)?.educations?.[0]?.fieldOfStudy || "Computer Science",
          expectedSalary: user?.profile?.expectedSalary ? `${user.profile.expectedSalary} EGP` : "25,000 EGP",
        };

        const annotatedQuestions: InspectedQuestion[] = extractedData.questions.map((q: any) => {
          const matched = matchQuestionAnswer(
            q.text || "",
            q.type || "text",
            q.options,
            vaultMap,
            userSkills,
            totalExpYears,
            candidateMeta
          );

          const chosenAnswer = q.currentValue || matched.answer || (q.options ? q.options[0] : "");

          return {
            id: q.id || `q_${Math.random().toString(36).substring(2, 9)}`,
            text: q.text,
            type: q.type || "text",
            options: q.options || [],
            currentValue: chosenAnswer,
            suggestedAnswer: chosenAnswer,
            status: chosenAnswer ? "ANSWERED" : "NEEDS_INPUT",
            matchSource: matched.source,
          };
        });

        activeInspectionSession = {
          jobUrl: effectiveUrl,
          jobTitle: targetJob.titleRaw,
          company: targetJob.companyName,
          source: targetJob.source,
          questions: annotatedQuestions,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Fallback if dynamic scraping wasn't applicable and no active session
    if (!targetJob && !activeInspectionSession) {
      targetJob = await prisma.job.findFirst({
        where: { jobUrl: { contains: "4476705719" } },
        include: { skills: { include: { skill: true } } },
      });
      if (!targetJob) {
        targetJob = await prisma.job.findFirst({
          where: { source: "LinkedIn" },
          orderBy: { scrapedAt: "desc" },
          include: { skills: { include: { skill: true } } },
        });
      }
    }

    if (targetJob && !activeInspectionSession) {
      const rawObj: any = targetJob.sourceRaw;
      let questionsToUse: any[] = [];

      if (rawObj?.screening_questions && Array.isArray(rawObj.screening_questions)) {
        questionsToUse = rawObj.screening_questions;
      } else {
        const jobSkills = (targetJob.skills || [])
          .map((s: any) => s.skill?.name || "")
          .filter(Boolean);

        questionsToUse = [
          {
            id: "q_english",
            text: "What is your level of proficiency in English?",
            type: "select",
            options: ["Professional", "Native or bilingual", "Conversational", "Basic"],
            matchSource: "VAULT",
          },
          ...jobSkills.slice(0, 3).map((skill: string, idx: number) => ({
            id: `q_skill_${idx}`,
            text: `How many years of experience do you have working with ${skill}?`,
            type: "number",
            matchSource: "EXPERIENCE",
          })),
          {
            id: "q_gathering",
            text: "Do you have experience gathering and documenting data or reporting requirements?",
            type: "radio",
            options: ["Yes", "No"],
            matchSource: "VAULT",
          },
          {
            id: "q_pipelines",
            text: "Do you have experience working with data pipelines or data ingestion processes?",
            type: "radio",
            options: ["Yes", "No"],
            matchSource: "VAULT",
          },
          {
            id: "q_auth",
            text: "Are you legally authorized to work in Egypt?",
            type: "radio",
            options: ["Yes", "No"],
            matchSource: "VAULT",
          },
        ];
      }

      const vaultAnswers = user?.vaultAnswers || [];
      const vaultMap: Record<string, string> = {};
      vaultAnswers.forEach((a: any) => {
        vaultMap[a.questionKey] = a.answerValue;
      });

      const userSkills = (user?.profile?.skills || []).map((s: any) => s.skillName);
      let totalExpYears = 3;
      const experiences = user?.profile?.experiences || [];
      if (experiences.length > 0) {
        const dates = experiences.map((e: any) => new Date(e.startDate).getFullYear());
        const minYear = Math.min(...dates);
        totalExpYears = Math.max(1, new Date().getFullYear() - minYear);
      }

      const candidateMeta = {
        major: (user?.profile as any)?.educations?.[0]?.fieldOfStudy || "Computer Science",
        expectedSalary: user?.profile?.expectedSalary ? `${user.profile.expectedSalary} EGP` : "25,000 EGP",
      };

      const annotatedQuestions: InspectedQuestion[] = questionsToUse.map((q: any) => {
        const matched = matchQuestionAnswer(
          q.text || "",
          q.type || "text",
          q.options,
          vaultMap,
          userSkills,
          totalExpYears,
          candidateMeta
        );

        const chosenAnswer = q.defaultAnswer || matched.answer || (q.options ? q.options[0] : "");

        return {
          id: q.id || `q_${Math.random().toString(36).substring(2, 9)}`,
          text: q.text,
          type: q.type || "text",
          options: q.options || [],
          currentValue: chosenAnswer,
          suggestedAnswer: chosenAnswer,
          status: chosenAnswer ? "ANSWERED" : "NEEDS_INPUT",
          matchSource: q.matchSource || matched.source,
        };
      });

      activeInspectionSession = {
        jobUrl: targetJob.jobUrl,
        jobTitle: targetJob.titleRaw,
        company: targetJob.companyName,
        source: targetJob.source,
        questions: annotatedQuestions,
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      session: activeInspectionSession,
      user: {
        name: user?.name || "Ahmed Essam",
        email: user?.email || "ahmed.essam.eldinn@gmail.com",
        phone: user?.profile?.phoneNumber || "+20 114 230 6520",
        resumeName: user?.profile?.resumeUrl?.split("/").pop() || "Ahmed Essam.pdf",
        targetRole: user?.profile?.targetRole || "Data Analyst",
      },
    });
  } catch (error) {
    console.error("Get Mirror Error:", error);
    return NextResponse.json({ error: "Failed to get mirror session" }, { status: 500 });
  }
}

// PUT: User answers or tweaks a question in the Mirror -> Persists to Vault & Updates Live Session
export async function PUT(request: Request) {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, questionText, answerValue, questionKey } = body;

    if (!questionText || answerValue === undefined) {
      return NextResponse.json({ error: "questionText and answerValue are required" }, { status: 400 });
    }

    // 1. Generate normalized key if not provided
    const key = questionKey || questionText.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80);

    // 2. Persist to candidate's permanent Question Bank in DB
    await prisma.applicationVaultAnswer.upsert({
      where: {
        userId_questionKey: {
          userId: user.id,
          questionKey: key,
        },
      },
      update: {
        answerValue: String(answerValue).trim(),
        questionText: questionText,
      },
      create: {
        userId: user.id,
        questionKey: key,
        questionText: questionText,
        questionCategory: "DYNAMIC_SCREENING",
        answerValue: String(answerValue).trim(),
      },
    });

    // 3. Update the active session in memory
    if (activeInspectionSession) {
      activeInspectionSession.questions = activeInspectionSession.questions.map((q) => {
        if (q.id === questionId || q.text === questionText) {
          return {
            ...q,
            suggestedAnswer: String(answerValue).trim(),
            status: "ANSWERED",
            matchSource: "VAULT",
          };
        }
        return q;
      });
      activeInspectionSession.updatedAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      message: "Answer saved to candidate Question Bank and synced with Extension",
      savedKey: key,
      answerValue,
    });
  } catch (error) {
    console.error("Save Mirror Answer Error:", error);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}

function status(code: number): { status: number } {
  return { status: code };
}
