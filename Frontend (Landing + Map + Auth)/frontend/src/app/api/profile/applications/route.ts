import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper to get or create demo user
async function resolveUser() {
  let user: any = await getCurrentUserFromCookie();
  if (!user || !user.profile) {
    user = await prisma.user.findFirst({
      include: {
        profile: {
          include: {
            skills: { include: { skill: true } },
            experiences: { orderBy: { startDate: "desc" } },
            educations: true,
          },
        },
        vaultAnswers: true,
      },
    });
  }
  return user;
}

// Helper to build realistic tailored screening questions from profile & vault
function buildScreeningQuestions(job: any, profile: any, vaultAnswers: any[] = []) {
  const p = profile || {};
  const skillsList = p.skills?.map((s: any) => s.skillName || s.skill?.name).filter(Boolean) || [];
  const topSkillsStr = skillsList.slice(0, 4).join(", ") || "Full Stack & Data Engineering";
  
  // Calculate approximate years of experience
  const experiences = p.experiences || [];
  const yearsExp = Math.max(
    3,
    Math.round(
      experiences.reduce((acc: number, exp: any) => {
        const start = exp.startDate ? new Date(exp.startDate).getTime() : Date.now();
        const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
        return acc + Math.max(0, (end - start) / (1000 * 60 * 60 * 24 * 365.25));
      }, 0)
    )
  );

  const targetSalary = p.expectedSalary
    ? `${Number(p.expectedSalary).toLocaleString()} EGP gross/month`
    : "45,000 - 65,000 EGP gross/month";

  const workPref = p.workModePref || job.workType || "Hybrid / Remote";
  const locationPref = p.location || "Cairo, Egypt";

  // Check vault for custom answers if user already answered
  const stackVault = vaultAnswers.find((v) => v.questionKey === "TECH_STACK" || v.questionKey === "PRIMARY_EXPERIENCE");
  const salaryVault = vaultAnswers.find((v) => v.questionKey === "SALARY_EXPECTATION");

  return [
    {
      id: "q1",
      q: `What is your primary engineering stack and years of production experience relevant to "${job.titleRaw || "this role"}"?`,
      aiAnswer: stackVault?.answerValue || `${yearsExp}+ years of proven production experience in Egypt specializing in ${topSkillsStr}. Successfully delivered resilient systems and automated workflows.`,
      source: stackVault ? "Application Vault" : "Vault & Verified CV",
      regenerating: false,
    },
    {
      id: "q2",
      q: `Are you comfortable with the work arrangements (${workPref}) based in ${locationPref}?`,
      aiAnswer: `Yes, completely comfortable with ${workPref} arrangements in ${locationPref} with a high-speed fiber connection and flexible schedule.`,
      source: "Application Vault",
      regenerating: false,
    },
    {
      id: "q3",
      q: "What is your target monthly gross salary expectation in Egyptian Pounds (EGP)?",
      aiAnswer: salaryVault?.answerValue || `${targetSalary}, negotiable based on comprehensive company benefits and allowances.`,
      source: "Salary Preference",
      regenerating: false,
    },
  ];
}

// GET: Fetch all user's job applications
export async function GET() {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      include: {
        job: {
          select: {
            id: true,
            titleRaw: true,
            companyName: true,
            locationRaw: true,
            source: true,
            jobUrl: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            workType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = applications.map((app) => {
      const subData: any = app.submissionData || {};
      const questions = Array.isArray(subData.questions)
        ? subData.questions
        : buildScreeningQuestions(app.job, user.profile, user.vaultAnswers);

      return {
        id: app.id,
        jobId: app.jobId,
        title: app.job?.titleRaw || "Job Opening",
        company: app.job?.companyName || "Enterprise Corp",
        location: app.job?.locationRaw || "Egypt",
        source: app.job?.source || "Wuzzuf",
        url: app.job?.jobUrl || "#",
        status: app.status || "SCREENING_ACTIVE",
        appliedAt: app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Today",
        matchScore: subData.matchScore || 92,
        isConfirmed: app.status === "CONFIRMED_AND_SYNCED",
        questions,
      };
    });

    return NextResponse.json({
      success: true,
      applications: formatted,
    });
  } catch (error) {
    console.error("Fetch Applications Error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

// POST: Batch or single apply to jobs
export async function POST(request: Request) {
  try {
    const user = await resolveUser();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, jobIds, matchScores } = body;

    const targetJobIds: string[] = [];
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      targetJobIds.push(...jobIds);
    } else if (jobId) {
      targetJobIds.push(jobId);
    }

    if (targetJobIds.length === 0) {
      return NextResponse.json({ error: "No job IDs specified for application" }, { status: 400 });
    }

    // Fetch jobs from database
    const jobs = await prisma.job.findMany({
      where: { id: { in: targetJobIds } },
    });

    const createdOrUpdated = [];

    for (const job of jobs) {
      const matchScore = (matchScores && matchScores[job.id]) || 92;
      const questions = buildScreeningQuestions(job, user.profile, user.vaultAnswers);

      const submissionData = {
        matchScore,
        questions,
        appliedVia: "AI Auto-Apply",
      };

      // Upsert application
      const existing = await prisma.jobApplication.findFirst({
        where: {
          userId: user.id,
          jobId: job.id,
        },
      });

      if (existing) {
        const updated = await prisma.jobApplication.update({
          where: { id: existing.id },
          data: {
            status: "SCREENING_ACTIVE",
            hasAiFields: true,
            submissionData,
            submittedAt: new Date(),
          },
        });
        createdOrUpdated.push(updated);
      } else {
        const created = await prisma.jobApplication.create({
          data: {
            userId: user.id,
            jobId: job.id,
            status: "SCREENING_ACTIVE",
            hasAiFields: true,
            submissionData,
            submittedAt: new Date(),
          },
        });
        createdOrUpdated.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${createdOrUpdated.length} AI auto-applications`,
      count: createdOrUpdated.length,
    });
  } catch (error) {
    console.error("Apply Jobs Error:", error);
    return NextResponse.json({ error: "Failed to apply to jobs" }, { status: 500 });
  }
}

// PUT: Confirm application or update answers
export async function PUT(request: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { action, applicationId, qId, newAnswer } = body;

    // Action 1: Confirm and sync ALL applications
    if (action === "CONFIRM_ALL") {
      await prisma.jobApplication.updateMany({
        where: { userId: user.id },
        data: {
          status: "CONFIRMED_AND_SYNCED",
        },
      });
      return NextResponse.json({ success: true, message: "All applications confirmed and synced" });
    }

    // Action 2: Confirm single application
    if (action === "CONFIRM_ONE" && applicationId) {
      const updated = await prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status: "CONFIRMED_AND_SYNCED" },
      });
      return NextResponse.json({ success: true, application: updated });
    }

    // Action 3: Update an individual question's answer in submissionData
    if (action === "UPDATE_ANSWER" && applicationId && qId) {
      const app = await prisma.jobApplication.findUnique({
        where: { id: applicationId },
      });

      if (!app) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      const subData: any = app.submissionData || {};
      const questions: any[] = Array.isArray(subData.questions) ? [...subData.questions] : [];

      const targetQ = questions.find((q) => q.id === qId);
      if (targetQ) {
        targetQ.aiAnswer = newAnswer;
      }

      const updated = await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          submissionData: {
            ...subData,
            questions,
          },
        },
      });

      return NextResponse.json({ success: true, application: updated });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error) {
    console.error("Update Application Error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
