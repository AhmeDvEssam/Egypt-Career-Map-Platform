import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location") || "";
    const isFiltered = location && location !== "Egypt" && location !== "All";

    const categoriesParam = searchParams.get("categories");
    const skillTypesParam = searchParams.get("skillTypes");
    const workTypesParam = searchParams.get("workTypes");
    const careerLevelsParam = searchParams.get("careerLevels") || searchParams.get("experienceLevels");
    const sourcesParam = searchParams.get("sources");
    const salaryMinParam = searchParams.get("salaryMin");

    // Build location filter clause for SQL if specific governorate requested
    let filterConditions: string[] = [];

    if (isFiltered) {
      const sanitized = location.replace(/[^a-zA-Z0-9_\s-]/g, "");
      filterConditions.push(`(location_normalized ILIKE '%${sanitized}%' OR location_raw ILIKE '%${sanitized}%')`);
    }

    if (categoriesParam) {
      const catList = categoriesParam.split(",").map((c) => c.trim()).filter(Boolean);
      const catClauses: string[] = [];
      catList.forEach((c) => {
        const lower = c.toLowerCase();
        if (lower.includes("market") || lower.includes("sale")) {
          catClauses.push(`(internal_category ILIKE '%Marketing%' OR internal_category ILIKE '%Sales%' OR job_category ILIKE '%Sales%')`);
        } else if (lower.includes("data") || lower.includes("analytic")) {
          catClauses.push(`(internal_category ILIKE '%Data%' OR title_raw ILIKE '%Data%' OR title_raw ILIKE '%Analyst%')`);
        } else if (lower.includes("software") || lower.includes("it") || lower.includes("tech")) {
          catClauses.push(`(internal_category ILIKE '%Software%' OR internal_category ILIKE '%IT%' OR job_category ILIKE '%Information Technology%' OR job_category ILIKE '%Software%')`);
        } else if (lower.includes("finance") || lower.includes("business") || lower.includes("accounting")) {
          catClauses.push(`(internal_category ILIKE '%Finance%' OR internal_category ILIKE '%Business%' OR internal_category ILIKE '%Accounting%')`);
        } else if (lower.includes("engineer") || lower.includes("construct")) {
          catClauses.push(`(internal_category ILIKE '%Engineering%' OR internal_category ILIKE '%Construction%')`);
        } else if (lower.includes("customer") || lower.includes("support")) {
          catClauses.push(`(internal_category ILIKE '%Customer%' OR internal_category ILIKE '%Support%')`);
        } else if (lower.includes("hr") || lower.includes("human")) {
          catClauses.push(`(internal_category ILIKE '%Human Resources%' OR internal_category ILIKE '%HR%')`);
        } else if (lower.includes("supply") || lower.includes("logistic")) {
          catClauses.push(`(internal_category ILIKE '%Supply Chain%' OR internal_category ILIKE '%Logistics%')`);
        } else {
          const san = c.replace(/[^a-zA-Z0-9_\s-]/g, "");
          catClauses.push(`(internal_category ILIKE '%${san}%' OR job_category ILIKE '%${san}%')`);
        }
      });
      if (catClauses.length > 0) {
        filterConditions.push(`(${catClauses.join(" OR ")})`);
      }
    }

    if (workTypesParam) {
      const wtList = workTypesParam.split(",").map((w) => w.trim().replace(/[^a-zA-Z0-9_\s-]/g, "")).filter(Boolean);
      if (wtList.length > 0) {
        filterConditions.push(`(${wtList.map((w) => `work_type ILIKE '%${w}%'`).join(" OR ")})`);
      }
    }

    if (careerLevelsParam) {
      const clList = careerLevelsParam.split(",").map((cl) => cl.trim().replace(/[^a-zA-Z0-9_\s-]/g, "")).filter(Boolean);
      if (clList.length > 0) {
        filterConditions.push(`(${clList.map((cl) => `career_level ILIKE '%${cl}%'`).join(" OR ")})`);
      }
    }

    if (sourcesParam) {
      const sList = sourcesParam.split(",").map((s) => s.trim().replace(/[^a-zA-Z0-9_\s-]/g, "")).filter(Boolean);
      if (sList.length > 0) {
        filterConditions.push(`(${sList.map((s) => `source ILIKE '%${s}%'`).join(" OR ")})`);
      }
    }

    if (salaryMinParam) {
      const minVal = parseInt(salaryMinParam, 10);
      if (!isNaN(minVal)) {
        filterConditions.push(`(salary_min >= ${minVal} OR estimated_salary_min >= ${minVal})`);
      }
    }

    let skillTypeSkillClause = "";
    if (skillTypesParam) {
      const stList = skillTypesParam.split(",").map((st) => st.trim().replace(/[^a-zA-Z0-9_\s\/\.-]/g, "")).filter(Boolean);
      if (stList.length > 0) {
        const typesSql = stList.map((st) => `'${st.toLowerCase()}'`).join(",");
        filterConditions.push(`id IN (
          SELECT js_sub.job_id FROM job_skills js_sub
          JOIN skills s_sub ON js_sub.skill_id = s_sub.id
          WHERE LOWER(s_sub.skill_type) IN (${typesSql})
        )`);
        skillTypeSkillClause = `AND LOWER(s.skill_type) IN (${typesSql})`;
      }
    }

    const whereExtra = filterConditions.length > 0 ? `AND ${filterConditions.join(" AND ")}` : "";
    // Prefix only the top-level column references on jobs table
    const whereExtraJ = filterConditions.length > 0
      ? `AND ${filterConditions.map((c) => {
          if (c.startsWith("id IN (")) {
            return `j.id IN (${c.slice(7)}`;
          }
          return c.replace(/\b(location_normalized|location_raw|internal_category|job_category|title_raw|work_type|career_level|source|salary_min|estimated_salary_min)\b/g, "j.$1");
        }).join(" AND ")}`
      : "";

    // 1. Total Jobs in DB
    const sqlTotal = `SELECT COUNT(*)::int as count FROM jobs;`;
    const totalRes = await prisma.$queryRawUnsafe<any[]>(sqlTotal);
    const totalJobs = totalRes[0]?.count || 0;

    // 2. Active / Live Jobs (status IN ('Open', 'open', 'Active', 'active'))
    const sqlActive = `SELECT COUNT(*)::int as count FROM jobs WHERE status IN ('Open', 'open', 'Active', 'active') ${whereExtra};`;
    const activeRes = await prisma.$queryRawUnsafe<any[]>(sqlActive);
    const activeJobs = activeRes[0]?.count || 0;

    // 3. Top In-Demand Skills (directly from skills and job_skills tables, filtered by skill_type if requested)
    const sqlSkills = `
      SELECT s.name, COUNT(js.job_id)::int as count
      FROM job_skills js
      JOIN skills s ON js.skill_id = s.id
      JOIN jobs j ON js.job_id = j.id
      WHERE j.status IN ('Open', 'open', 'Active', 'active') ${whereExtraJ} ${skillTypeSkillClause}
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 10;
    `;
    const skillsRes = await prisma.$queryRawUnsafe<any[]>(sqlSkills);
    const topSkills = skillsRes.map((r: any) => ({
      name: r.name,
      count: Number(r.count),
      share: activeJobs > 0 ? Math.round((Number(r.count) / activeJobs) * 100) : 0,
    }));

    // 4. Real Work Types (On-site, Remote, Hybrid, Not Specified)
    const sqlWorkTypes = `
      SELECT COALESCE(NULLIF(work_type, ''), 'Not Specified') as type, COUNT(*)::int as count
      FROM jobs
      WHERE status IN ('Open', 'open', 'Active', 'active') ${whereExtra}
      GROUP BY type
      ORDER BY count DESC;
    `;
    const workTypesRes = await prisma.$queryRawUnsafe<any[]>(sqlWorkTypes);
    const workTypes = workTypesRes.map((r: any) => ({
      type: r.type,
      count: Number(r.count),
      share: activeJobs > 0 ? Math.round((Number(r.count) / activeJobs) * 100) : 0,
    }));

    // 5. Real Career Levels (using exact database column career_level)
    const sqlCareerLevels = `
      SELECT COALESCE(NULLIF(career_level, ''), 'Not Specified') as level, COUNT(*)::int as count
      FROM jobs
      WHERE status IN ('Open', 'open', 'Active', 'active') ${whereExtra}
      GROUP BY level
      ORDER BY count DESC
      LIMIT 8;
    `;
    const careerLevelsRes = await prisma.$queryRawUnsafe<any[]>(sqlCareerLevels);
    const careerLevels = careerLevelsRes.map((r: any) => ({
      level: r.level,
      count: Number(r.count),
      share: activeJobs > 0 ? Math.round((Number(r.count) / activeJobs) * 100) : 0,
    }));

    // 6. Top Hiring Companies (using exact database column company_name)
    const sqlCompanies = `
      SELECT company_name as company, COUNT(*)::int as count
      FROM jobs
      WHERE status IN ('Open', 'open', 'Active', 'active') 
        AND company_name IS NOT NULL 
        AND company_name != '' 
        ${whereExtra}
      GROUP BY company_name
      ORDER BY count DESC
      LIMIT 8;
    `;
    const companiesRes = await prisma.$queryRawUnsafe<any[]>(sqlCompanies);
    const topCompanies = companiesRes.map((r: any) => ({
      company: r.company,
      count: Number(r.count),
    }));

    // 7. Salary Brackets (based on disclosed salary_min or estimated_salary_min)
    const sqlSalaries = `
      SELECT 
        CASE 
          WHEN COALESCE(salary_min, estimated_salary_min) < 15000 THEN '<15k EGP'
          WHEN COALESCE(salary_min, estimated_salary_min) BETWEEN 15000 AND 30000 THEN '15k-30k EGP'
          WHEN COALESCE(salary_min, estimated_salary_min) BETWEEN 30001 AND 50000 THEN '30k-50k EGP'
          WHEN COALESCE(salary_min, estimated_salary_min) BETWEEN 50001 AND 80000 THEN '50k-80k EGP'
          ELSE '80k+ EGP'
        END as bracket,
        COUNT(*)::int as count
      FROM jobs
      WHERE status IN ('Open', 'open', 'Active', 'active') 
        AND (salary_min IS NOT NULL OR estimated_salary_min IS NOT NULL)
        ${whereExtra}
      GROUP BY bracket
      ORDER BY count DESC;
    `;
    const salariesRes = await prisma.$queryRawUnsafe<any[]>(sqlSalaries);
    const salaryBrackets = salariesRes.map((r: any) => ({
      bracket: r.bracket,
      count: Number(r.count),
    }));

    // 8. Governorates Distribution
    const sqlGovs = `
      SELECT location_normalized as location, COUNT(*)::int as count
      FROM jobs
      WHERE status IN ('Open', 'open', 'Active', 'active') AND location_normalized IS NOT NULL
      ${whereExtra}
      GROUP BY location_normalized
      ORDER BY count DESC
      LIMIT 15;
    `;
    const govsRes = await prisma.$queryRawUnsafe<any[]>(sqlGovs);
    const governorates = govsRes.map((r: any) => ({
      location: r.location,
      count: Number(r.count),
    }));

    return NextResponse.json(
      {
        totalJobs,
        activeJobs,
        location: isFiltered ? location : "Egypt Nationwide",
        topSkills,
        workTypes,
        careerLevels,
        topCompanies,
        salaryBrackets,
        governorates,
        sqlQueries: {
          totalJobs: sqlTotal.trim(),
          activeJobs: sqlActive.trim(),
          topSkills: sqlSkills.trim(),
          workTypes: sqlWorkTypes.trim(),
          careerLevels: sqlCareerLevels.trim(),
          topCompanies: sqlCompanies.trim(),
          salaryBrackets: sqlSalaries.trim(),
          governorates: sqlGovs.trim(),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in /api/intelligence/metrics:", error);
    return NextResponse.json(
      { error: "Failed to load metrics", details: error.message },
      { status: 500 }
    );
  }
}
