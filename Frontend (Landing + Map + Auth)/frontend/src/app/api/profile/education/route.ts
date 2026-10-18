import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Add new education
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { institution, degree, fieldOfStudy, startYear, endYear } = body;

    if (!institution || !degree) {
      return NextResponse.json(
        { error: "Institution and degree are required" },
        { status: 400 }
      );
    }

    const newEdu = await prisma.userEducation.create({
      data: {
        profileId: user.profile.id,
        institution: institution.trim(),
        degree: degree.trim(),
        fieldOfStudy: fieldOfStudy ? fieldOfStudy.trim() : null,
        startYear: startYear ? Number(startYear) : null,
        endYear: endYear ? Number(endYear) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Education added successfully",
      education: newEdu,
    });
  } catch (error) {
    console.error("Create Education Error:", error);
    return NextResponse.json({ error: "Failed to create education" }, { status: 500 });
  }
}

// PUT: Update existing education
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { id, institution, degree, fieldOfStudy, startYear, endYear } = body;

    if (!id) {
      return NextResponse.json({ error: "Education ID is required" }, { status: 400 });
    }

    const existing = await prisma.userEducation.findUnique({ where: { id } });
    if (!existing || existing.profileId !== user.profile.id) {
      return NextResponse.json({ error: "Education not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.userEducation.update({
      where: { id },
      data: {
        institution: institution ? institution.trim() : undefined,
        degree: degree ? degree.trim() : undefined,
        fieldOfStudy: fieldOfStudy !== undefined ? fieldOfStudy.trim() : undefined,
        startYear: startYear !== undefined ? Number(startYear) : undefined,
        endYear: endYear !== undefined ? Number(endYear) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Education updated successfully",
      education: updated,
    });
  } catch (error) {
    console.error("Update Education Error:", error);
    return NextResponse.json({ error: "Failed to update education" }, { status: 500 });
  }
}

// DELETE: Delete education
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Education ID is required" }, { status: 400 });
    }

    const existing = await prisma.userEducation.findUnique({ where: { id } });
    if (!existing || existing.profileId !== user.profile.id) {
      return NextResponse.json({ error: "Education not found or unauthorized" }, { status: 404 });
    }

    await prisma.userEducation.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Education deleted successfully",
    });
  } catch (error) {
    console.error("Delete Education Error:", error);
    return NextResponse.json({ error: "Failed to delete education" }, { status: 500 });
  }
}
