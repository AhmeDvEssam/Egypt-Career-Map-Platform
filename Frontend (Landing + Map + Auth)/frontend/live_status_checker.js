const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const BATCH_SIZE = 50;

async function checkJobStatus(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Resolve only if status code is less than 500
      }
    });

    const html = response.data;
    const status = response.status;
    const finalUrl = response.request.res.responseUrl || url;

    // 1. Check for 404
    if (status === 404) return true;

    // 2. Check for redirect to search pages (LinkedIn redirects closed jobs to search)
    if (finalUrl.includes('linkedin.com/jobs/search') && !url.includes('/search')) {
      return true;
    }

    // 3. Check for specific text indicating job is closed
    if (html.includes("No longer accepting applications")) return true;
    if (html.includes("This job is no longer available")) return true;
    if (html.includes("Job has expired")) return true;
    if (html.includes("is closed for new applications")) return true;

    return false;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return true;
    }
    // If timeout or other error, assume it's still open to be safe
    return false;
  }
}

async function main() {
  console.log("Starting Live Status Checker...");
  let skip = 0;
  let updatedCount = 0;

  while (true) {
    const jobs = await prisma.job.findMany({
      where: { status: 'Open' },
      select: { id: true, jobUrl: true, titleRaw: true, companyName: true, source: true },
      take: BATCH_SIZE,
      skip: skip,
      orderBy: { postedDate: 'asc' } // Check oldest first
    });

    if (jobs.length === 0) {
      break;
    }

    console.log(`Checking batch of ${jobs.length} jobs (Skip: ${skip})...`);

    const checks = jobs.map(async (job) => {
      const isClosed = await checkJobStatus(job.jobUrl);
      if (isClosed) {
        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'Closed' }
        });
        console.log(`[CLOSED] ${job.titleRaw} at ${job.companyName} (${job.source})`);
        return { closed: true };
      }
      return { closed: false };
    });

    const results = await Promise.all(checks);
    const closedInBatch = results.filter(r => r.closed).length;
    const keptOpenInBatch = results.filter(r => !r.closed).length;

    updatedCount += closedInBatch;

    // Only skip the jobs that REMAINED Open. Jobs that were closed are no longer in the 'Open' pool, 
    // so they effectively shift the array left.
    skip += keptOpenInBatch;

    console.log(`Batch finished. Closed ${closedInBatch} jobs. Total closed: ${updatedCount}`);
    
    // Polite delay between batches
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`Finished checking all jobs. Total updated to Closed: ${updatedCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
