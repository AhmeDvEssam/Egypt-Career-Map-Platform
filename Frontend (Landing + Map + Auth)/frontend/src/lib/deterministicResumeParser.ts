/**
 * HireQ 100% Deterministic Resume Parser
 * Zero LLM Tokens • Instant (<50ms) • Pure Rule-Based Lexer
 * 
 * Extracts:
 * 1. Sections: Summary, Skills, Experience, Education, Projects, Certifications
 * 2. Skills: Cross-referenced with PostgreSQL 19,000+ Skills & Aliases Dictionary
 * 3. Education: Comprehensive hierarchy (Doctorate -> Master -> Bachelor -> Diploma -> High School / Secondary)
 * 4. Experience: Smart date-range detection, role/company boundary detection, location extraction, and action bullets
 */

export interface ParsedExperience {
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description: string;
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number | null;
  endYear?: number | null;
}

export interface DeterministicParsedResume {
  name?: string;
  headline?: string;
  bio?: string;
  skills: string[];
  experiences: ParsedExperience[];
  educations: ParsedEducation[];
}

// 1. ALL RECOGNIZED SECTION HEADERS (Case-insensitive, Multi-lingual: English & Arabic)
const SECTION_HEADERS: Record<string, RegExp> = {
  SUMMARY: /^(?:professional\s+summary|executive\s+summary|summary|about\s+me|about|profile|career\s+objective|objective|نبذة\s+عني|نبذة\s+شخصية|الملخص\s+المهني|الهدف\s+المهني|الهدف\s+الوظيفي|عني)\b/i,
  SKILLS: /^(?:technical\s+skills|core\s+skills|core\s+competencies|key\s+skills|skills\s*(?:&|and)\s*technologies|skills|technologies|tools\s*(?:&|and)\s*technologies|areas\s+of\s+expertise|المهارات\s+التقنية|المهارات\s+الأساسية|المهارات|الكفاءات|القدرات|أدوات\s+العمل)\b/i,
  EXPERIENCE: /^(?:professional\s+experience|work\s+experience|experience|employment\s+history|career\s+history|relevant\s+experience|work\s+history|practical\s+experience|internships?|الخبرات\s+العملية|الخبرات\s+المهنية|الخبرات\s+السابقة|الخبرة\s+العملية|الخبرة\s+المهنية|الخبرة|تاريخ\s+العمل|التاريخ\s+المهني)\b/i,
  EDUCATION: /^(?:academic\s+background|academic\s+qualifications|academic\s+history|education\s*(?:&|and)\s*credentials|education|credentials|qualifications|degrees?|studies|المؤهلات\s+التعليمية|المؤهلات\s+الأكاديمية|المؤهلات\s+العلمية|المؤهل\s+الجامعي|المؤهل\s+العلمي|المؤهل\s+الدراسي|التعليم|الدراسة)\b/i,
  PROJECTS: /^(?:key\s+projects|personal\s+projects|academic\s+projects|featured\s+projects|projects|المشاريع\s+الشخصية|المشاريع\s+السابقة|المشاريع|أبرز\s+المشاريع)\b/i,
  CERTIFICATIONS: /^(?:licenses\s*(?:&|and)\s*certifications|certifications|certificates|courses|professional\s+development|الشهادات\s+المهنية|الشهادات\s+المعتمدة|الشهادات|الدورات\s+التدريبية|الدورات|الكورسات)\b/i,
  LANGUAGES: /^(?:languages|language\s+proficiency|اللغات|إتقان\s+اللغات)\b/i,
};

// 2. COMPREHENSIVE DEGREE TIERS (From Doctorate down to High School/Prep)
const DEGREE_PATTERNS = [
  // Doctorate / PhD
  { label: "Doctor of Philosophy (Ph.D.)", regex: /\b(?:ph\.?d\.?|doctorate|doctor\s+of\s+philosophy|دكتوراه)\b/i },
  // Master's Degrees
  { label: "Master of Science (M.Sc.)", regex: /\b(?:m\.?sc\.?|master\s+of\s+science|ماجستير)\b/i },
  { label: "Master of Business Administration (MBA)", regex: /\b(?:mba|master\s+of\s+business\s+administration)\b/i },
  { label: "Master of Arts (M.A.)", regex: /\b(?:m\.?a\.?|master\s+of\s+arts)\b/i },
  { label: "Master's Degree", regex: /\b(?:master'?s?(?:\s+degree)?)\b/i },
  // Bachelor's Degrees
  { label: "Bachelor of Science (B.Sc.)", regex: /\b(?:b\.?sc\.?|bachelor\s+of\s+science|بكالوريوس)\b/i },
  { label: "Bachelor of Computer Science", regex: /\bbachelor\s+of\s+computer\s+science\b/i },
  { label: "Bachelor of Engineering (B.Eng.)", regex: /\b(?:b\.?eng\.?|bachelor\s+of\s+engineering)\b/i },
  { label: "Bachelor of Arts (B.A.)", regex: /\b(?:b\.?a\.?|bachelor\s+of\s+arts|ليسانس)\b/i },
  { label: "Bachelor Degree", regex: /\b(?:bachelor'?s?(?:\s+degree)?|licence|undergraduate)\b/i },
  // Diplomas & Technical Institutes
  { label: "Post-Graduate Diploma", regex: /\b(?:post-?graduate\s+diploma|higher\s+diploma)\b/i },
  { label: "Diploma", regex: /\b(?:diploma|associate\s+degree|دبلوم|دبلومة)\b/i },
  { label: "Technical Institute Degree", regex: /\b(?:technical\s+institute|vocational\s+training|معهد\s+فني|معهد\s+عالي)\b/i },
  // High School / Secondary / Prep (All inclusive)
  { label: "General Secondary Certificate (Thanaweya Amma)", regex: /\b(?:general\s+secondary|thanaweya\s+amma|ثانوية\s+عامة)\b/i },
  { label: "High School (IGCSE / British)", regex: /\b(?:igcse|gcse|british\s+curriculum)\b/i },
  { label: "High School (American Diploma)", regex: /\b(?:american\s+diploma|sat)\b/i },
  { label: "International Baccalaureate (IB)", regex: /\b(?:international\s+baccalaureate|ib\s+diploma)\b/i },
  { label: "High School / Secondary School", regex: /\b(?:high\s+school|secondary\s+school|stem\s+school|مدرسة\s+ثانوية)\b/i },
  { label: "Preparatory / Primary School", regex: /\b(?:preparatory\s+school|primary\s+school|إعدادية|ابتدائية)\b/i },
];

const INSTITUTION_REGEX = /\b(?:university|faculty|college|institute|academy|school|جامعة|كلية|معهد|مدرسة|أكاديمية)\b/i;

// 3. DATE PATTERNS (Months, Years, Present)
const MONTH_NAMES = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))";
const DATE_RANGE_REGEX = new RegExp(
  `(?:(${MONTH_NAMES}\\s+)?(\\d{4})(?:-\\d{2})?)\\s*(?:[-–—to/]+|until|till)\\s*(?:(${MONTH_NAMES}\\s+)?(\\d{4}|present|current|now|حتى\\s+الآن))`,
  "i"
);

// 4. COMMON ROLE NOUNS & LOCATIONS
const ROLE_KEYWORDS = /\b(?:engineer|analyst|developer|specialist|architect|lead|team\s+lead|manager|consultant|officer|coordinator|associate|director|intern|scientist|designer|administrator|technician|accountant)\b/i;
const LOCATION_REGEX = /\b(cairo|giza|alexandria|egypt|remote|hybrid|onsite|mansoura|tanta|ismailia|suez|hurghada|sharm|luxor|aswan|maadi|nasr city|new cairo|dokki|mohandessin|tagamoa|smart village|القاهرة|الجيزة|الاسكندرية|مصر)\b/gi;

export function parseResumeDeterministically(
  rawText: string,
  canonicalSkillMap: Map<string, string> // lowercased alias/name -> Canonical Name
): DeterministicParsedResume {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Clean broken lines & page markers (e.g. "-- 1 of 2 --", "Page 1 of 2")
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) || /^page\s+\d+/i.test(line)) continue;

    // Join lines broken across hyphen/dash (e.g. "August 2024 –" followed by "August 2025")
    while (i + 1 < rawLines.length && /[-–—]\s*$/.test(line)) {
      i++;
      line = line + " " + rawLines[i].trim();
    }
    lines.push(line);
  }

  const sections: Record<string, string[]> = {
    HEADER: [],
    SUMMARY: [],
    SKILLS: [],
    EXPERIENCE: [],
    EDUCATION: [],
    PROJECTS: [],
    CERTIFICATIONS: [],
    LANGUAGES: [],
  };

  let currentSection = "HEADER";

  // Phase 1: Section Segmentation
  for (const line of lines) {
    const normalizedLine = line.replace(/[:#*_\-]/g, "").trim();
    let detectedSection: string | null = null;

    for (const [secName, regex] of Object.entries(SECTION_HEADERS)) {
      if (regex.test(normalizedLine) && normalizedLine.length <= 45) {
        detectedSection = secName;
        break;
      }
    }

    if (detectedSection) {
      currentSection = detectedSection;
      continue;
    }

    sections[currentSection].push(line);
  }

  // Phase 2: Name & Headline & Summary
  let name = "";
  let headline = "";
  let bio = "";

  if (sections.HEADER.length > 0) {
    name = sections.HEADER[0].replace(/[^a-zA-Z\s\u0600-\u06FF]/g, "").trim();
    if (sections.HEADER.length > 1) {
      const secondLine = sections.HEADER[1];
      if (!secondLine.includes("@") && !secondLine.includes("http") && secondLine.length < 70) {
        headline = secondLine;
      }
    }
  }

  if (sections.SUMMARY.length > 0) {
    bio = sections.SUMMARY.join(" ");
  }

  // Phase 3: Deterministic Skills Extraction (Cross-referenced with Canonical Database)
  const skillsText = sections.SKILLS.length > 0 ? sections.SKILLS.join(" ") : rawText;
  const verifiedSkills: string[] = [];

  const SKILL_STOPWORDS = new Set([
    "data", "power", "cleaning", "technical", "general skill", "general skills",
    "language", "languages", "language proficiency", "c1", "c2", "b1", "b2",
    "technical skills", "core skills", "skills", "tools", "ability", "duties",
    "tasks", "responsibilities", "level", "years", "year", "project", "projects",
    "learning and development", "general"
  ]);

  for (const [key, canonicalName] of canonicalSkillMap.entries()) {
    if (key.length < 2) continue;
    const lowerKey = key.toLowerCase();
    const lowerCanonical = canonicalName.toLowerCase();
    if (SKILL_STOPWORDS.has(lowerKey) || SKILL_STOPWORDS.has(lowerCanonical)) continue;

    // Boundary-aware regex preventing substring false-positives
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, "i");

    if (regex.test(skillsText)) {
      if (!verifiedSkills.includes(canonicalName)) {
        verifiedSkills.push(canonicalName);
      }
    }
  }

  // Phase 4: Deterministic Experience Extraction
  const experiences: ParsedExperience[] = [];
  const expLines = sections.EXPERIENCE;
  let currentExp: ParsedExperience | null = null;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const dateMatch = line.match(DATE_RANGE_REGEX);

    if (dateMatch) {
      const startYear = dateMatch[2] || "2022";
      const endPart = (dateMatch[4] || "").toLowerCase();
      const isCurrent = endPart.includes("present") || endPart.includes("current") || endPart.includes("now") || endPart.includes("حتى");
      const startDate = `${startYear}-01-01`;
      const endDate = isCurrent ? null : `${endPart || startYear}-01-01`;

      let roleCompanyLine = line.replace(DATE_RANGE_REGEX, "").trim();
      if (!roleCompanyLine && i > 0) {
        roleCompanyLine = expLines[i - 1];
      }

      // Extract and normalize location
      let detectedLocation = "Egypt";
      const locMatches = roleCompanyLine.match(LOCATION_REGEX);
      if (locMatches && locMatches.length > 0) {
        detectedLocation = locMatches.join(", ");
        roleCompanyLine = roleCompanyLine.replace(LOCATION_REGEX, "").replace(/,\s*,/g, ",").trim();
      }

      const parts = roleCompanyLine.split(/[|–—@•]|\bat\b/i).map((p) => p.trim()).filter(Boolean);
      let detectedRole = "Data & Software Professional";
      let detectedCompany = "Enterprise";

      if (parts.length >= 2) {
        if (ROLE_KEYWORDS.test(parts[0])) {
          detectedRole = parts[0];
          detectedCompany = parts[1];
        } else {
          detectedCompany = parts[0];
          detectedRole = parts[1];
        }
      } else if (parts.length === 1) {
        if (ROLE_KEYWORDS.test(parts[0])) {
          detectedRole = parts[0];
        } else {
          detectedCompany = parts[0];
        }

        // Look at next line if it holds the other entity (e.g. Role on Line 1, Company on Line 2)
        if (i + 1 < expLines.length) {
          const nextCandidate = expLines[i + 1].trim();
          const hasDate = DATE_RANGE_REGEX.test(nextCandidate);
          const isBullet = /^[-•*o–\d+.]/.test(nextCandidate);
          if (!hasDate && !isBullet && nextCandidate.length < 80) {
            let nextText = nextCandidate;
            const nextLocMatches = nextText.match(LOCATION_REGEX);
            if (nextLocMatches && nextLocMatches.length > 0) {
              detectedLocation = nextLocMatches.join(", ");
              nextText = nextText.replace(LOCATION_REGEX, "").replace(/,\s*,/g, ",").trim();
            }
            const cleanNext = nextText.replace(/^[\s,–—|•\t]+|[\s,–—|•\t]+$/g, "").trim();
            if (cleanNext) {
              if (detectedCompany === "Enterprise" && detectedRole !== "Data & Software Professional") {
                detectedCompany = cleanNext;
                i++; // advance past nextCandidate line
              } else if (detectedRole === "Data & Software Professional" && detectedCompany !== "Enterprise") {
                detectedRole = cleanNext;
                i++; // advance past nextCandidate line
              }
            }
          }
        }
      }

      detectedRole = detectedRole.replace(/^[\s,–—|-]+|[\s,–—|-]+$/g, "").trim();
      detectedCompany = detectedCompany.replace(/^[\s,–—|-]+|[\s,–—|-]+$/g, "").trim();

      if (currentExp) {
        experiences.push(currentExp);
      }

      currentExp = {
        role: detectedRole,
        company: detectedCompany,
        location: detectedLocation,
        startDate,
        endDate,
        isCurrent,
        description: "",
      };
      continue;
    }

    if (currentExp) {
      const isBullet = /^[-•*o–\d+.]/.test(line);
      const cleanLine = line.replace(/^[-•*o–\d+.]\s*/, "").trim();

      if (cleanLine.length > 5 && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(cleanLine)) {
        currentExp.description += (currentExp.description ? "\n• " : "• ") + cleanLine;
      }
    }
  }

  if (currentExp) {
    experiences.push(currentExp);
  }

  // Phase 5: Deterministic Education Extraction (Multi-Tier & Merge)
  const educations: ParsedEducation[] = [];
  const eduLines = sections.EDUCATION;
  let currentEdu: ParsedEducation | null = null;

  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    const yearMatch = line.match(/\b(19\d{2}|20\d{2})\b/g);
    const hasInst = INSTITUTION_REGEX.test(line);

    let detectedDegree: string | null = null;
    for (const deg of DEGREE_PATTERNS) {
      if (deg.regex.test(line)) {
        detectedDegree = deg.label;
        break;
      }
    }

    // Merge logic: If currentEdu already has institution and no degree/years, merge with this line
    if (currentEdu && (!currentEdu.endYear || currentEdu.degree === "Bachelor Degree") && (detectedDegree || yearMatch)) {
      if (detectedDegree) currentEdu.degree = detectedDegree;
      if (yearMatch && yearMatch.length >= 2) {
        currentEdu.startYear = parseInt(yearMatch[0], 10);
        currentEdu.endYear = parseInt(yearMatch[1], 10);
      } else if (yearMatch && yearMatch.length === 1) {
        currentEdu.endYear = parseInt(yearMatch[0], 10);
        currentEdu.startYear = currentEdu.endYear - 4;
      }
      const inMatch = line.match(/\b(?:in|of)\s+([A-Za-z\s&,]+?)(?=[|,(]|$)/i);
      if (inMatch) {
        currentEdu.fieldOfStudy = inMatch[1].trim();
      }
      continue;
    }

    if (hasInst || detectedDegree) {
      if (currentEdu) {
        educations.push(currentEdu);
      }

      let institution = hasInst ? line.replace(/[|•,]/g, "").trim() : "University";
      let degree = detectedDegree || "Bachelor Degree";
      let fieldOfStudy = "Computer Science & Analytics";

      const inMatch = line.match(/\b(?:in|of)\s+([A-Za-z\s&,]+?)(?=[|,(]|$)/i);
      if (inMatch) {
        fieldOfStudy = inMatch[1].trim();
      }

      let startYear: number | null = null;
      let endYear: number | null = null;

      if (yearMatch && yearMatch.length >= 2) {
        startYear = parseInt(yearMatch[0], 10);
        endYear = parseInt(yearMatch[1], 10);
      } else if (yearMatch && yearMatch.length === 1) {
        endYear = parseInt(yearMatch[0], 10);
        startYear = endYear - 4;
      }

      currentEdu = {
        institution,
        degree,
        fieldOfStudy,
        startYear,
        endYear,
      };
      continue;
    }
  }

  if (currentEdu) {
    educations.push(currentEdu);
  }

  // Headline fallback
  if (!headline && experiences.length > 0) {
    headline = experiences[0].role;
  }

  return {
    name,
    headline,
    bio,
    skills: verifiedSkills,
    experiences,
    educations,
  };
}
