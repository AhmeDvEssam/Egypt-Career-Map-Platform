"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/app/lib/prisma");
async function GET() {
    try {
        const [totalJobs, activeCompanies, avgMinSalary, topSkills, governorateCounts, industryCounts, sourceCounts,] = await Promise.all([
            prisma_1.prisma.job.count({ where: { status: 'Open' } }),
            prisma_1.prisma.job.groupBy({
                by: ['companyName'],
                where: { status: 'Open' },
            }).then((g) => g.length),
            prisma_1.prisma.job.aggregate({
                where: { status: 'Open', salaryMin: { not: null } },
                _avg: { salaryMin: true },
            }),
            prisma_1.prisma.skill.findMany({
                orderBy: { jobs: { _count: 'desc' } },
                take: 10,
                include: { _count: { select: { jobs: true } } },
            }),
            prisma_1.prisma.job.groupBy({
                by: ['locationNormalized'],
                where: { status: 'Open', locationNormalized: { not: null } },
                _count: true,
                orderBy: { _count: { id: 'desc' } },
                take: 12,
            }),
            prisma_1.prisma.job.groupBy({
                by: ['jobCategory'],
                where: { status: 'Open', jobCategory: { not: null } },
                _count: true,
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
            prisma_1.prisma.job.groupBy({
                by: ['source'],
                where: { status: 'Open' },
                _count: true,
            }),
        ]);
        return server_1.NextResponse.json({
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
    }
    catch (err) {
        console.error('API /api/stats error:', err);
        return server_1.NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
