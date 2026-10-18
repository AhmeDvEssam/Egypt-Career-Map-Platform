import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ultra-generic soft skills that exist across nearly all industries.
// They receive low weight so they never qualify an unrelated job on their own.
const LOW_SPECIFICITY_SKILLS = new Set([
  "english",
  "arabic",
  "communication",
  "communication skills",
  "microsoft office",
  "computer skills",
  "teamwork",
  "problem solving",
  "time management",
  "presentation skills",
  "interpersonal skills",
  "negotiation",
  "leadership",
  "organization skills",
  "attention to detail",
]);

// Cross-domain skill synonyms and equivalence mappings
const UNIVERSAL_SKILL_SYNONYMS: Record<string, string[]> = {
  // Programming & Software
  programming: ["python", "java", "javascript", "c++", "c#", "scripting", "software engineering"],
  scripting: ["python", "bash", "shell", "vba", "selenium", "automation"],
  frontend: ["react", "vue", "angular", "html", "css", "javascript", "typescript"],
  backend: ["node", "python", "java", "django", "express", "fastapi", "spring"],
  mobile: ["flutter", "react native", "swift", "kotlin", "android", "ios"],

  // Data & BI
  sql: ["mysql", "postgresql", "oracle", "sql server", "microsoft sql server", "database", "rdbms"],
  database: ["sql", "mysql", "postgresql", "mongodb", "oracle db", "database systems"],
  "business intelligence": ["powerbi", "tableau", "dax", "data visualization", "bi tools", "looker"],
  bi: ["powerbi", "tableau", "dax", "data visualization", "bi tools"],
  "data analytics": ["data analysis", "data modeling", "data cleaning", "data wrangling", "analytics"],
  "data analysis": ["data analytics", "data modeling", "data cleaning", "data wrangling", "analytics"],
  "data science": ["python", "pandas", "numpy", "scikit-learn", "machine learning", "ai tools"],
  "machine learning": ["scikit-learn", "tensorflow", "pytorch", "python", "ai tools", "deep learning"],
  excel: ["microsoft excel", "advanced excel", "vba", "spreadsheets"],

  // Design
  "graphic design": ["photoshop", "illustrator", "indesign", "figma", "branding", "visual design"],
  "ui/ux": ["figma", "adobe xd", "wireframing", "prototyping", "user research"],

  // Finance & Accounting
  accounting: ["financial reporting", "general ledger", "bookkeeping", "taxation", "auditing", "erp", "sap"],
  "financial analysis": ["financial modeling", "budgeting", "forecasting", "valuation", "excel"],

  // Marketing & Sales
  "digital marketing": ["seo", "sem", "social media", "content marketing", "google ads", "meta ads"],
  sales: ["lead generation", "b2b sales", "crm", "sales management", "client acquisition"],
};

function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function candidateHasSkill(userSkillsSet: Set<string>, jobSkill: string): boolean {
  const js = jobSkill.toLowerCase().trim();
  if (userSkillsSet.has(js)) return true;

  for (const u of userSkillsSet) {
    if (u === js || u.includes(js) || js.includes(u)) return true;
  }

  for (const [canonical, aliases] of Object.entries(UNIVERSAL_SKILL_SYNONYMS)) {
    if (js.includes(canonical) || canonical.includes(js)) {
      if (aliases.some((a) => userSkillsSet.has(a))) return true;
    }
  }
  return false;
}

export async function GET() {
  try {
    let user = await getCurrentUserFromCookie();

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

    if (!user || !user.profile) {
      return NextResponse.json({ matches: [], message: "No profile found" });
    }

    const profile = user.profile;
    const userSkills = profile.skills.map((s) => s.skillName.toLowerCase());
    const userSkillsSet = new Set(userSkills);
    const targetRole = (profile.targetRole || profile.headline || "").trim();
    const userCategory = profile.category || "";

    // 1. Calculate Candidate Total Years of Experience
    let totalExpYears = 0;
    if (profile.experiences && profile.experiences.length > 0) {
      for (const exp of profile.experiences) {
        const start = new Date(exp.startDate).getTime();
        const end = exp.isCurrent ? Date.now() : exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        if (years > 0) totalExpYears += years;
      }
    }
    totalExpYears = Math.round(totalExpYears * 10) / 10;

    const targetTokens = tokenize(targetRole);

    // 2. STAGE 1: Universal Dynamic Job Fetching (Works for ANY profession)
    // Query 1: Exact Phrase & Normalized Title Matches
    const exactJobsPromise = targetRole
      ? prisma.job.findMany({
          where: {
            status: { in: ["Open", "open", "Active", "active"] },
            OR: [
              { titleRaw: { contains: targetRole, mode: "insensitive" } },
              { titleNormalized: { contains: targetRole, mode: "insensitive" } },
            ],
          },
          take: 250,
          include: { skills: { include: { skill: true } } },
          orderBy: { postedDate: "desc" },
        })
      : Promise.resolve([]);

    // Query 2: All Tokens Intersection (e.g. "Senior Frontend Developer" contains both "frontend" and "developer")
    const tokenJobsPromise =
      targetTokens.length > 1
        ? prisma.job.findMany({
            where: {
              status: { in: ["Open", "open", "Active", "active"] },
              AND: targetTokens.map((t) => ({
                OR: [
                  { titleRaw: { contains: t, mode: "insensitive" } },
                  { titleNormalized: { contains: t, mode: "insensitive" } },
                ],
              })),
            },
            take: 250,
            include: { skills: { include: { skill: true } } },
            orderBy: { postedDate: "desc" },
          })
        : Promise.resolve([]);

    // Query 3: Specific Domain Technical Skills Matches (ignoring ultra-generic stop skills)
    const specificUserSkills = userSkills.filter((s) => !LOW_SPECIFICITY_SKILLS.has(s)).slice(0, 8);
    const skillJobsPromise =
      specificUserSkills.length > 0
        ? prisma.job.findMany({
            where: {
              status: { in: ["Open", "open", "Active", "active"] },
              skills: {
                some: {
                  skill: { name: { in: specificUserSkills, mode: "insensitive" } },
                },
              },
            },
            take: 250,
            include: { skills: { include: { skill: true } } },
            orderBy: { postedDate: "desc" },
          })
        : Promise.resolve([]);

    const [exactJobs, tokenJobs, skillJobs] = await Promise.all([
      exactJobsPromise,
      tokenJobsPromise,
      skillJobsPromise,
    ]);

    // Deduplicate candidate pool
    const jobPoolMap = new Map<string, any>();
    [...exactJobs, ...tokenJobs, ...skillJobs].forEach((job) => jobPoolMap.set(job.id, job));
    const allJobs = Array.from(jobPoolMap.values());

    // 3. STAGE 2: Universal Scoring Engine (Pure Mathematics, Zero Hardcoded Roles)
    const scoredMatches = allJobs
      .map((job) => {
        const jobTitle = (job.titleRaw || "").toLowerCase();
        const targetLower = targetRole.toLowerCase();

        // --- Pillar 1: Dynamic Title & Role Alignment (45% weight) ---
        let titleScore = 0;
        if (targetLower && jobTitle.includes(targetLower)) {
          titleScore = 100;
        } else if (targetTokens.length > 0) {
          const matchedTokens = targetTokens.filter((t) => jobTitle.includes(t));
          const ratio = matchedTokens.length / targetTokens.length;
          if (ratio === 1) {
            titleScore = 95;
          } else if (ratio >= 0.5) {
            titleScore = Math.round(ratio * 85);
          } else if (matchedTokens.length > 0) {
            titleScore = 40;
          }
        }

        // Category fallback if title has no overlap
        if (titleScore === 0 && userCategory && job.jobCategory) {
          if (job.jobCategory.toLowerCase().includes(userCategory.toLowerCase())) {
            titleScore = 50;
          }
        }

        // --- Pillar 2: Dynamic Skills Overlap (40% weight) ---
        const jobSkills = job.skills.map((s: any) => s.skill.name);
        const matchedSkills: string[] = [];
        const missingSkills: string[] = [];
        let matchedWeight = 0;
        let totalWeight = 0;

        jobSkills.forEach((s: string) => {
          const sLower = s.toLowerCase();
          const weight = LOW_SPECIFICITY_SKILLS.has(sLower) ? 0.2 : 1.0;
          totalWeight += weight;

          if (candidateHasSkill(userSkillsSet, s)) {
            matchedSkills.push(s);
            matchedWeight += weight;
          } else {
            missingSkills.push(s);
          }
        });

        let skillsScore = 50;
        if (totalWeight > 0) {
          skillsScore = Math.round((matchedWeight / totalWeight) * 100);
        } else if (titleScore >= 80) {
          skillsScore = 70; // Inferred skills when job doesn't tag skills explicitly
        }

        // UNIVERSAL GATE:
        // A job with ZERO title relation and fewer than 2 specific skills in common is strictly DISQUALIFIED.
        const specificMatches = matchedSkills.filter((s) => !LOW_SPECIFICITY_SKILLS.has(s.toLowerCase()));
        if (titleScore === 0 && specificMatches.length < 2) {
          return null;
        }

        // --- Pillar 3: Dynamic Experience Alignment (15% weight) ---
        let expScore = 80;
        const minExp = job.min_experience ? Number(job.min_experience) : null;
        const maxExp = job.max_experience ? Number(job.max_experience) : null;
        if (minExp !== null) {
          if (totalExpYears >= minExp && (maxExp === null || totalExpYears <= maxExp + 2)) {
            expScore = 100;
          } else if (totalExpYears < minExp) {
            expScore = Math.max(20, Math.round(100 - (minExp - totalExpYears) * 20));
          } else {
            expScore = 80;
          }
        }

        // Final Composite Score
        let finalScore = Math.round(
          titleScore * 0.45 +
          skillsScore * 0.40 +
          expScore * 0.15
        );

        // Exact role matches get minimum floor of 70%
        if (titleScore >= 95) {
          finalScore = Math.max(70, finalScore);
        }

        // Universal threshold
        if (finalScore < 50) return null;

        const rawSource = (job.source || "").trim();
        const detectedSource = (rawSource && rawSource !== "External" && rawSource !== "Scraped")
          ? rawSource
          : (job.jobUrl || "").includes("linkedin.com")
          ? "LinkedIn"
          : (job.jobUrl || "").includes("wuzzuf.net")
          ? "WUZZUF"
          : (job.jobUrl || "").includes("bayt.com")
          ? "Bayt"
          : "Direct Employer";

        return {
          jobId: job.id,
          title: job.titleRaw,
          company: job.companyName,
          location: job.locationRaw,
          workType: job.workType || "Not Specified",
          jobType: job.jobType || "Full Time",
          salary: job.salaryMin && job.salaryMax ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${job.currency || "EGP"}` : null,
          source: detectedSource,
          url: job.jobUrl,
          postedDate: job.postedDate,
          matchScore: Math.min(99, finalScore),
          breakdown: {
            skillsScore,
            titleScore,
            expScore,
            taskScore: 80,
          },
          matchedSkills,
          missingSkills,
          candidateYears: totalExpYears,
        };
      })
      .filter(Boolean);

    // Sort descending by highest match score
    scoredMatches.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      candidate: {
        name: user.name,
        targetRole: profile.targetRole,
        category: profile.category,
        totalExpYears,
        skillsCount: userSkills.length,
      },
      matches: scoredMatches.slice(0, 30),
    });
  } catch (error) {
    console.error("Job match error:", error);
    return NextResponse.json({ matches: [], error: "فشل حساب مطابقة الوظائف" }, { status: 500 });
  }
}
