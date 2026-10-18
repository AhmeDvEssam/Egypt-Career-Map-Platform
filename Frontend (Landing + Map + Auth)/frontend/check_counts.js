require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const countLinkedIn = await prisma.job.count({ where: { source: 'LinkedIn' } });
  const countWuzzuf = await prisma.job.count({ where: { source: 'Wuzzuf' } });
  const countIndeed = await prisma.job.count({ where: { source: 'Indeed' } });
  const linkedinNoSkills = await prisma.job.count({ where: { source: 'LinkedIn', skills: { none: {} } } });
  const allNoSkills = await prisma.job.count({ where: { skills: { none: {} } } });
  
  console.log('LinkedIn Total:', countLinkedIn);
  console.log('Wuzzuf Total:', countWuzzuf);
  console.log('Indeed Total:', countIndeed);
  console.log('LinkedIn without skills:', linkedinNoSkills);
  console.log('All jobs without skills:', allNoSkills);
}
main().finally(() => prisma.$disconnect());
