import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSmartSearchClause } from "@/lib/searchUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;
    
    const q = searchParams.get("q");
    const locations = searchParams.get("locations");
    const workTypes = searchParams.get("workTypes");
    const experienceLevels = searchParams.get("experienceLevels");
    const jobTypes = searchParams.get("jobTypes");
    const sources = searchParams.get("sources");
    const educationLevels = searchParams.get("educationLevels");
    const salaryMin = searchParams.get("salaryMin");

    // Build the where clause
    const whereClause: any = {
      status: { in: ['Open', 'open', 'Active', 'active'] }
    };
    const AND: any[] = [];

    if (q) {
      const searchClause = buildSmartSearchClause(q);
      if (searchClause) {
        AND.push(searchClause);
      }
    }

    if (locations) {
      const locList = locations.split(",").map(l => l.trim());
      AND.push({
        OR: locList.map(l => ({ locationRaw: { contains: l, mode: "insensitive" } }))
      });
    }

    if (workTypes) {
      const wtList = workTypes.split(",").map(wt => wt.trim());
      AND.push({
        OR: wtList.map(wt => ({ workType: { contains: wt, mode: "insensitive" } }))
      });
    }

    if (experienceLevels) {
      const elList = experienceLevels.split(",").map(el => el.trim());
      AND.push({
        OR: elList.map(el => ({ careerLevel: { contains: el, mode: "insensitive" } }))
      });
    }

    if (jobTypes) {
      const jtList = jobTypes.split(",").map(jt => jt.trim());
      AND.push({
        OR: jtList.map(jt => ({ jobType: { contains: jt, mode: "insensitive" } }))
      });
    }

    if (sources) {
      const sList = sources.split(",").map(s => s.trim());
      AND.push({
        OR: sList.map(s => ({ source: { equals: s, mode: "insensitive" } }))
      });
    }

    if (educationLevels) {
      const eList = educationLevels.split(",").map(e => e.trim());
      AND.push({
        OR: eList.map(e => ({ educationLevel: { contains: e, mode: "insensitive" } }))
      });
    }

    if (salaryMin) {
      const min = parseInt(salaryMin, 10);
      if (!isNaN(min)) {
        AND.push({
          salaryMin: { gte: min }
        });
      }
    }

    if (AND.length > 0) {
      whereClause.AND = AND;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: {
          postedDate: "desc",
        },
        include: {
          skills: {
            include: { skill: true }
          }
        }
      }),
      prisma.job.count({
        where: whereClause
      })
    ]);

    // Map to the format expected by the frontend JobFeed
    const formattedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.titleRaw,
      company: job.companyName,
      location: job.locationRaw,
      job_type: job.jobType || "",
      work_type: job.workType || "",
      experience_needed: job.careerLevel || "",
      salary: (job.salaryMin && job.salaryMax) ? `${job.salaryMin} - ${job.salaryMax} ${job.currency}` : "Confidential",
      skills: job.skills.map((s) => s.skill.name).join(", "),
      description: "", // Can fetch description if needed, but not required for feed
      source: job.source,
      url: job.jobUrl,
    }));

    return NextResponse.json({ jobs: formattedJobs, total }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    // Return empty array to prevent frontend crashes when PostgreSQL is offline
    return NextResponse.json({ jobs: [], total: 0 });
  }
}
