import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const domain = searchParams.get("domain")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "";

    // CASE 1: User is actively typing a search query `q`
    if (q) {
      // 1. Exact or partial match in canonical skills table
      const canonicalMatches = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        domain: string | null;
        sub_category: string | null;
        matched_alias: string | null;
        job_count: number;
      }>>`
        SELECT 
          s.id, 
          s.name, 
          s.domain, 
          s.sub_category,
          NULL as matched_alias,
          COALESCE(COUNT(js.job_id), 0)::int as job_count
        FROM skills s
        LEFT JOIN job_skills js ON js.skill_id = s.id
        WHERE s.name ILIKE ${'%' + q + '%'}
        GROUP BY s.id, s.name, s.domain, s.sub_category
        ORDER BY 
          CASE 
            WHEN s.name ILIKE ${q} THEN 1
            WHEN s.name ILIKE ${q + '%'} THEN 2
            ELSE 3
          END,
          job_count DESC
        LIMIT 10;
      `;

      // 2. Search in skill_aliases table for synonyms/variations
      const aliasMatches = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        domain: string | null;
        sub_category: string | null;
        matched_alias: string;
        job_count: number;
      }>>`
        SELECT 
          s.id, 
          s.name, 
          s.domain, 
          s.sub_category,
          sa.alias_name as matched_alias,
          COALESCE(COUNT(js.job_id), 0)::int as job_count
        FROM skill_aliases sa
        JOIN skills s ON s.id = sa.skill_id
        LEFT JOIN job_skills js ON js.skill_id = s.id
        WHERE sa.alias_name ILIKE ${'%' + q + '%'}
          AND s.name NOT ILIKE ${'%' + q + '%'}
        GROUP BY s.id, s.name, s.domain, s.sub_category, sa.alias_name
        ORDER BY 
          CASE 
            WHEN sa.alias_name ILIKE ${q} THEN 1
            WHEN sa.alias_name ILIKE ${q + '%'} THEN 2
            ELSE 3
          END,
          job_count DESC
        LIMIT 6;
      `;

      // Combine without duplicates
      const seenIds = new Set<string>();
      const combined: Array<{
        id: string;
        name: string;
        domain: string | null;
        subCategory?: string | null;
        sub_category?: string | null;
        matchedAlias?: string | null;
        jobCount: number;
      }> = [];

      for (const m of canonicalMatches) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          combined.push({
            id: m.id,
            name: m.name,
            domain: m.domain,
            subCategory: m.sub_category,
            sub_category: m.sub_category,
            matchedAlias: null,
            jobCount: m.job_count,
          });
        }
      }

      for (const a of aliasMatches) {
        if (!seenIds.has(a.id)) {
          seenIds.add(a.id);
          combined.push({
            id: a.id,
            name: a.name,
            domain: a.domain,
            subCategory: a.sub_category,
            sub_category: a.sub_category,
            matchedAlias: a.matched_alias,
            jobCount: a.job_count,
          });
        }
      }

      return NextResponse.json({ skills: combined });
    }

    // CASE 2: No search query -> Return top recommended in-demand skills
    // Priority A: Filter by candidate's specific targetRole (e.g. Data Scientist, Frontend Developer)
    if (role && role.length >= 3) {
      const topRoleSkills = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        domain: string | null;
        sub_category: string | null;
        job_count: number;
      }>>`
        SELECT 
          s.id, 
          s.name, 
          s.domain, 
          s.sub_category,
          COUNT(js.job_id)::int as job_count
        FROM jobs j
        JOIN job_skills js ON js.job_id = j.id
        JOIN skills s ON s.id = js.skill_id
        WHERE (j.title_raw ILIKE ${'%' + role + '%'} OR j.title_normalized ILIKE ${'%' + role + '%'})
        GROUP BY s.id, s.name, s.domain, s.sub_category
        ORDER BY job_count DESC
        LIMIT 25;
      `;

      if (topRoleSkills.length >= 5) {
        return NextResponse.json({
          skills: topRoleSkills.map(s => ({
            id: s.id,
            name: s.name,
            domain: s.domain,
            subCategory: s.sub_category,
            jobCount: s.job_count,
          })),
        });
      }
    }

    // Priority B: Filter by candidate's domain / category (ranked by demand)
    if (domain) {
      const topDomainSkills = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        domain: string | null;
        sub_category: string | null;
        job_count: number;
      }>>`
        SELECT 
          s.id, 
          s.name, 
          s.domain, 
          s.sub_category,
          COUNT(js.job_id)::int as job_count
        FROM job_skills js
        JOIN skills s ON s.id = js.skill_id
        WHERE s.domain ILIKE ${'%' + domain + '%'}
        GROUP BY s.id, s.name, s.domain, s.sub_category
        ORDER BY job_count DESC
        LIMIT 25;
      `;

      if (topDomainSkills.length > 0) {
        return NextResponse.json({
          skills: topDomainSkills.map(s => ({
            id: s.id,
            name: s.name,
            domain: s.domain,
            subCategory: s.sub_category,
            jobCount: s.job_count,
          })),
        });
      }
    }

    // Fallback: Overall top 25 skills in Egyptian job market
    const fallbackTopSkills = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      domain: string | null;
      sub_category: string | null;
      job_count: number;
    }>>`
      SELECT 
        s.id, 
        s.name, 
        s.domain, 
        s.sub_category,
        COUNT(js.job_id)::int as job_count
      FROM job_skills js
      JOIN skills s ON s.id = js.skill_id
      GROUP BY s.id, s.name, s.domain, s.sub_category
      ORDER BY job_count DESC
      LIMIT 25;
    `;

    return NextResponse.json({
      skills: fallbackTopSkills.map(s => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        subCategory: s.sub_category,
        jobCount: s.job_count,
      })),
    });
  } catch (error) {
    console.error("Skills search error:", error);
    return NextResponse.json({ skills: [] }, { status: 500 });
  }
}
