import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Add new experience
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { role, company, location, startDate, endDate, isCurrent, description } = body;

    if (!role || !company || !startDate) {
      return NextResponse.json(
        { error: "Job title, company, and start date are required" },
        { status: 400 }
      );
    }

    const newExp = await prisma.userExperience.create({
      data: {
        profileId: user.profile.id,
        role: role.trim(),
        company: company.trim(),
        location: location ? location.trim() : null,
        startDate: new Date(startDate),
        endDate: isCurrent ? null : (endDate ? new Date(endDate) : null),
        isCurrent: Boolean(isCurrent),
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Experience added successfully",
      experience: newExp,
    });
  } catch (error) {
    console.error("Create Experience Error:", error);
    return NextResponse.json({ error: "Failed to create experience" }, { status: 500 });
  }
}

// PUT: Update existing experience
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { id, role, company, location, startDate, endDate, isCurrent, description } = body;

    if (!id) {
      return NextResponse.json({ error: "Experience ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.userExperience.findUnique({ where: { id } });
    if (!existing || existing.profileId !== user.profile.id) {
      return NextResponse.json({ error: "Experience not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.userExperience.update({
      where: { id },
      data: {
        role: role ? role.trim() : undefined,
        company: company ? company.trim() : undefined,
        location: location !== undefined ? location.trim() : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: isCurrent ? null : (endDate ? new Date(endDate) : undefined),
        isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : undefined,
        description: description !== undefined ? description.trim() : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Experience updated successfully",
      experience: updated,
    });
  } catch (error) {
    console.error("Update Experience Error:", error);
    return NextResponse.json({ error: "Failed to update experience" }, { status: 500 });
  }
}

// DELETE: Delete an experience
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Experience ID is required" }, { status: 400 });
    }

    const existing = await prisma.userExperience.findUnique({ where: { id } });
    if (!existing || existing.profileId !== user.profile.id) {
      return NextResponse.json({ error: "Experience not found or unauthorized" }, { status: 404 });
    }

    await prisma.userExperience.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Experience deleted successfully",
    });
  } catch (error) {
    console.error("Delete Experience Error:", error);
    return NextResponse.json({ error: "Failed to delete experience" }, { status: 500 });
  }
}
