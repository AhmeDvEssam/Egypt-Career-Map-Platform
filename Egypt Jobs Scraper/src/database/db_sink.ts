import { PrismaClient, Prisma } from '@prisma/client';
import type { JobEntity } from '../core/ScraperInterface';
import type { JobRecord } from '../scrapers/indeed/sinks/CsvSink';
import { extractSkills } from '../normalization';

function parseSalary(raw: string | null | undefined): { min: number | null; max: number | null; currency: string | null } {
  const result = { min: null as number | null, max: null as number | null, currency: null as string | null };
  if (!raw) return result;
  const lower = raw.toLowerCase();
  if (lower.includes('egp') || lower.includes('le') || lower.includes('pounds')) result.currency = 'EGP';
  else if (lower.includes('usd') || lower.includes('$')) result.currency = 'USD';
  else if (lower.includes('eur')) result.currency = 'EUR';
  const numbers = raw.match(/\d+(?:\.\d+)?/g);
  if (numbers) {
    if (numbers.length >= 2) { result.min = parseFloat(numbers[0]); result.max = parseFloat(numbers[1]); }
    else if (numbers.length === 1) result.min = parseFloat(numbers[0]);
  }
  return result;
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  try { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; } catch { return null; }
}

const globalForDb = globalThis as unknown as { _dbWriterPrisma: PrismaClient | undefined };

export class DbWriter {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = globalForDb._dbWriterPrisma ?? new PrismaClient();
    globalForDb._dbWriterPrisma = this.prisma;
  }

  async upsertJobEntity(entity: JobEntity, source: string): Promise<void> {
    const salary = parseSalary(entity.salary);
    const postedDate = parseDate(entity.posted_time);
    const normalizedTitle = entity.title?.trim() || '';
    const normalizedLocation = entity.location?.trim() || '';
    const description = entity.description || '';
    const requirements = entity.requirements || '';
    const extractedSkills = extractSkills(description + ' ' + requirements);
    const sourceJobId = entity.source_job_id || `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const job = await this.prisma.job.upsert({
        where: { source_sourceJobId: { source, sourceJobId } },
        create: {
          source,
          sourceJobId,
          titleRaw: entity.title || '',
          titleNormalized: normalizedTitle,
          companyName: entity.company_name || '',
          companyUrl: entity.company_url || null,
          locationRaw: entity.location || '',
          locationNormalized: normalizedLocation,
          jobType: entity.job_type || null,
          workType: entity.work_type || entity.work_mode || null,
          careerLevel: entity.career_level || null,
          educationLevel: entity.education_level || null,
          jobCategory: entity.job_categories || entity.industry || null,
          salaryMin: salary.min,
          salaryMax: salary.max,
          currency: salary.currency,
          jobUrl: entity.url || '',
          postedDate,
          status: entity.job_status || 'Open',
          sourceRaw: JSON.parse(JSON.stringify(entity)) as Prisma.InputJsonValue,
        },
        update: {
          titleRaw: entity.title || '',
          titleNormalized: normalizedTitle,
          companyName: entity.company_name || '',
          companyUrl: entity.company_url || null,
          locationRaw: entity.location || '',
          locationNormalized: normalizedLocation,
          jobType: entity.job_type || null,
          workType: entity.work_type || entity.work_mode || null,
          careerLevel: entity.career_level || null,
          educationLevel: entity.education_level || null,
          jobCategory: entity.job_categories || entity.industry || null,
          salaryMin: salary.min,
          salaryMax: salary.max,
          currency: salary.currency,
          jobUrl: entity.url || '',
          postedDate,
          status: entity.job_status || 'Open',
          sourceRaw: JSON.parse(JSON.stringify(entity)) as Prisma.InputJsonValue,
        },
      });

      await this.writeDescriptions(job.id, description, requirements);
      await this.writeSkills(job.id, extractedSkills);
    } catch (err) {
      console.error(`[DbWriter] Error upserting job ${sourceJobId}:`, err);
    }
  }

  async upsertJobRecord(record: JobRecord): Promise<void> {
    const salary = parseSalary('');
    const postedDate = parseDate(record.postedDate);
    const description = record.description || '';
    const extractedSkills = extractSkills(description);
    const sourceJobId = record.jobKey || `indeed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const job = await this.prisma.job.upsert({
        where: { source_sourceJobId: { source: record.source || 'Indeed', sourceJobId } },
        create: {
          source: record.source || 'Indeed',
          sourceJobId,
          titleRaw: record.title || '',
          titleNormalized: record.title || '',
          companyName: record.company || '',
          companyUrl: null,
          locationRaw: record.location || '',
          locationNormalized: record.location || '',
          jobType: record.jobType || null,
          workType: record.workType || null,
          careerLevel: record.careerLevel || null,
          educationLevel: null,
          jobCategory: record.category || null,
          salaryMin: salary.min,
          salaryMax: salary.max,
          currency: salary.currency,
          jobUrl: record.url || '',
          postedDate,
          status: 'Open',
          sourceRaw: JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue,
        },
        update: {
          titleRaw: record.title || '',
          titleNormalized: record.title || '',
          companyName: record.company || '',
          locationRaw: record.location || '',
          locationNormalized: record.location || '',
          jobType: record.jobType || null,
          workType: record.workType || null,
          careerLevel: record.careerLevel || null,
          jobCategory: record.category || null,
          jobUrl: record.url || '',
          postedDate,
          sourceRaw: JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue,
        },
      });

      await this.writeDescriptions(job.id, description, '');
      await this.writeSkills(job.id, extractedSkills);
    } catch (err) {
      console.error(`[DbWriter] Error upserting Indeed job ${sourceJobId}:`, err);
    }
  }

  private async writeDescriptions(jobId: string, description: string, requirements: string): Promise<void> {
    if (description) {
      const existing = await this.prisma.jobDescription.findFirst({ where: { jobId, type: 'description' } });
      if (existing) {
        await this.prisma.jobDescription.update({ where: { id: existing.id }, data: { content: description } });
      } else {
        await this.prisma.jobDescription.create({ data: { jobId, type: 'description', content: description, isPrimary: true } });
      }
    }
    if (requirements) {
      const existing = await this.prisma.jobDescription.findFirst({ where: { jobId, type: 'requirements' } });
      if (existing) {
        await this.prisma.jobDescription.update({ where: { id: existing.id }, data: { content: requirements } });
      } else {
        await this.prisma.jobDescription.create({ data: { jobId, type: 'requirements', content: requirements, isPrimary: false } });
      }
    }
  }

  private async writeSkills(jobId: string, skillNames: string[]): Promise<void> {
    for (const name of skillNames) {
      try {
        const skill = await this.prisma.skill.upsert({ where: { name }, create: { name }, update: {} });
        await this.prisma.jobSkill.upsert({
          where: { jobId_skillId: { jobId, skillId: skill.id } },
          create: { jobId, skillId: skill.id, isRequired: true, extractedFrom: 'ai_extraction' },
          update: {},
        });
      } catch { /* ignore duplicate collisions */ }
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

let defaultWriter: DbWriter | null = null;

export function getDbWriter(): DbWriter {
  if (!defaultWriter) defaultWriter = new DbWriter();
  return defaultWriter;
}
