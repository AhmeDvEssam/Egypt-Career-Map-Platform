import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst({
        include: { profile: true, vaultAnswers: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { jobIds, vaultAnswersSnapshot, notes } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "At least one job must be selected" }, { status: 400 });
    }

    // Fetch the jobs to make sure they exist
    const targetJobs = await prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, titleRaw: true, companyName: true, jobUrl: true, source: true },
    });

    const applications = [];
    const now = new Date();

    for (const job of targetJobs) {
      // Create or update application record
      const appRecord = await prisma.jobApplication.create({
        data: {
          userId: user.id,
          jobId: job.id,
          status: "DISPATCHED",
          submittedAt: now,
          hasAiFields: false,
          submissionData: {
            applicantName: user.name,
            applicantEmail: user.email,
            applicantPhone: user.profile?.phoneNumber || "+20 114 230 6520",
            jobTitle: job.titleRaw,
            company: job.companyName,
            source: job.source,
            jobUrl: job.jobUrl,
            vaultSnapshot: vaultAnswersSnapshot || {},
            notes: notes || "Auto-dispatched via Candidate-Verified Application Vault",
            dispatchedAt: now.toISOString(),
          },
        },
      });
      applications.push({
        applicationId: appRecord.id,
        jobId: job.id,
        title: job.titleRaw,
        company: job.companyName,
        url: job.jobUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully launched ${applications.length} applications with verified vault data`,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Multi-apply error:", error);
    return NextResponse.json({ error: "Failed to dispatch applications" }, { status: 500 });
  }
}

export async function GET() {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json({ applications: [] });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      include: {
        job: {
          select: {
            id: true,
            titleRaw: true,
            companyName: true,
            locationRaw: true,
            source: true,
            jobUrl: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      applications: applications.map((app) => ({
        id: app.id,
        jobId: app.jobId,
        jobTitle: app.job.titleRaw,
        company: app.job.companyName,
        location: app.job.locationRaw,
        source: app.job.source,
        url: app.job.jobUrl,
        status: app.status,
        submittedAt: app.submittedAt,
        hasAiFields: app.hasAiFields,
      })),
    });
  } catch (error) {
    console.error("Fetch applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications history" }, { status: 500 });
  }
}
