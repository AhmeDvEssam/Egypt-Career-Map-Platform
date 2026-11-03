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
    const categories = searchParams.get("categories");
    const skillTypes = searchParams.get("skillTypes");
    const skillsParam = searchParams.get("skills");

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
      const locList = locations.split(",").map(l => l.trim()).filter(Boolean);
      // Map common Arabic governorate names to English normalized equivalents
      const expandedLocs: string[] = [];
      locList.forEach(loc => {
        expandedLocs.push(loc);
        const lower = loc.toLowerCase();
        if (lower === "cairo" || loc === "القاهرة") { expandedLocs.push("Cairo", "القاهرة"); }
        if (lower === "giza" || loc === "الجيزة") { expandedLocs.push("Giza", "الجيزة"); }
        if (lower === "alexandria" || loc === "الاسكندرية" || loc === "الإسكندرية") { expandedLocs.push("Alexandria", "الاسكندرية", "الإسكندرية"); }
        if (lower === "port said" || loc === "بورسعيد") { expandedLocs.push("Port Said", "بورسعيد"); }
        if (lower === "mansoura" || lower === "dakahlia" || loc === "المنصورة" || loc === "الدقهلية") { expandedLocs.push("Mansoura", "Dakahlia", "المنصورة", "الدقهلية"); }
        if (lower === "suez" || loc === "السويس") { expandedLocs.push("Suez", "السويس"); }
        if (lower === "asyut" || loc === "أسيوط") { expandedLocs.push("Asyut", "أسيوط"); }
      });
      const uniqueLocs = Array.from(new Set(expandedLocs));
      AND.push({
        OR: uniqueLocs.flatMap(l => [
          { locationRaw: { contains: l, mode: "insensitive" } },
          { locationNormalized: { contains: l, mode: "insensitive" } }
        ])
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

    if (categories) {
      const catList = categories.split(",").map(c => c.trim()).filter(Boolean);
      if (catList.length > 0) {
        const catConditions: any[] = [];
        catList.forEach(c => {
          const lower = c.toLowerCase();
          if (lower.includes("market") || lower.includes("sale")) {
            catConditions.push(
              { internal_category: { contains: "Marketing", mode: "insensitive" } },
              { internal_category: { contains: "Sales", mode: "insensitive" } },
              { jobCategory: { contains: "Sales", mode: "insensitive" } }
            );
          } else if (lower.includes("data") || lower.includes("analytic")) {
            catConditions.push(
              { internal_category: { contains: "Data", mode: "insensitive" } },
              { titleRaw: { contains: "Data", mode: "insensitive" } },
              { titleRaw: { contains: "Analyst", mode: "insensitive" } },
              { titleRaw: { contains: "Analytics", mode: "insensitive" } }
            );
          } else if (lower.includes("software") || lower.includes("it") || lower.includes("tech")) {
            catConditions.push(
              { internal_category: { contains: "Software", mode: "insensitive" } },
              { internal_category: { contains: "IT", mode: "insensitive" } },
              { jobCategory: { contains: "Information Technology", mode: "insensitive" } },
              { jobCategory: { contains: "Software", mode: "insensitive" } }
            );
          } else if (lower.includes("finance") || lower.includes("business") || lower.includes("accounting")) {
            catConditions.push(
              { internal_category: { contains: "Finance", mode: "insensitive" } },
              { internal_category: { contains: "Business", mode: "insensitive" } },
              { internal_category: { contains: "Accounting", mode: "insensitive" } },
              { jobCategory: { contains: "Accounting", mode: "insensitive" } },
              { jobCategory: { contains: "Finance", mode: "insensitive" } }
            );
          } else if (lower.includes("engineer") || lower.includes("construct")) {
            catConditions.push(
              { internal_category: { contains: "Engineering", mode: "insensitive" } },
              { internal_category: { contains: "Construction", mode: "insensitive" } },
              { jobCategory: { contains: "Engineering", mode: "insensitive" } }
            );
          } else if (lower.includes("customer") || lower.includes("support")) {
            catConditions.push(
              { internal_category: { contains: "Customer", mode: "insensitive" } },
              { internal_category: { contains: "Support", mode: "insensitive" } },
              { jobCategory: { contains: "Customer", mode: "insensitive" } }
            );
          } else if (lower.includes("hr") || lower.includes("human")) {
            catConditions.push(
              { internal_category: { contains: "Human Resources", mode: "insensitive" } },
              { internal_category: { contains: "HR", mode: "insensitive" } },
              { jobCategory: { contains: "Human Resources", mode: "insensitive" } }
            );
          } else if (lower.includes("supply") || lower.includes("logistic")) {
            catConditions.push(
              { internal_category: { contains: "Supply Chain", mode: "insensitive" } },
              { internal_category: { contains: "Logistics", mode: "insensitive" } }
            );
          } else if (lower.includes("health") || lower.includes("medic")) {
            catConditions.push(
              { internal_category: { contains: "Healthcare", mode: "insensitive" } },
              { internal_category: { contains: "Medical", mode: "insensitive" } }
            );
          } else if (lower.includes("project")) {
            catConditions.push(
              { internal_category: { contains: "Project", mode: "insensitive" } },
              { titleRaw: { contains: "Project Manager", mode: "insensitive" } }
            );
          } else {
            catConditions.push(
              { internal_category: { contains: c, mode: "insensitive" } },
              { jobCategory: { contains: c, mode: "insensitive" } }
            );
          }
        });

        if (catConditions.length > 0) {
          AND.push({ OR: catConditions });
        }
      }
    }

    if (skillTypes) {
      const stList = skillTypes.split(",").map(st => st.trim()).filter(Boolean);
      if (stList.length > 0) {
        AND.push({
          skills: {
            some: {
              skill: {
                skill_type: { in: stList, mode: "insensitive" }
              }
            }
          }
        });
      }
    }

    if (skillsParam) {
      const sList = skillsParam.split(",").map(s => s.trim()).filter(Boolean);
      if (sList.length > 0) {
        AND.push({
          skills: {
            some: {
              skill: {
                name: { in: sList, mode: "insensitive" }
              }
            }
          }
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
      logo_url: (job as any).logo_url || (job as any).logoUrl || null,
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
