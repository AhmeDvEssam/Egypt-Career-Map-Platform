import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intentId, parameters } = body;

    if (!intentId) {
      return NextResponse.json({ error: 'Missing intentId' }, { status: 400 });
    }

    let result = null;

    // --- Deterministic Analysis Engine Router ---
    const originalCity = parameters?.city;
    let city = originalCity;

    if (city) {
      const c = city.toLowerCase();
      if (c.includes("cairo") || c.includes("القاهرة")) city = "Cairo";
      else if (c.includes("giza") || c.includes("gize") || c.includes("الجيزة")) city = "Giza";
      else if (c.includes("alexandria") || c.includes("alex") || c.includes("الاسكندرية") || c.includes("الإسكندرية")) city = "Alexandria";
      else if (c.includes("الدقهلية") || c.includes("dakahlia")) city = "Dakahlia";
      else if (c.includes("البحر الأحمر") || c.includes("red sea")) city = "Red Sea";
      else if (c.includes("البحيرة") || c.includes("beheira")) city = "Beheira";
      else if (c.includes("الفيوم") || c.includes("fayoum")) city = "Fayoum";
      else if (c.includes("الغربية") || c.includes("gharbia")) city = "Gharbia";
      else if (c.includes("الإسماعيلية") || c.includes("ismailia")) city = "Ismailia";
      else if (c.includes("المنوفية") || c.includes("monufya") || c.includes("menofia")) city = "Monufya";
      else if (c.includes("المنيا") || c.includes("minya")) city = "Minya";
      else if (c.includes("القليوبية") || c.includes("qalubia") || c.includes("qalyubia")) city = "Qalubia";
      else if (c.includes("الوادي الجديد") || c.includes("new valley")) city = "New Valley";
      else if (c.includes("السويس") || c.includes("suez")) city = "Suez";
      else if (c.includes("أسوان") || c.includes("aswan")) city = "Aswan";
      else if (c.includes("أسيوط") || c.includes("assiut")) city = "Assiut";
      else if (c.includes("بني سويف") || c.includes("beni suef")) city = "Beni Suef";
      else if (c.includes("بورسعيد") || c.includes("port said")) city = "Port Said";
      else if (c.includes("دمياط") || c.includes("damietta")) city = "Damietta";
      else if (c.includes("الشرقية") || c.includes("sharqia") || c.includes("sharkia")) city = "Sharqia";
      else if (c.includes("جنوب سيناء") || c.includes("south sinai")) city = "South Sinai";
      else if (c.includes("كفر الشيخ") || c.includes("kafr alsheikh") || c.includes("kafr el sheikh")) city = "Kafr Alsheikh";
      else if (c.includes("مطروح") || c.includes("matruh") || c.includes("matrouh")) city = "Matruh";
      else if (c.includes("الأقصر") || c.includes("luxor")) city = "Luxor";
      else if (c.includes("قنا") || c.includes("qena")) city = "Qena";
      else if (c.includes("شمال سيناء") || c.includes("north sinai")) city = "North Sinai";
      else if (c.includes("سوهاج") || c.includes("sohag")) city = "Sohag";
      else if (c.includes("مصر") || c.includes("egypt")) city = "Egypt";
    }

    if (city === "مصر" || city === "Egypt" || city?.toLowerCase() === "egypt") {
      city = null;
    }
    const role = parameters?.role;
    const sector = parameters?.sector;

    const baseWhereClause: any = { status: 'Open' };
    if (city) baseWhereClause.locationNormalized = { contains: city, mode: 'insensitive' };
    if (role) baseWhereClause.titleNormalized = { contains: role, mode: 'insensitive' };
    // We can add sector filtering later via JobIndustry if needed.

    switch (intentId) {
      case 'role_deep_dive':
      case 'job_count': {
        // Example: Get total active jobs for this combination
        const count = await prisma.job.count({
          where: baseWhereClause
        });
        
        // Average salary
        const avgSalaryResult = await prisma.job.aggregate({
          where: { ...baseWhereClause, salaryMin: { not: null }, salaryMax: { not: null } },
          _avg: { salaryMin: true, salaryMax: true }
        });

        const avgMin = avgSalaryResult._avg.salaryMin ? Number(avgSalaryResult._avg.salaryMin) : null;
        const avgMax = avgSalaryResult._avg.salaryMax ? Number(avgSalaryResult._avg.salaryMax) : null;

        let topSkills: any[] = [];
        let workModels: any[] = [];
        let topRoles: any[] = [];
        let topCompanies: any[] = [];

        if (role) {
          const jobs = await prisma.job.findMany({
            where: baseWhereClause,
            select: { id: true, workType: true },
            take: 1000
          });
          const jobIds = jobs.map(j => j.id);

          if (jobIds.length > 0) {
            const skillCounts = await prisma.jobSkill.groupBy({
              by: ['skillId'],
              where: { jobId: { in: jobIds } },
              _count: { skillId: true },
              orderBy: { _count: { skillId: 'desc' } },
              take: 5
            });

            const skillsData = await Promise.all(skillCounts.map(async (sc) => {
              const s = await prisma.skill.findUnique({ where: { id: sc.skillId } });
              return {
                name: s?.name || 'Unknown',
                count: sc._count.skillId,
                pct: Math.min(100, Math.round((sc._count.skillId / Math.max(1, jobIds.length)) * 100))
              };
            }));
            topSkills = skillsData;
          }

          const remoteCount = jobs.filter(j => j.workType?.toLowerCase().includes('remote')).length;
          const hybridCount = jobs.filter(j => j.workType?.toLowerCase().includes('hybrid')).length;
          const onSiteCount = jobs.filter(j => {
            if (!j.workType) return false;
            const wt = j.workType.toLowerCase();
            return !wt.includes('remote') && !wt.includes('hybrid');
          }).length;

          workModels = [
            { name: 'Remote', count: remoteCount },
            { name: 'On-site', count: onSiteCount },
            { name: 'Hybrid', count: hybridCount }
          ];
        } else if (originalCity) {
          const rolesQuery = await prisma.job.groupBy({
            by: ['titleNormalized'],
            where: baseWhereClause,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
          });
          topRoles = rolesQuery.filter(r => r.titleNormalized).map(r => ({
            name: r.titleNormalized,
            count: r._count.id
          }));

          const companiesQuery = await prisma.job.groupBy({
            by: ['companyName'],
            where: baseWhereClause,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
          });
          topCompanies = companiesQuery.filter(c => c.companyName).map(c => ({
            name: c.companyName,
            count: c._count.id
          }));
        }

        result = {
          count,
          avgSalaryMin: avgMin,
          avgSalaryMax: avgMax,
          ...(role && { top_skills: topSkills, work_models: workModels }),
          ...(originalCity && !role && { top_roles: topRoles, top_companies: topCompanies })
        };
        break;
      }

      case 'top_skills': {
        // Fetch top skills required for this combination (e.g. Data Analyst in Alexandria)
        const jobs = await prisma.job.findMany({
          where: baseWhereClause,
          select: { id: true },
          take: 1000 // Increased limit since we might filter heavily
        });

        const jobIds = jobs.map(j => j.id);

        if (jobIds.length === 0) {
          result = { skills: [] };
          break;
        }

        const skillCounts = await prisma.jobSkill.groupBy({
          by: ['skillId'],
          where: { jobId: { in: jobIds } },
          _count: { skillId: true },
          orderBy: { _count: { skillId: 'desc' } },
          take: 5
        });

        // Resolve skill names
        const skillsData = await Promise.all(skillCounts.map(async (sc) => {
          const s = await prisma.skill.findUnique({ where: { id: sc.skillId } });
          return {
            name: s?.name || 'Unknown',
            count: sc._count.skillId,
            pct: Math.min(100, Math.round((sc._count.skillId / Math.max(1, jobIds.length)) * 100))
          };
        }));

        result = { skills: skillsData };
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown intent mapping' }, { status: 404 });
    }

    return NextResponse.json({ data: result });
    
  } catch (error) {
    console.error('Analysis Engine Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
