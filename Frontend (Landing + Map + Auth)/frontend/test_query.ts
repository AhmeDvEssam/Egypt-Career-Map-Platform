import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const whereClause: any = {
      status: { in: ['Open', 'open', 'Active', 'active'] }
    };
    
    console.log("Querying...");
    const jobs = await prisma.job.findMany({
      where: whereClause,
      take: 50,
      skip: 0,
      orderBy: {
        postedDate: "desc",
      },
      include: {
        skills: {
          include: { skill: true }
        }
      }
    });
    console.log("Found jobs:", jobs.length);
  } catch (e) {
    console.error("Crash:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
