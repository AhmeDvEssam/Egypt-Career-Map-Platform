const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workTypes = await prisma.job.findMany({
    select: { workType: true },
    distinct: ['workType'],
  });
  console.log("Work Types:", workTypes.map(w => w.workType));

  const expLevels = await prisma.job.findMany({
    select: { experienceLevel: true },
    distinct: ['experienceLevel'],
  });
  console.log("Experience Levels:", expLevels.map(e => e.experienceLevel));
}

main().catch(console.error).finally(() => prisma.$disconnect());
