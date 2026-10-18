import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          profile: {
            include: {
              skills: { include: { skill: true } },
              experiences: { orderBy: { startDate: "desc" } },
              educations: true,
            },
          },
        },
      });
    }

    if (!user || !user.profile) {
      return NextResponse.json({ error: "Profile not found. Please create a profile first." }, { status: 400 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {}

    const { questionText, questionKey } = body || {};

    const p = user.profile;
    const skillsList = p.skills.map((s: any) => s.skillName).join(", ");
    const expSummary = p.experiences
      .map((e: any) => `${e.role} at ${e.company} (${e.startDate} to ${e.isCurrent ? "Present" : e.endDate}): ${e.description || ""}`)
      .join("\n");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,
      },
    });

    if (questionText) {
      // Generate answer for this specific screening question
      const singlePrompt = `
You are an expert career advisor and ATS application specialist.
Based strictly on this candidate's verified profile and work experience, draft a direct, professional, metric-grounded answer for this specific job application question.

CANDIDATE PROFILE:
Name: ${user.name}
Headline: ${p.headline || "Data Analyst"}
Target Role: ${p.targetRole || "Data Analyst"}
Location: ${p.location || "Cairo, Egypt"}
Phone: ${p.phoneNumber || "+20 114 230 6520"}
Skills: ${skillsList || "Power BI, Python, SQL, Excel VBA, Dash, Data Modeling"}
Work History:
${expSummary || "Data Analyst at Hire Q for Career Services, Software Specialist at Microsys, Data Automation Specialist at Jewel El Nasr Hotel."}

QUESTION TO ANSWER:
"${questionText}"

RULES:
- Answer directly and concisely (1 to 3 sentences maximum, or a single number/choice if the question asks for years or Yes/No).
- Ground the answer strictly in the candidate's actual work history and skills provided above.
- Do not add conversational fluff like "Here is your answer:". Return ONLY the answer text.
`;
      const res = await model.generateContent(singlePrompt);
      const answer = res.response.text().trim();
      return NextResponse.json({
        success: true,
        questionKey: questionKey || "custom",
        questionText,
        answer,
      });
    }

    const prompt = `
You are an expert career advisor and ATS application specialist.
Based strictly on this candidate's verified profile and work experience, draft 4 concise, impactful, metric-grounded answers for standard ATS screening questions.

CANDIDATE PROFILE:
Name: ${user.name}
Headline: ${p.headline || "Data Professional"}
Target Role: ${p.targetRole || "Data Analyst"}
Location: ${p.location || "Cairo, Egypt"}
Skills: ${skillsList || "Python, SQL, PowerBI, Data Modeling"}
Work History:
${expSummary || "Hands-on data analytics and pipeline automation experience."}

REQUIRED QUESTIONS TO ANSWER:
1. proudest_achievement: "Please describe an achievement in your career that you're proud of (3-4 sentences with real metrics)."
2. why_interested_in_position: "What makes you interested in this position? (2-3 sentences connecting background to impact)."
3. recent_relevant_experience: "Please describe your recent and relevant experience for this role. (2-3 sentences highlighting tools and results)."
4. what_makes_you_good_employee: "What makes you a good employee and team contributor? (2 sentences focusing on ownership and communication)."

RULES:
- Ground answers strictly in the candidate's actual skills and roles provided above.
- Never invent fictitious companies or degrees not in the profile.
- Sound professional, confident, and direct.

Return strictly JSON matching:
{
  "proudest_achievement": string,
  "why_interested_in_position": string,
  "recent_relevant_experience": string,
  "what_makes_you_good_employee": string
}
`;

    const jsonModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const result = await jsonModel.generateContent(prompt);
    const text = result.response.text();
    const generated = JSON.parse(text);

    return NextResponse.json({
      success: true,
      message: "Generated tailored answers based on your actual profile and experience",
      answers: generated,
    });
  } catch (error: any) {
    console.error("Vault AI generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate answers" }, { status: 500 });
  }
}
