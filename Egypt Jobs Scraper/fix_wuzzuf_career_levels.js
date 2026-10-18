const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log("Fetching Wuzzuf jobs with incorrect career level...");
  const jobs = await prisma.job.findMany({
    where: { 
      source: 'Wuzzuf', 
      careerLevel: { contains: 'year' } 
    },
    select: { id: true, sourceJobId: true, careerLevel: true }
  });
  console.log(`Found ${jobs.length} jobs to fix.`);
  
  let count = 0;
  for (const job of jobs) {
    try {
      const res = await axios.get(`https://wuzzuf.net/api/job/${job.sourceJobId}`);
      const cl = res.data?.data?.attributes?.careerLevel?.name;
      if (cl) {
        await prisma.job.update({ where: { id: job.id }, data: { careerLevel: cl } });
        count++;
        if (count % 100 === 0) console.log(`Fixed ${count}/${jobs.length}...`);
      } else {
        await prisma.job.update({ where: { id: job.id }, data: { careerLevel: 'Not Specified' } });
      }
    } catch(e) {
      await prisma.job.update({ where: { id: job.id }, data: { careerLevel: 'Not Specified' } });
    }
  }
  console.log(`Finished fixing ${count} active jobs. Others marked as Not Specified.`);
})();
