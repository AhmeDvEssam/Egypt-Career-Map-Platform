import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SECRET_SALT = process.env.AUTH_SECRET || "egypt-career-map-secure-salt-2026";

export function hashPassword(password: string): string {
  return crypto.scryptSync(password, SECRET_SALT, 64).toString("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const computed = crypto.scryptSync(password, SECRET_SALT, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function generateSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET_SALT).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = crypto.createHmac("sha256", SECRET_SALT).update(payload).digest("base64url");
    if (signature !== expected) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.userId || null;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookie(allowFallback: boolean = true) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    const userId = verifySessionToken(token);
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              skills: { include: { skill: true } },
              experiences: { orderBy: { startDate: "desc" } },
              educations: { orderBy: { startYear: "desc" } },
            },
          },
          vaultAnswers: true,
        },
      });
      if (user) return user;
    }
  }

  // Graceful fallback for single-user local deployment & demo candidate session
  if (allowFallback) {
    let user: any = await prisma.user.findFirst({
      include: {
        profile: {
          include: {
            skills: { include: { skill: true } },
            experiences: { orderBy: { startDate: "desc" } },
            educations: { orderBy: { startYear: "desc" } },
          },
        },
        vaultAnswers: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "candidate@hireq.online",
          name: "Ahmed Essam",
          role: "JOB_SEEKER",
          profile: {
            create: {
              headline: "Senior Data & Analytics Engineer",
              targetRole: "Data Analyst",
              location: "Cairo, Egypt",
            },
          },
        },
        include: {
          profile: {
            include: {
              skills: { include: { skill: true } },
              experiences: { orderBy: { startDate: "desc" } },
              educations: { orderBy: { startYear: "desc" } },
            },
          },
          vaultAnswers: true,
        },
      });
    }

    return user;
  }

  return null;
}
