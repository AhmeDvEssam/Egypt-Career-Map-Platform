"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/app/lib/prisma");
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const governorate = searchParams.get('governorate') || '';
    const industry = searchParams.get('industry') || '';
    const sortBy = searchParams.get('sortBy') || 'scrapedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const where = {};
    if (search) {
        where.OR = [
            { titleRaw: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { locationRaw: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (source)
        where.source = source;
    if (governorate) {
        where.locationNormalized = { contains: governorate, mode: 'insensitive' };
    }
    const orderBy = {};
    const allowedSorts = ['scrapedAt', 'postedDate', 'salaryMin', 'salaryMax', 'titleRaw', 'companyName'];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : 'scrapedAt';
    orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';
    try {
        const [jobs, total] = await Promise.all([
            prisma_1.prisma.job.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    _count: { select: { skills: true } },
                },
            }),
            prisma_1.prisma.job.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return server_1.NextResponse.json({ jobs, total, page, limit, totalPages });
    }
    catch (err) {
        console.error('API /api/jobs error:', err);
        return server_1.NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }
}
