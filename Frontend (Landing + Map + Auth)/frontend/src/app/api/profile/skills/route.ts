import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAndNormalizeSkill } from "@/lib/skillValidator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { skillName, level } = await request.json();
    if (!skillName) {
      return NextResponse.json({ error: "Skill name is required" }, { status: 400 });
    }

    // 1. Gatekeeper validation
    const validation = await validateAndNormalizeSkill(skillName, user.profile.category);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.reason || "Invalid skill" }, { status: 400 });
    }

    // 2. Add or connect to user profile
    const userSkill = await prisma.userSkill.upsert({
      where: {
        profileId_skillName: {
          profileId: user.profile.id,
          skillName: validation.normalizedName!,
        },
      },
      update: {
        level: level || "Intermediate",
        skillId: validation.skillId,
      },
      create: {
        profileId: user.profile.id,
        skillName: validation.normalizedName!,
        skillId: validation.skillId,
        level: level || "Intermediate",
      },
      include: {
        skill: true,
      },
    });

    return NextResponse.json({
      success: true,
      userSkill,
      isNewVerified: validation.isNew,
      message: validation.isNew
        ? "Skill verified and successfully added to the skills database!"
        : "Skill added to profile successfully",
    });
  } catch (error: any) {
    console.error("Add skill error:", error);
    return NextResponse.json({ error: "Failed to save skill" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const skillName = searchParams.get("skillName");

    if (!skillName) {
      return NextResponse.json({ error: "Skill name is required for removal" }, { status: 400 });
    }

    await prisma.userSkill.deleteMany({
      where: {
        profileId: user.profile.id,
        skillName: { equals: skillName, mode: "insensitive" },
      },
    });

    return NextResponse.json({ success: true, message: "Skill removed from profile" });
  } catch (error) {
    console.error("Delete skill error:", error);
    return NextResponse.json({ error: "Failed to remove skill" }, { status: 500 });
  }
}
