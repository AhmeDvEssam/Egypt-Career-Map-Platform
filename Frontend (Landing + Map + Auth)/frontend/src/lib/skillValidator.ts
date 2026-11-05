import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Fast Blacklist for vulgarity & spam (English & Arabic)
const VULGAR_WORDS = [
  "متناكة", "متناك", "شرموط", "شرموطة", "عرص", "خرا", "خول", "قحبة", "كس", "زب", "طيز",
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "bastard"
];

const NON_SKILL_WORDS = [
  "bla", "test", "asdf", "qwerty", "aaaa", "lol", "n/a", "none", "nothing",
  "pizza", "food", "eating", "drinking", "walk", "sleep", "watching", "tv", "movie",
  "football", "game", "stuff", "random", "أكل", "شرب", "نوم",
  "كورة", "لعب", "أي حاجة", "تجربة"
];

// Common keyboard row patterns (Latin & Arabic)
const KEYBOARD_PATTERNS = [
  /qwerty/i,
  /asdfgh/i,
  /zxcvbn/i,
  /asdsad/i,
  /sdsad/i,
  /qwert/i,
  /^[ضصثقفغعهخحجدذ]+$/,
  /^[شسيبلاتنمكط]+$/,
  /^[ئءؤرلاىةوزظ]+$/,
  /زوبسيب/i,
  /شسيبل/i,
  /بلاتن/i,
];

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  skillId?: string;
  normalizedName?: string;
  isNew: boolean;
}

export async function validateAndNormalizeSkill(
  rawInput: string,
  userDomain?: string | null
): Promise<ValidationResult> {
  const trimmed = rawInput.trim();

  // =========================================================================
  // LAYER 1: Canonical Database Match & Self-Learning Aliases (0ms latency)
  // =========================================================================
  // 1a. Exact case-insensitive match on canonical skill name
  const existingSkill = await prisma.skill.findFirst({
    where: {
      name: { equals: trimmed, mode: "insensitive" },
    },
  });

  if (existingSkill) {
    // If user's typed variant differs in casing/spelling, record it as an alias so system learns
    if (existingSkill.name !== trimmed) {
      prisma.skill_aliases.upsert({
        where: { alias_name: trimmed },
        update: {},
        create: { alias_name: trimmed, skill_id: existingSkill.id },
      }).catch(() => {});
    }

    return {
      isValid: true,
      skillId: existingSkill.id,
      normalizedName: existingSkill.name,
      isNew: false,
    };
  }

  // 1b. Match in skill_aliases table
  const existingAlias = await prisma.skill_aliases.findFirst({
    where: {
      alias_name: { equals: trimmed, mode: "insensitive" },
    },
    include: { skills: true },
  });

  if (existingAlias && existingAlias.skills) {
    return {
      isValid: true,
      skillId: existingAlias.skills.id,
      normalizedName: existingAlias.skills.name,
      isNew: false,
    };
  }

  // 1c. Fuzzy punctuation normalization (e.g. "data-modeling" -> "Data modeling")
  const sanitized = trimmed.replace(/[-_]/g, " ").replace(/\s+/g, " ");
  if (sanitized !== trimmed) {
    const fuzzySkill = await prisma.skill.findFirst({
      where: { name: { equals: sanitized, mode: "insensitive" } },
    });
    if (fuzzySkill) {
      // Learn this alias
      prisma.skill_aliases.upsert({
        where: { alias_name: trimmed },
        update: {},
        create: { alias_name: trimmed, skill_id: fuzzySkill.id },
      }).catch(() => {});

      return {
        isValid: true,
        skillId: fuzzySkill.id,
        normalizedName: fuzzySkill.name,
        isNew: false,
      };
    }
  }

  // =========================================================================
  // LAYER 2: Fast Pre-Screening Heuristics (Instant local rejection)
  // =========================================================================
  if (!trimmed || trimmed.length < 2) {
    return { isValid: false, reason: "Skill name is too short (min 2 characters)", isNew: false };
  }
  if (trimmed.length > 50) {
    return { isValid: false, reason: "Skill name is too long (max 50 characters)", isNew: false };
  }

  const lower = trimmed.toLowerCase();

  // Check vulgarity
  for (const v of VULGAR_WORDS) {
    if (lower.includes(v)) {
      return { isValid: false, reason: "Inappropriate language detected. Please enter a valid professional skill.", isNew: false };
    }
  }

  // Check non-skill common words
  if (NON_SKILL_WORDS.includes(lower)) {
    return { isValid: false, reason: `"${trimmed}" is not recognized as a professional skill or technology.`, isNew: false };
  }

  // Check repeated characters >= 3 (e.g. "aaaa", "zzzz")
  if (/(.)\1{2,}/.test(trimmed)) {
    return { isValid: false, reason: "Repeated character pattern detected. Please enter a valid skill.", isNew: false };
  }

  // Check repeated rhythmic syllables (e.g. "asdasd", "bababa")
  if (/^(.{2,4})\1{2,}$/i.test(trimmed)) {
    return { isValid: false, reason: "Repetitive keyboard sequence detected.", isNew: false };
  }

  // Check keyboard mash sequences
  for (const pattern of KEYBOARD_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, reason: "Input detected as keyboard mash or gibberish. Please enter a real skill.", isNew: false };
    }
  }

  // Check English words with zero vowels (e.g. "sdfghjkl") for words >= 4 letters
  const isEnglishLettersOnly = /^[a-zA-Z\s]+$/.test(trimmed);
  if (isEnglishLettersOnly && trimmed.length >= 4 && !/[aeiouyAEIOUY]/.test(trimmed)) {
    return { isValid: false, reason: `"${trimmed}" is not a recognized skill or technology.`, isNew: false };
  }

  // Only allow valid professional naming characters: letters, numbers, spaces, plus, hash, dot, slash, hyphen, parentheses
  const validCharsRegex = /^[A-Za-z0-9\u0600-\u06FF\s\+\#\.\/\-\(\)]+$/;
  if (!validCharsRegex.test(trimmed)) {
    return { isValid: false, reason: "Skill contains invalid special characters.", isNew: false };
  }

  // =========================================================================
  // LAYER 3: Strict AI Gatekeeper (Gemini 2.5 Flash)
  // For legitimate new skills not yet indexed in our 19,754 canonical database
  // =========================================================================
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fail closed: Never allow unverified inputs if AI is unavailable
    return {
      isValid: false,
      reason: `"${trimmed}" was not found in our verified skills directory. Please pick from suggested skills.`,
      isNew: false,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert career ontology gatekeeper and skill validator for a professional job market platform.
Your job is to determine whether the submitted term is a REAL, legitimate professional skill, technology, framework, tool, software, methodology, or recognized career credential (in English or Arabic).

Term to validate: "${trimmed}"
Candidate Track / Target Role: "${userDomain || 'General'}"

CRITICAL RULES:
1. REJECT ANY keyboard mash, nonsense, made-up words, or typos (e.g., "ASDSADASD", "زوبسيب", "asdfgh", "qwerty", "lksjdf", "xzzx").
2. REJECT random everyday words, conversational slang, insults, vulgarities, jokes, or general phrases (e.g., "pizza", "sleep", "eating", "bla bla").
3. REJECT vague non-skills that cannot be assessed professionally.
4. ACCEPT legitimate technical and professional skills even if newly emerging, niche, or modern tools (e.g., "LangGraph", "FastAPI", "Prompt Engineering", "dbt", "Kubernetes", "Dash", "Plotly Dash", "Six Sigma", "Financial Modeling", "Scrum Master", "SEO", "إدارة المشاريع", "تحليل البيانات").
5. Note: In tech, data science, and engineering, tool names (like "Dash" for Python dashboards, "Git", "dbt", "Airflow") are legitimate professional technologies!
6. If valid, format it into standard professional casing (e.g., "next.js" -> "Next.js", "langgraph" -> "LangGraph", "dash" -> "Dash (Plotly)").

Respond ONLY with valid JSON:
{
  "isValid": boolean,
  "canonicalName": "Canonical casing if valid, or original if invalid",
  "reason": "Clear, concise 1-sentence English explanation"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    if (!parsed.isValid) {
      return {
        isValid: false,
        reason: parsed.reason || `"${trimmed}" is not recognized as a legitimate professional skill.`,
        isNew: false,
      };
    }

    // AI confirmed it's a real legitimate emerging skill!
    const canonicalName = parsed.canonicalName || trimmed;

    // Check if canonical name matches an existing skill
    const existingCanonical = await prisma.skill.findFirst({
      where: { name: { equals: canonicalName, mode: "insensitive" } },
    });

    if (existingCanonical) {
      // Register trimmed as alias for continuous learning
      if (trimmed.toLowerCase() !== existingCanonical.name.toLowerCase()) {
        prisma.skill_aliases.upsert({
          where: { alias_name: trimmed },
          update: {},
          create: { alias_name: trimmed, skill_id: existingCanonical.id },
        }).catch(() => {});
      }

      return {
        isValid: true,
        skillId: existingCanonical.id,
        normalizedName: existingCanonical.name,
        isNew: false,
      };
    }

    // Save as newly verified skill in platform ontology
    const newSkill = await prisma.skill.create({
      data: {
        name: canonicalName,
        domain: userDomain || "Specialized & Emerging Skills",
        sub_category: "User Added (Verified)",
        normalized_name: canonicalName.toLowerCase(),
      },
    });

    // Also add trimmed variation as alias if different
    if (trimmed.toLowerCase() !== canonicalName.toLowerCase()) {
      await prisma.skill_aliases.create({
        data: {
          alias_name: trimmed,
          skill_id: newSkill.id,
        },
      }).catch(() => {});
    }

    return {
      isValid: true,
      skillId: newSkill.id,
      normalizedName: newSkill.name,
      isNew: true,
    };
  } catch (error: any) {
    console.error("AI Gatekeeper error:", error?.message || error);
    return {
      isValid: false,
      reason: `"${trimmed}" is not recognized. Please choose from suggested verified skills.`,
      isNew: false,
    };
  }
}
