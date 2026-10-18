import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const BACKEND_DIR = path.resolve(process.cwd(), "..", "..", "Backend API & Integration");
const AUTH_FILE = "C:\\Users\\ahmed\\.gemini\\brave_hireq_profile\\auth_state.json";

export async function GET() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
        if (data.authenticated === true) {
          return NextResponse.json({ authenticated: true });
        }
      } catch (_) {}
    }

    const scriptPath = path.join(BACKEND_DIR, "check_auth.py");
    const isAuth = await new Promise<boolean>((resolve) => {
      const py = spawn("python", [scriptPath]);
      let output = "";
      py.stdout.on("data", (d) => { output += d.toString(); });
      py.on("close", () => {
        resolve(output.includes("AUTH_OK: True"));
      });
    });

    return NextResponse.json({ authenticated: isAuth });
  } catch (e: any) {
    return NextResponse.json({ authenticated: false, error: e.message });
  }
}

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
    const { jobId, jobUrl, answers, candidatePhone, action } = body;

    // Action 1: Check Auth
    if (action === "check_auth") {
      if (fs.existsSync(AUTH_FILE)) {
        try {
          const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
          if (data.authenticated === true) {
            return NextResponse.json({ authenticated: true });
          }
        } catch (_) {}
      }

      const scriptPath = path.join(BACKEND_DIR, "check_auth.py");
      const isAuth = await new Promise<boolean>((resolve) => {
        const py = spawn("python", [scriptPath]);
        let output = "";
        py.stdout.on("data", (d) => { output += d.toString(); });
        py.on("close", () => {
          resolve(output.includes("AUTH_OK: True"));
        });
      });
      return NextResponse.json({ authenticated: isAuth });
    }

    // Action 2: Sync session from live Brave or open login
    if (action === "sync_session" || action === "open_login") {
      const syncScript = path.join(BACKEND_DIR, "sync_brave_session.py");
      const synced = await new Promise<boolean>((resolve) => {
        const py = spawn("python", [syncScript]);
        let output = "";
        py.stdout.on("data", (d) => { output += d.toString(); });
        py.on("close", () => {
          resolve(output.includes("SYNC SUCCESS: True"));
        });
      });

      if (synced) {
        return NextResponse.json({
          success: true,
          authenticated: true,
          message: "Successfully synced LinkedIn session directly from your active Brave window!",
        });
      }

      const loginScript = path.join(BACKEND_DIR, "login_helper.py");
      const pyProcess = spawn("python", [loginScript], {
        detached: true,
        stdio: "ignore",
      });
      pyProcess.unref();

      return NextResponse.json({
        success: true,
        authenticated: false,
        message: "Opened Brave browser window for 1-time LinkedIn authentication.",
      });
    }

    if (!jobUrl) {
      return NextResponse.json({ error: "jobUrl is required" }, { status: 400 });
    }

    // Target job record
    let targetJob = null;
    if (jobId) {
      targetJob = await prisma.job.findUnique({ where: { id: jobId } });
    }
    if (!targetJob) {
      targetJob = await prisma.job.findFirst({ where: { jobUrl: jobUrl } });
    }

    const candidateData = {
      name: user.name || "Ahmed Essam",
      email: user.email || "ahmed.essam.eldinn@gmail.com",
      phoneNumber: candidatePhone || user.profile?.phoneNumber || "+20 114 230 6520",
      targetRole: user.profile?.targetRole || "Data Analyst",
      educationMajor: (user.profile as any)?.educations?.[0]?.fieldOfStudy || "Computer Science",
      expectedSalary: user.profile?.expectedSalary ? `${user.profile.expectedSalary} EGP` : "25,000 EGP",
      resumePath: path.resolve(process.cwd(), "public", "resumes", "Ahmed Essam.pdf"),
    };

    const scriptPath = path.join(BACKEND_DIR, "apply_runner.py");

    // Execute Python Selenium Runner (non-headless so user sees it working)
    const runResult: any = await new Promise((resolve) => {
      const py = spawn("python", [
        scriptPath,
        jobUrl,
        JSON.stringify(answers || {}),
        JSON.stringify(candidateData),
      ]);

      let stdout = "";
      let stderr = "";

      py.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      py.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      py.on("close", (code) => {
        try {
          const match = stdout.match(/RUN RESULT:\s*(\{[\s\S]*\})/);
          if (match && match[1]) {
            resolve(JSON.parse(match[1]));
          } else {
            resolve({
              success: code === 0,
              stdout: stdout.trim(),
              status: code === 0 ? "DONE" : "PROCESS_FAILED",
              message: stdout || stderr || `Exited with code ${code}`,
            });
          }
        } catch (e) {
          resolve({ success: false, status: "PARSE_ERROR", message: stdout || stderr });
        }
      });
    });

    // Persist approved answers into user's ApplicationVaultAnswer
    if (answers && typeof answers === "object") {
      for (const [key, val] of Object.entries(answers)) {
        if (typeof val === "string" && val.trim().length > 0) {
          const qKey = key.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 80);
          try {
            await prisma.applicationVaultAnswer.upsert({
              where: {
                userId_questionKey: {
                  userId: user.id,
                  questionKey: qKey,
                },
              },
              update: {
                answerValue: val.trim(),
                updatedAt: new Date(),
              },
              create: {
                userId: user.id,
                questionKey: qKey,
                questionText: key,
                answerValue: val.trim(),
                questionCategory: key.toLowerCase().includes("salary") || key.toLowerCase().includes("major") || key.toLowerCase().includes("notice") ? "GENERAL" : "ROLE_SPECIFIC",
                isAiGenerated: false,
              },
            });
          } catch (vaultErr) {
            console.error("Vault upsert error for key:", key, vaultErr);
          }
        }
      }
    }

    // Record application in PostgreSQL
    if (targetJob) {
      await prisma.jobApplication.create({
        data: {
          userId: user.id,
          jobId: targetJob.id,
          status: runResult.status === "SUBMITTED" ? "SUBMITTED" : "REVIEW_READY",
          submittedAt: new Date(),
          submissionData: {
            jobTitle: targetJob.titleRaw,
            company: targetJob.companyName,
            jobUrl: targetJob.jobUrl,
            answersSnapshot: answers || {},
            candidatePhone: candidateData.phoneNumber,
            automationResult: runResult,
          },
        },
      });
    }

    return NextResponse.json({
      success: runResult.success || runResult.status === "REVIEW_REACHED" || runResult.status === "SUBMITTED",
      result: runResult,
      jobTitle: targetJob?.titleRaw || "Target Job Opening",
      company: targetJob?.companyName || "Company",
    });
  } catch (error) {
    console.error("Apply live error:", error);
    return NextResponse.json({ error: "Failed to run live application" }, { status: 500 });
  }
}
