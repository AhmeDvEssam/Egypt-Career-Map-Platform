import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        descriptions: true,
        skills: {
          include: {
            skill: true,
          },
        },
        industries: {
          include: {
            industry: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error(`API /api/jobs/${id} error:`, err);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
}
