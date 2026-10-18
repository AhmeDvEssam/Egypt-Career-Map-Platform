import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword, generateSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, isDemo } = body;

    // Fast-path: 1-Click Demo Login for smooth testing and development
    if (isDemo) {
      let demoUser = await prisma.user.findFirst({
        where: { email: "mohamed.ahmed@example.com" },
        include: {
          profile: {
            include: {
              skills: { include: { skill: true } },
              experiences: true,
              educations: true,
            },
          },
        },
      });

      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            name: "Mohamed Ahmed",
            email: "mohamed.ahmed@example.com",
            passwordHash: hashPassword("demo123456"),
            provider: "credentials",
            profile: {
              create: {
                headline: "Data Analyst | Power BI, Python, SQL, Dash & Automation",
                bio: "Results-driven Data Analyst with proven experience in Python, SQL, Power BI, and automation.",
                location: "Cairo, Egypt",
                category: "Data & Analytics",
                targetRole: "Data Analyst",
                careerLevel: "Mid-Senior Level",
                expectedSalary: 25000,
                salaryCurrency: "EGP",
                noticePeriod: "Immediately Available",
                workModePref: "Remote / Hybrid",
                phoneNumber: "+20 114 230 6520",
                resumeUrl: "/resumes/Ahmed Essam.pdf",
              },
            },
          },
          include: {
            profile: {
              include: {
                skills: { include: { skill: true } },
                experiences: true,
                educations: true,
              },
            },
          },
        });

        // Seed sample experiences for the demo user
        if (demoUser.profile) {
          await prisma.userExperience.createMany({
            data: [
              {
                profileId: demoUser.profile.id,
                company: "TechNova Egypt",
                role: "Senior Full Stack Developer",
                location: "Cairo",
                startDate: new Date("2023-01-01"),
                isCurrent: true,
                description: "Lead developer for SaaS platform. Scaled architecture and improved query performance by 40%.",
              },
              {
                profileId: demoUser.profile.id,
                company: "Cairo Digital Solutions",
                role: "Frontend Engineer",
                location: "Cairo",
                startDate: new Date("2020-03-01"),
                endDate: new Date("2022-12-31"),
                isCurrent: false,
                description: "Built responsive interactive dashboards using React, Redux, and modern CSS frameworks.",
              },
            ],
          });

          // Connect existing skills to demo user
          const sampleSkills = await prisma.skill.findMany({
            where: {
              name: { in: ["React.js", "Node.js", "Python", "SQL", "TypeScript", "PostgreSQL"] },
            },
            take: 6,
          });

          for (const s of sampleSkills) {
            await prisma.userSkill.create({
              data: {
                profileId: demoUser.profile.id,
                skillId: s.id,
                skillName: s.name,
                level: "Advanced",
              },
            }).catch(() => {});
          }
        }
      }

      const token = generateSessionToken(demoUser.id);
      const cookieStore = await cookies();
      cookieStore.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      return NextResponse.json({
        success: true,
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          profile: demoUser.profile,
        },
      });
    }

    // Standard credential login
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        profile: {
          include: {
            skills: { include: { skill: true } },
            experiences: true,
            educations: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = generateSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
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
    console.error("Login Error:", error);
    return NextResponse.json({ error: "فشل تسجيل الدخول" }, { status: 500 });
  }
}
