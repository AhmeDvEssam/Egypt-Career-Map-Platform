import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawDomains = await prisma.skill.findMany({
      select: { domain: true },
      distinct: ["domain"],
    });

    const domains = rawDomains
      .map((d) => d.domain)
      .filter((d): d is string => Boolean(d && d.length > 2 && !d.includes("HVAC_")));

    // Sort to prioritize major tech and professional tracks
    const priority = [
      "Software Engineering & IT",
      "Data Science & Analytics",
      "Marketing & Sales",
      "Business & Finance",
      "Design & Architecture",
      "Human Resources",
      "Operations & Management",
      "Customer Service & Support",
      "Engineering & Construction",
    ];

    const sorted = Array.from(new Set([...priority.filter((p) => domains.includes(p)), ...domains]));

    return NextResponse.json({ domains: sorted });
  } catch (error) {
    console.error("Domains fetch error:", error);
    return NextResponse.json({ domains: [] }, { status: 500 });
  }
}
