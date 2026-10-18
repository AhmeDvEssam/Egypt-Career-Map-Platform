import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const [
      totalJobs,
      activeCompanies,
      avgMinSalary,
      topSkills,
      governorateCounts,
      industryCounts,
      sourceCounts,
    ] = await Promise.all([
      prisma.job.count({ where: { status: 'Open' } }),
      prisma.job.groupBy({
        by: ['companyName'],
        where: { status: 'Open' },
      }).then((g) => g.length),
      prisma.job.aggregate({
        where: { status: 'Open', salaryMin: { not: null } },
        _avg: { salaryMin: true },
      }),
      prisma.skill.findMany({
        orderBy: { jobs: { _count: 'desc' } },
        take: 10,
        include: { _count: { select: { jobs: true } } },
      }),
      prisma.job.groupBy({
        by: ['locationNormalized'],
        where: { status: 'Open', locationNormalized: { not: null } },
        _count: true,
        orderBy: { _count: { id: 'desc' } },
        take: 12,
      }),
      prisma.job.groupBy({
        by: ['jobCategory'],
        where: { status: 'Open', jobCategory: { not: null } },
        _count: true,
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.job.groupBy({
        by: ['source'],
        where: { status: 'Open' },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      totalJobs,
      activeCompanies,
      avgSalary: Math.round(Number(avgMinSalary._avg.salaryMin ?? 0)),
      topSkills: topSkills.map((s) => ({
        name: s.name,
        count: s._count.jobs,
      })),
      governorates: governorateCounts.map((g) => ({
        name: g.locationNormalized ?? 'Unknown',
        jobs: g._count,
      })),
      industries: industryCounts.map((i) => ({
        name: i.jobCategory ?? 'Other',
        count: i._count,
      })),
      sources: sourceCounts.map((s) => ({
        source: s.source,
        count: s._count,
      })),
    });
  } catch (err) {
    console.error('API /api/stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
