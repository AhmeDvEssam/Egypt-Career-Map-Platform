"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/app/lib/prisma");
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;
    const where = {};
    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }
    try {
        const [skills, total] = await Promise.all([
            prisma_1.prisma.skill.findMany({
                where,
                orderBy: { jobs: { _count: 'desc' } },
                skip,
                take: limit,
                include: { _count: { select: { jobs: true } } },
            }),
            prisma_1.prisma.skill.count({ where }),
        ]);
        return server_1.NextResponse.json({
            skills: skills.map((s) => ({ name: s.name, jobCount: s._count.jobs })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (err) {
        console.error('API /api/skills error:', err);
        return server_1.NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
    }
}
