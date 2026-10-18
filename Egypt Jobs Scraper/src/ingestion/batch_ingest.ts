import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { normalizeLocation, normalizeTitle, extractSkills } from '../normalization';
import type { CsvRow, IngestionStats, ParsedSalary, JobSource, FileConfig } from '../types';

const BATCH_SIZE = 500;

const prisma = new PrismaClient();

function detectSource(filePath: string, row: Record<string, unknown>): JobSource {
  if (row['Source'] === 'LinkedIn' || row['source'] === 'LinkedIn') return 'LinkedIn';
  if (row['Source'] === 'Indeed' || row['source'] === 'Indeed') return 'Indeed';
  if (row['Source'] === 'Wuzzuf' || row['source'] === 'Wuzzuf') return 'Wuzzuf';
  if (row['Source'] === 'Bayt' || row['source'] === 'Bayt') return 'Bayt';
  if (row['Source'] === 'Forasna' || row['source'] === 'Forasna') return 'Forasna';

  const lower = filePath.toLowerCase();
  if (lower.includes('indeed')) return 'Indeed';
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('wuzzuf')) return 'Wuzzuf';
  if (lower.includes('bayt')) return 'Bayt';
  if (lower.includes('forasna')) return 'Forasna';

  return 'LinkedIn';
}

function extractSourceId(source: JobSource, url: string, rowId?: string | number): string {
  if (rowId) return String(rowId);

  try {
    if (!url) return `unknown-${Date.now()}-${Math.random()}`;

    if (source === 'Indeed') {
      const u = new URL(url);
      const jk = u.searchParams.get('jk');
      if (jk) return jk;
      const match = url.match(/jk=([a-f0-9]+)/);
      return match ? match[1] : `indeed-${Buffer.from(url).toString('base64').substring(0, 20)}`;
    }

    if (source === 'Wuzzuf') {
      const match = url.match(/\/(?:p|internship)\/([a-zA-Z0-9]+)\b/);
      return match ? match[1] : url.split('/').pop()?.split('-')[0] ?? `wuzzuf-${Date.now()}`;
    }

    if (source === 'Forasna') {
      const match = url.match(/-(\d+)\/?$/);
      return match ? match[1] : `forasna-${Buffer.from(url).toString('base64').substring(0, 20)}`;
    }

    if (source === 'Bayt') {
      const match = url.match(/-(\d+)\/?$/);
      return match ? match[1] : `bayt-${Buffer.from(url).toString('base64').substring(0, 20)}`;
    }

    if (source === 'LinkedIn') {
      const viewMatch = url.match(/\/view\/(\d{7,})\/?/) || url.match(/-(\d{7,})\/?$/);
      if (viewMatch) return viewMatch[1];
      const match = url.match(/currentJobId=(\d+)/);
      return match ? match[1] : `linkedin-${Buffer.from(url).toString('base64').substring(0, 20)}`;
    }
  } catch (e) {
    if (url) return `err-${Buffer.from(url).toString('base64').substring(0, 20)}`;
    return `error-${Date.now()}`;
  }

  if (url) return `fallback-${Buffer.from(url).toString('base64').substring(0, 20)}`;
  return `generated-${Date.now()}-${Math.random()}`;
}

function parseSalary(salaryStr: string | null | undefined): ParsedSalary {
  const result: ParsedSalary = { min: null, max: null, currency: null };

  if (!salaryStr) return result;

  const lower = salaryStr.toLowerCase();

  if (lower.includes('egp') || lower.includes('le') || lower.includes('pounds')) result.currency = 'EGP';
  else if (lower.includes('usd') || lower.includes('$')) result.currency = 'USD';
  else if (lower.includes('eur')) result.currency = 'EUR';

  const numbers = salaryStr.match(/\d+(?:\.\d+)?/g);
  if (numbers) {
    if (numbers.length >= 2) {
      result.min = parseFloat(numbers[0]);
      result.max = parseFloat(numbers[1]);
    } else if (numbers.length === 1) {
      result.min = parseFloat(numbers[0]);
    }
  }

  return result;
}

function parseDate(raw: unknown): string | undefined {
  if (!raw) return undefined;
  try {
    const d = new Date(String(raw));
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

function safeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function normalizeRow(row: Record<string, unknown>, source: JobSource): CsvRow {
  const title = safeString(row['Job Title'] || row['title'] || row['Title']);
  const location = safeString(row['Location'] || row['location']);
  const description = safeString(row['Description'] || row['description']);
  
  let companyUrl = safeString(row['Company URL'] || row['company_url']);
  if (!companyUrl) companyUrl = undefined as any;

  return {
    source,
    sourceJobId: extractSourceId(source, safeString(row['Job URL'] || row['url']), safeString(row['Job Id'])),
    title,
    titleNormalized: normalizeTitle(title),
    companyName: safeString(row['Company Name'] || row['company_name'] || row['Company']),
    companyUrl: companyUrl,
    locationRaw: location,
    locationNormalized: normalizeLocation(location),
    description,
    requirements: safeString(row['Requirements'] || row['requirements']),
    jobUrl: safeString(row['Job URL'] || row['url']),
    postedDate: parseDate(row['Posted Date Raw'] || row['Posted Time'] || row['posted_time'] || row['posted_date']),
    jobType: safeString(row['Job Type'] || row['job_type']),
    workType: safeString(row['Work Type'] || row['work_type']),
    experienceLevel: safeString(row['Experience Level'] || row['Experience Needed'] || row['experience_level']),
    careerLevel: safeString(row['Career Level'] || row['career_level']),
    educationLevel: safeString(row['Education Level'] || row['education_level']),
    jobCategory: safeString(row['Job Category'] || row['job_category'] || row['category']),
    salaryRaw: safeString(row['Salary'] || row['salary']),
  };
}

async function ingestBatch(rows: CsvRow[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  await prisma.$transaction(async (tx: any) => {
    for (const row of rows) {
      const salary = parseSalary(row.salaryRaw);
      const description = row.description || '';
      const requirements = row.requirements || '';
      const extractedSkills = extractSkills(description + ' ' + requirements);

      const titleNormalized = normalizeTitle(row.title);
      const locationNormalized = normalizeLocation(row.locationRaw || '');

      const job = await tx.job.upsert({
        where: {
          source_sourceJobId: {
            source: row.source,
            sourceJobId: row.sourceJobId,
          },
        },
        create: {
          source: row.source,
          sourceJobId: row.sourceJobId,
          titleRaw: row.title,
          titleNormalized,
          companyName: row.companyName,
          companyUrl: row.companyUrl,
          locationRaw: row.locationRaw || '',
          locationNormalized,
          jobType: row.jobType || null,
          workType: row.workType || null,
          careerLevel: row.careerLevel || null,
          educationLevel: row.educationLevel || null,
          jobCategory: row.jobCategory || null,
          salaryMin: salary.min,
          salaryMax: salary.max,
          currency: salary.currency,
          jobUrl: row.jobUrl,
          postedDate: row.postedDate ? new Date(row.postedDate) : null,
          status: 'Open',
          sourceRaw: JSON.parse(JSON.stringify(row)),
        },
        update: {
          titleRaw: row.title,
          titleNormalized,
          companyName: row.companyName,
          companyUrl: row.companyUrl,
          locationRaw: row.locationRaw || '',
          locationNormalized,
          jobType: row.jobType || null,
          workType: row.workType || null,
          careerLevel: row.careerLevel || null,
          educationLevel: row.educationLevel || null,
          jobCategory: row.jobCategory || null,
          salaryMin: salary.min,
          salaryMax: salary.max,
          currency: salary.currency,
          jobUrl: row.jobUrl,
          postedDate: row.postedDate ? new Date(row.postedDate) : null,
          status: 'Open',
          sourceRaw: JSON.parse(JSON.stringify(row)),
        },
      });

      if (row.description) {
        const existing = await tx.jobDescription.findFirst({
          where: { jobId: job.id, type: 'description' },
        });
        if (existing) {
          await tx.jobDescription.update({
            where: { id: existing.id },
            data: { content: row.description },
          });
        } else {
          await tx.jobDescription.create({
            data: {
              jobId: job.id,
              type: 'description',
              content: row.description,
              isPrimary: true,
            },
          });
        }
      }

      if (requirements) {
        const existingReq = await tx.jobDescription.findFirst({
          where: { jobId: job.id, type: 'requirements' },
        });
        if (existingReq) {
          await tx.jobDescription.update({
            where: { id: existingReq.id },
            data: { content: requirements },
          });
        } else {
          await tx.jobDescription.create({
            data: {
              jobId: job.id,
              type: 'requirements',
              content: requirements,
              isPrimary: false,
            },
          });
        }
      }

      for (const skillName of extractedSkills) {
        const skill = await tx.skill.upsert({
          where: { name: skillName },
          create: { name: skillName },
          update: {},
        });

        await tx.jobSkill.upsert({
          where: {
            jobId_skillId: { jobId: job.id, skillId: skill.id },
          },
          create: {
            jobId: job.id,
            skillId: skill.id,
            isRequired: true,
            extractedFrom: 'ai_extraction',
          },
          update: {},
        }).catch(() => {});
      }

      inserted++;
    }
  });

  return { inserted, updated };
}

export async function batchIngest(fileConfigs?: FileConfig[]): Promise<IngestionStats[]> {
  const results: IngestionStats[] = [];

  const files: FileConfig[] = fileConfigs ?? [
    { path: 'data/linkedin_clean_data.csv', source: 'LinkedIn' },
    { path: 'data/indeed_clean_data_v2.csv', source: 'Indeed' },
    { path: 'data/wuzzuf_clean_data_v3.csv', source: 'Wuzzuf' },
    { path: 'data/bayt_clean_data_v3.csv', source: 'Bayt' },
    { path: 'data/forasna_clean_data_v1.csv', source: 'Forasna' },
  ];

  for (const f of files) {
    const absolutePath = path.resolve(process.cwd(), f.path);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`[Ingest] ⚠️ File not found, skipping: ${absolutePath}`);
      continue;
    }

    console.log(`\n[Ingest] 📂 Processing: ${f.path}`);
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    console.log(`[Ingest] 📊 Found ${rawRows.length} rows.`);

    const stats: IngestionStats = {
      file: f.path,
      totalRows: rawRows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    const normalizedRows: CsvRow[] = [];

    for (const raw of rawRows) {
      const source = detectSource(f.path, raw);
      const row = normalizeRow(raw, source);

      if (!row.title || !row.jobUrl) {
        stats.skipped++;
        continue;
      }

      normalizedRows.push(row);
    }

    for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
      const batch = normalizedRows.slice(i, i + BATCH_SIZE);
      try {
        const result = await ingestBatch(batch);
        stats.inserted += result.inserted;
        stats.updated += result.updated;
        process.stdout.write(`\r[Ingest] ✅ ${Math.min(i + BATCH_SIZE, normalizedRows.length)} / ${normalizedRows.length} rows processed`);
      } catch (err) {
        stats.errors += batch.length;
        console.error(`\n[Ingest] ❌ Batch failed at offset ${i}:`, err);
      }
    }

    console.log(`\n[Ingest] ✨ Finished ${f.path}: +${stats.inserted} inserted, ~${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
    results.push(stats);
  }

  await prisma.$disconnect();
  return results;
}
