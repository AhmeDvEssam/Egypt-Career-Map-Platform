import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let user: any = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      user = await prisma.user.findFirst({
        include: {
          profile: {
            include: {
              skills: { include: { skill: true } },
              experiences: { orderBy: { startDate: "desc" } },
              educations: true,
            },
          },
          vaultAnswers: true,
        },
      });
    }

    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        profile: user.profile,
        vaultAnswers: user.vaultAnswers,
      },
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      image,
      coverImage,
      headline,
      bio,
      location,
      category,
      targetRole,
      careerLevel,
      expectedSalary,
      noticePeriod,
      workModePref,
      phoneNumber,
    } = body;

    // 1. Update User level fields (name, image avatar)
    const userUpdateData: any = {};
    if (name !== undefined) userUpdateData.name = name.trim();
    if (image !== undefined) userUpdateData.image = image;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // 2. Update Profile level fields
    const updatedProfile = await prisma.userProfile.update({
      where: { id: user.profile.id },
      data: {
        coverImage: coverImage !== undefined ? coverImage : undefined,
        headline: headline !== undefined ? headline : undefined,
        bio: bio !== undefined ? bio : undefined,
        location: location !== undefined ? location : undefined,
        category: category !== undefined ? category : undefined,
        targetRole: targetRole !== undefined ? targetRole : undefined,
        careerLevel: careerLevel !== undefined ? careerLevel : undefined,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        noticePeriod: noticePeriod !== undefined ? noticePeriod : undefined,
        workModePref: workModePref !== undefined ? workModePref : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
      },
      include: {
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: "desc" } },
        educations: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
