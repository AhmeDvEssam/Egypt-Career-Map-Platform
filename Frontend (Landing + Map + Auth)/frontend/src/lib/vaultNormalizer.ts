/**
 * HireQ Smart Vault Value Normalizer
 * Converts candidate vault answers into any target ATS input format:
 * - Number conversion (e.g. "3 - 5 Years" -> 4, "$1,200 USD" -> 1200)
 * - Boolean conversion (e.g. "Yes" -> true, "No" -> false)
 * - Dropdown / Select fuzzy matching with intelligent fallbacks
 */

export function normalizeToNumber(rawVal: string | number | null | undefined): number {
  if (rawVal === null || rawVal === undefined) return 0;
  if (typeof rawVal === "number") return rawVal;

  const str = String(rawVal).trim().toLowerCase();
  if (!str || str === "none" || str === "no" || str === "false") return 0;

  // Pattern 1: Range like "3 - 5 Years" or "3-5" -> average (4)
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return Math.round((min + max) / 2);
  }

  // Pattern 2: "8+ Years" or "Less than 1 Year"
  if (str.includes("less than") || str.includes("<")) {
    const num = str.match(/(\d+(?:\.\d+)?)/);
    return num ? Math.max(0, parseFloat(num[1]) - 0.5) : 0;
  }
  if (str.includes("+") || str.includes("more than") || str.includes(">")) {
    const num = str.match(/(\d+(?:\.\d+)?)/);
    return num ? parseFloat(num[1]) : 8;
  }

  // Pattern 3: Currency / general numeric stripping (e.g. "$1,200 USD" -> 1200)
  const cleaned = str.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function normalizeToBoolean(rawVal: string | boolean | null | undefined): boolean {
  if (typeof rawVal === "boolean") return rawVal;
  if (!rawVal) return false;
  const str = String(rawVal).trim().toLowerCase();
  return ["yes", "y", "true", "1", "available", "immediately", "comfortable"].some((kw) => str.includes(kw));
}

export function normalizeToSelect(
  rawVal: string,
  availableOptions: string[],
  fallbackDefault = ""
): string {
  if (!rawVal || availableOptions.length === 0) return fallbackDefault || availableOptions[0] || "";

  const clean = rawVal.trim().toLowerCase();

  // 1. Exact or lowercase match
  const exact = availableOptions.find((opt) => opt.trim().toLowerCase() === clean);
  if (exact) return exact;

  // 2. Substring or partial match
  const partial = availableOptions.find((opt) => {
    const optLower = opt.toLowerCase();
    return optLower.includes(clean) || clean.includes(optLower);
  });
  if (partial) return partial;

  // 3. Number-based match for years of experience or notice period
  const rawNum = normalizeToNumber(rawVal);
  if (rawNum > 0) {
    for (const opt of availableOptions) {
      const optNum = normalizeToNumber(opt);
      if (optNum > 0 && Math.abs(optNum - rawNum) <= 1.5) {
        return opt;
      }
    }
  }

  // 4. Safe fallback: "Other" or first option
  const otherOpt = availableOptions.find((opt) => opt.toLowerCase().includes("other"));
  return otherOpt || availableOptions[0];
}
