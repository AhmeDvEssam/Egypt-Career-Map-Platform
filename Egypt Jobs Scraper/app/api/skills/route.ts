import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  try {
    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy: { jobs: { _count: 'desc' } },
        skip,
        take: limit,
        include: { _count: { select: { jobs: true } } },
      }),
      prisma.skill.count({ where }),
    ]);

    return NextResponse.json({
      skills: skills.map((s) => ({ name: s.name, jobCount: s._count.jobs })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('API /api/skills error:', err);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}
