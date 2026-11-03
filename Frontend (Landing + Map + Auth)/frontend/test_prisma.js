const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: { in: ['Open', 'open', 'Active', 'active'] }
      },
      take: 2,
      include: {
        skills: {
          include: { skill: true }
        }
      }
    });
    console.log("Jobs found:", jobs.length);
    console.log(JSON.stringify(jobs, null, 2));
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
