import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSmartSearchClause } from "@/lib/searchUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    // Always calculate dynamically from jobs table to reflect real-time scraped data
    const whereClause: any = {
      status: { in: ['Open', 'open', 'Active', 'active'] } // Support both LinkedIn & Wuzzuf active statuses
    };
    if (q) {
      const searchClause = buildSmartSearchClause(q);
      if (searchClause) {
        whereClause.AND = [searchClause];
      }
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
