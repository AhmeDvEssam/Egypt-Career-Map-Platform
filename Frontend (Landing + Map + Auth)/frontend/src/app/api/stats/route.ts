import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Total jobs
    const totalJobs = await prisma.job.count();

    // Active jobs
    const activeJobs = await prisma.job.count({
      where: { status: { in: ['Open', 'open', 'Active', 'active'] } }
    });

    // New today (Newly scraped/discovered today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newToday = await prisma.job.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    });

    // Trending skill (most common skill)
    // Prisma doesn't have a direct raw groupBy for relations easily, so we can do raw SQL or fetch popular
    const topSkills = await prisma.$queryRaw`
      SELECT s.name, COUNT(js.job_id) as count
      FROM skills s
      JOIN job_skills js ON s.id = js.skill_id
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 1
    ` as any[];

    const trendingSkill = topSkills.length > 0 ? topSkills[0].name : "N/A";
    const trendingSkillCount = topSkills.length > 0 ? Number(topSkills[0].count) : 0;

    // Top Growth Sector (from industry or jobType, let's use job_type for now if industry isn't populated)
    const topSector = await prisma.job.groupBy({
      by: ['jobType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });
    
    const growthSector = topSector.length > 0 && topSector[0].jobType ? topSector[0].jobType : "Engineering";

    // KPIs per source (Wuzzuf, LinkedIn, Bayt, etc)
    const sourceGroups = await prisma.job.groupBy({
      by: ['source'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    return NextResponse.json({
      totalJobs,
      activeJobs,
      newToday,
      trendingSkill: {
        name: trendingSkill,
        count: trendingSkillCount,
        growth: "18%" // placeholder for UI
      },
      growthSector,
      sourceBreakdown: sourceGroups
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({
      totalJobs: 0,
      activeJobs: 0,
      newToday: 0,
      trendingSkill: { name: "N/A", count: 0, growth: "0%" },
      growthSector: "N/A"
    });
  }
}
