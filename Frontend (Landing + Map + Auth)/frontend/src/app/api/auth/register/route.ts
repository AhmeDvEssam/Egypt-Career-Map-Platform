import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "This email address is already registered" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name?.trim() || cleanEmail.split("@")[0],
        email: cleanEmail,
        passwordHash,
        provider: "credentials",
        profile: {
          create: {
            headline: "Job Seeker",
            nationality: "Egyptian",
            salaryCurrency: "EGP",
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = generateSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
  }
}
