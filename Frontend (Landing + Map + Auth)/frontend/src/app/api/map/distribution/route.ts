import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSmartSearchClause } from "@/lib/searchUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const categories = searchParams.get("categories");
    const skillTypes = searchParams.get("skillTypes");
    const workTypes = searchParams.get("workTypes");
    const careerLevels = searchParams.get("careerLevels") || searchParams.get("experienceLevels");
    const sources = searchParams.get("sources");
    const salaryMin = searchParams.get("salaryMin");

    // Always calculate dynamically from jobs table to reflect real-time scraped data
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

    if (workTypes) {
      const wtList = workTypes.split(",").map(wt => wt.trim()).filter(Boolean);
      if (wtList.length > 0) {
        AND.push({
          OR: wtList.map(wt => ({ workType: { contains: wt, mode: "insensitive" } }))
        });
      }
    }

    if (careerLevels) {
      const elList = careerLevels.split(",").map(el => el.trim()).filter(Boolean);
      if (elList.length > 0) {
        AND.push({
          OR: elList.map(el => ({ careerLevel: { contains: el, mode: "insensitive" } }))
        });
      }
    }

    if (sources) {
      const sList = sources.split(",").map(s => s.trim()).filter(Boolean);
      if (sList.length > 0) {
        AND.push({
          OR: sList.map(s => ({ source: { equals: s, mode: "insensitive" } }))
        });
      }
    }

    if (salaryMin) {
      const min = parseInt(salaryMin, 10);
      if (!isNaN(min)) {
        AND.push({ salaryMin: { gte: min } });
      }
    }

    if (AND.length > 0) {
      whereClause.AND = AND;
    }

    const grouped = await prisma.job.groupBy({
      by: ["locationNormalized"],
      _count: {
        id: true,
      },
      where: whereClause,
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 20
    });

    const data = grouped.map((g: any) => ({
      location: g.locationNormalized || 'Unknown',
      count: g._count.id
    }));

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error("Error fetching map distribution:", error);
    // Return empty array to prevent frontend crashes (.map / .sort) when PostgreSQL service is offline
    return NextResponse.json([]);
  }
}
