import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface VaultQuestionDefinition {
  questionKey: string;
  category: "BEHAVIORAL" | "WORK_PREFERENCES" | "TECHNICAL_SCREENING" | "COMPENSATION" | "LOGISTICS" | "EQUAL_OPPORTUNITY" | "BACKGROUND";
  questionText: string;
  type: "text" | "textarea" | "boolean" | "select" | "number";
  options?: string[];
  placeholder?: string;
  helpText?: string;
  defaultAnswer?: string;
}

export const CANONICAL_VAULT_QUESTIONS: VaultQuestionDefinition[] = [
  // 1. BEHAVIORAL & IMPACT ESSAYS
  {
    questionKey: "proudest_achievement",
    category: "BEHAVIORAL",
    questionText: "Please describe an achievement in your career that you're proud of (3-5 sentences).",
    type: "textarea",
    placeholder: "Highlight a real technical challenge you solved, tools used, and measurable results...",
    helpText: "Frequently required by ATS platforms (Pinpoint, Workday, Lever). Keep it grounded in real metrics.",
    defaultAnswer: "At Hire Q for Career Services and Jewel El Nasr Hotel, I automated reporting workflows using Python, SQL, and Excel VBA, cutting manual effort by over 80%. I engineered interactive Power BI dashboards tracking recruitment trends and business KPIs across 5,000+ records, improving decision-making and operational efficiency by 20%."
  },
  {
    questionKey: "why_interested_in_position",
    category: "BEHAVIORAL",
    questionText: "What makes you interested in this position?",
    type: "textarea",
    placeholder: "Explain your motivation and alignment with the company's mission...",
    helpText: "Standard screening question across 90% of job applications.",
    defaultAnswer: "I am passionate about transforming raw business data into actionable insights through Power BI, Python, and SQL. With 2+ years of hands-on experience in data modeling, dashboard automation, and pipeline development, this role aligns with my background in delivering high-impact business intelligence solutions."
  },
  {
    questionKey: "recent_relevant_experience",
    category: "BEHAVIORAL",
    questionText: "Please describe your recent and relevant experience for this role.",
    type: "textarea",
    placeholder: "Summarize recent projects, tools, and technical responsibilities...",
    helpText: "Directly mapped to screening reviews by hiring managers.",
    defaultAnswer: "As a Data Analyst at Hire Q for Career Services and Software Specialist at Microsys, I designed custom Python and SQL workflows to clean ERP datasets, built Power BI executive dashboards with DAX and Power Query, and created automation tools that reduced reporting turnaround by 85%."
  },
  {
    questionKey: "what_makes_you_good_employee",
    category: "BEHAVIORAL",
    questionText: "What makes you a good employee and team contributor?",
    type: "textarea",
    placeholder: "Describe your work ethics, reliability, and teamwork style...",
    helpText: "Assesses cultural fit and professional ownership.",
    defaultAnswer: "I bring strong technical ownership combined with proactive communication. I independently identify pipeline bottlenecks, automate repetitive tasks to save team hours, and translate complex datasets into clear, actionable dashboards for non-technical stakeholders."
  },

  // 2. WORK PREFERENCES & TIMEZONE FLEXIBILITY
  {
    questionKey: "seeking_full_time",
    category: "WORK_PREFERENCES",
    questionText: "Are you looking for a full-time job?",
    type: "boolean",
    options: ["Yes", "No"],
    defaultAnswer: "Yes"
  },
  {
    questionKey: "comfortable_remote",
    category: "WORK_PREFERENCES",
    questionText: "Are you comfortable working remotely?",
    type: "boolean",
    options: ["Yes", "No"],
    defaultAnswer: "Yes"
  },
  {
    questionKey: "est_timezone_overlap",
    category: "WORK_PREFERENCES",
    questionText: "Are you comfortable overlapping with Eastern Standard Time (EST) for 4+ hours daily?",
    type: "boolean",
    options: ["Yes", "No"],
    helpText: "Crucial for US, Canadian, and global remote companies hiring in Egypt.",
    defaultAnswer: "Yes"
  },
  {
    questionKey: "notice_period",
    category: "WORK_PREFERENCES",
    questionText: "What is your notice period / Earliest start date?",
    type: "select",
    options: ["Immediately Available", "2 Weeks", "1 Month", "2 Months"],
    defaultAnswer: "Immediately Available"
  },

  // 3. LOGISTICS & AVAILABILITY
  {
    questionKey: "preplanned_travel_vacation",
    category: "LOGISTICS",
    questionText: "Do you have any pre-planned travel or vacation that we need to work around?",
    type: "text",
    placeholder: "e.g. None, or 1 week in August",
    defaultAnswer: "None"
  },
  {
    questionKey: "how_heard_about_us",
    category: "LOGISTICS",
    questionText: "How did you hear about this company / opening?",
    type: "select",
    options: ["LinkedIn", "Job Board / Wuzzuf", "Company Career Site", "Community Hiring / Referral", "Other"],
    defaultAnswer: "LinkedIn"
  },

  // 4. TECHNICAL & TOOL SCREENING (LinkedIn & ATS Common Questions)
  {
    questionKey: "english_proficiency",
    category: "TECHNICAL_SCREENING",
    questionText: "What is your level of proficiency in English?",
    type: "select",
    options: ["Professional", "Native or bilingual", "Conversational", "Basic"],
    helpText: "Standard LinkedIn Easy Apply and international ATS language screening.",
    defaultAnswer: "Professional"
  },
  {
    questionKey: "years_sql_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "How many years of experience do you have working with SQL?",
    type: "number",
    placeholder: "e.g. 3",
    helpText: "Numeric screening question on LinkedIn and technical job boards.",
    defaultAnswer: "3"
  },
  {
    questionKey: "gathering_reporting_requirements_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "Do you have experience gathering and documenting data or reporting requirements?",
    type: "boolean",
    options: ["Yes", "No"],
    helpText: "Analytics, BI, and engineering role qualification.",
    defaultAnswer: "Yes"
  },
  {
    questionKey: "data_pipelines_ingestion_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "Do you have experience working with data pipelines or data ingestion processes?",
    type: "boolean",
    options: ["Yes", "No"],
    helpText: "Data engineering and ETL pipeline experience.",
    defaultAnswer: "Yes"
  },
  {
    questionKey: "fintech_banking_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "Do you have experience working in fintech, banking, or regulated environments?",
    type: "boolean",
    options: ["Yes", "No"],
    helpText: "Industry-specific compliance screening question.",
    defaultAnswer: "No"
  },
  {
    questionKey: "programming_scripting_tools_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "Do you have experience working with programming or scripting tools?",
    type: "boolean",
    options: ["Yes", "No"],
    helpText: "Python, Bash, JavaScript, or scripting automation screening.",
    defaultAnswer: "Yes"
  },
  {
    questionKey: "years_python_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "How many years of work experience do you have with Python?",
    type: "number",
    placeholder: "e.g. 3",
    defaultAnswer: "3"
  },
  {
    questionKey: "google_sheets_excel_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "Do you have hands-on experience using Google Sheets & Advanced Excel?",
    type: "boolean",
    options: ["Yes", "No"],
    defaultAnswer: "Yes"
  },
  {
    questionKey: "years_of_experience",
    category: "TECHNICAL_SCREENING",
    questionText: "How many years of professional experience do you have in this field?",
    type: "select",
    options: ["Less than 1 Year", "1 - 3 Years", "3 - 5 Years", "5 - 8 Years", "8+ Years"],
    defaultAnswer: "3 - 5 Years"
  },
  {
    questionKey: "authorized_to_work",
    category: "BACKGROUND",
    questionText: "Are you legally authorized to work in your country of residence?",
    type: "boolean",
    options: ["Yes", "No"],
    defaultAnswer: "Yes"
  },
  {
    questionKey: "visa_sponsorship_needed",
    category: "BACKGROUND",
    questionText: "Will you now or in the future require visa sponsorship for employment?",
    type: "boolean",
    options: ["Yes", "No"],
    defaultAnswer: "No"
  },

  // 5. COMPENSATION & SALARY
  {
    questionKey: "monthly_salary_usd",
    category: "COMPENSATION",
    questionText: "Monthly salary expectation in USD (Gross)",
    type: "number",
    placeholder: "e.g. 1200",
    helpText: "Used for international and remote roles.",
    defaultAnswer: "1200"
  },
  {
    questionKey: "monthly_salary_egp",
    category: "COMPENSATION",
    questionText: "Monthly salary expectation in EGP (Net)",
    type: "number",
    placeholder: "e.g. 45000",
    helpText: "Used for Egyptian and local companies.",
    defaultAnswer: "45000"
  },

  // 6. BACKGROUND & LEGAL
  {
    questionKey: "previously_employed_here",
    category: "BACKGROUND",
    questionText: "Have you ever been, or are you currently, employed by this company or a subsidiary?",
    type: "boolean",
    options: ["Yes", "No"],
    defaultAnswer: "No"
  },

  // 7. EQUAL OPPORTUNITY (VOLUNTARY)
  {
    questionKey: "diversity_gender",
    category: "EQUAL_OPPORTUNITY",
    questionText: "Gender Identity (Voluntary Equal Opportunity Disclosure)",
    type: "select",
    options: ["Male", "Female", "Prefer Not To Say"],
    helpText: "Used strictly for demographic compliance on international ATS forms.",
    defaultAnswer: "Male"
  }
];

// GET: Fetch user's vault answers merged with catalog
export async function GET() {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const savedAnswers = await prisma.applicationVaultAnswer.findMany({
      where: { userId: user.id },
    });

    const answerMap = new Map(savedAnswers.map((a) => [a.questionKey, a]));

    const catalogWithAnswers = CANONICAL_VAULT_QUESTIONS.map((q) => {
      const saved = answerMap.get(q.questionKey);
      return {
        ...q,
        answerValue: saved ? saved.answerValue : (q.defaultAnswer || ""),
        isAiGenerated: saved ? saved.isAiGenerated : false,
        isSaved: Boolean(saved),
        updatedAt: saved ? saved.updatedAt : null,
      };
    });

    const answeredCount = catalogWithAnswers.filter((q) => q.answerValue.trim().length > 0).length;
    const totalCount = CANONICAL_VAULT_QUESTIONS.length;
    const completionPercentage = Math.round((answeredCount / totalCount) * 100);

    return NextResponse.json({
      success: true,
      questions: catalogWithAnswers,
      stats: {
        answeredCount,
        totalCount,
        completionPercentage,
        isReadyForAutoApply: completionPercentage >= 80,
      },
    });
  } catch (error) {
    console.error("Get Vault Error:", error);
    return NextResponse.json({ error: "Failed to fetch Application Vault answers" }, { status: 500 });
  }
}

// POST: Batch save or update vault answers
export async function POST(request: Request) {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { answers } = body; // Array of { questionKey, answerValue, isAiGenerated? }

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    const questionDefMap = new Map(CANONICAL_VAULT_QUESTIONS.map((q) => [q.questionKey, q]));

    const operations = answers.map((ans: any) => {
      const def = questionDefMap.get(ans.questionKey);
      const category = def ? def.category : (ans.category || "GENERAL");
      const questionText = def ? def.questionText : (ans.questionText || ans.questionKey);
      const answerVal = String(ans.answerValue ?? "").trim();
      const isAi = Boolean(ans.isAiGenerated);

      return prisma.applicationVaultAnswer.upsert({
        where: {
          userId_questionKey: {
            userId: user.id,
            questionKey: ans.questionKey,
          },
        },
        update: {
          answerValue: answerVal,
          questionCategory: category,
          questionText: questionText,
          isAiGenerated: isAi,
        },
        create: {
          userId: user.id,
          questionKey: ans.questionKey,
          questionCategory: category,
          questionText: questionText,
          answerValue: answerVal,
          isAiGenerated: isAi,
        },
      });
    });

    await prisma.$transaction(operations);

    return NextResponse.json({
      success: true,
      message: "Application Vault answers saved successfully",
      savedCount: operations.length,
    });
  } catch (error) {
    console.error("Save Vault Error:", error);
    return NextResponse.json({ error: "Failed to save Application Vault answers" }, { status: 500 });
  }
}
