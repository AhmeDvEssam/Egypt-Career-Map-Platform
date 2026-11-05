import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * HireQ Local PDF Text Extractor
 * Tier 1: In-memory pdf-parse (v2)
 * Tier 2: High-Performance Python PDFium (C:\Python314\python.exe or python in PATH)
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  let text = "";

  // 1. Try in-memory pdf-parse (v2)
  try {
    const pdfParseModule = await import("pdf-parse");
    const PDFParse = pdfParseModule.PDFParse || (pdfParseModule as any).default?.PDFParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: buffer });
      try {
        const res = await parser.getText();
        text = res.text || "";
      } finally {
        await parser.destroy();
      }
    }
  } catch (err) {
    console.warn("Direct pdf-parse in Node failed, trying local PDFium fallback:", err);
  }

  if (text.trim().length >= 40) {
    return text;
  }

  // 2. High-performance Python PDFium Extractor
  const tempPath = path.join(os.tmpdir(), `cv_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  const pythonScript = path.resolve("d:\\Hire Q Project\\Backend API & Integration\\extract_cv_text.py");

  const pythonExecutables = [
    "C:\\Python314\\python.exe",
    "python",
    "C:\\Users\\ahmed\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
    "py",
  ];

  try {
    fs.writeFileSync(tempPath, buffer);

    for (const pyExe of pythonExecutables) {
      try {
        const { stdout } = await execFileAsync(pyExe, [pythonScript, tempPath], {
          maxBuffer: 20 * 1024 * 1024,
          timeout: 15000,
        });
        const pyText = String(stdout).trim();
        if (pyText.length >= 20) {
          text = pyText;
          break;
        }
      } catch (subErr) {
        // Continue to next executable
      }
    }
  } catch (pyErr) {
    console.error("Local Python PDFium fallback error:", pyErr);
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
  }

  return text;
}
