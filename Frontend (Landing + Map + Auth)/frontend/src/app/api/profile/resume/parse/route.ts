import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdfTextExtractor";
import { parseResumeDeterministically } from "@/lib/deterministicResumeParser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let rawText = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const textParam = formData.get("rawText") as string | null;

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Check if file is PDF (by mime or magic bytes %PDF)
        const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf") || buffer.slice(0, 5).toString().includes("%PDF");

        if (isPdf) {
          try {
            rawText = await extractPdfText(buffer);
          } catch (pdfErr) {
            console.error("Local PDF extraction error:", pdfErr);
            return NextResponse.json(
              { error: "Could not extract text from the provided PDF file." },
              { status: 422 }
            );
          }
        } else {
          rawText = buffer.toString("utf-8");
        }
      } else if (textParam) {
        rawText = textParam;
      }
    } else {
      const body = await request.json();
      if (body.base64File) {
        const buffer = Buffer.from(body.base64File, "base64");
        try {
          rawText = await extractPdfText(buffer);
        } catch (pdfErr) {
          console.error("Base64 PDF extraction error:", pdfErr);
          return NextResponse.json(
            { error: "Could not extract text from the provided base64 PDF." },
            { status: 422 }
          );
        }
      } else {
        rawText = body.rawText || "";
      }
    }

    if (!rawText.trim() || rawText.trim().length < 50) {
      return NextResponse.json(
        { 
          error: "The uploaded PDF appears to be a scanned image or flattened document without selectable text. Please upload a searchable text PDF or paste your resume text directly." 
        },
        { status: 400 }
      );
    }

    // 1. Fetch canonical skills and aliases from PostgreSQL
    const dbSkills = await prisma.skill.findMany({
      select: { name: true },
    });
    const dbAliases = await prisma.skill_aliases.findMany({
      select: { alias_name: true, skills: { select: { name: true } } },
    });

    const canonicalMap = new Map<string, string>();
    for (const sk of dbSkills) {
      canonicalMap.set(sk.name.toLowerCase(), sk.name);
    }
    for (const al of dbAliases) {
      if (al.skills?.name) {
        canonicalMap.set(al.alias_name.toLowerCase(), al.skills.name);
      }
    }

    // High confidence known technical tools & skills fallback dictionary
    const fallbackKnown: Record<string, string> = {
      "python": "Python",
      "sql": "SQL",
      "powerbi": "PowerBI",
      "power bi": "PowerBI",
      "tableau": "Tableau",
      "excel": "Excel",
      "excel vba": "Excel VBA",
      "vba": "Excel VBA",
      "dax": "DAX",
      "power query": "Power Query",
      "dash": "Dash",
      "plotly": "Plotly",
      "pandas": "Pandas",
      "numpy": "NumPy",
      "scikit-learn": "Scikit-Learn",
      "sklearn": "Scikit-Learn",
      "matplotlib": "Matplotlib",
      "seaborn": "Seaborn",
      "postgresql": "PostgreSQL",
      "mysql": "MySQL",
      "sql server": "SQL Server",
      "mongodb": "MongoDB",
      "git": "Git",
      "github": "GitHub",
      "etl": "ETL",
      "data modeling": "Data Modeling",
      "data engineering": "Data Engineering",
      "data cleaning": "Data Cleaning",
      "eda": "EDA",
      "machine learning": "Machine Learning",
      "deep learning": "Deep Learning",
      "nlp": "NLP",
      "selenium": "Selenium",
      "beautifulsoup": "BeautifulSoup",
      "fastapi": "FastAPI",
      "docker": "Docker",
      "airflow": "Airflow",
    };

    for (const [k, v] of Object.entries(fallbackKnown)) {
      if (!canonicalMap.has(k)) {
        canonicalMap.set(k, v);
      }
    }

    // 2. Parse Deterministically (Zero LLM Tokens • Pure Rule-Based Lexer)
    const parsedData = parseResumeDeterministically(rawText, canonicalMap);

    return NextResponse.json({
      success: true,
      parsed: parsedData,
      mode: "deterministic_zero_tokens",
    });
  } catch (error: any) {
    console.error("Resume parse error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse resume" },
      { status: 500 }
    );
  }
}
