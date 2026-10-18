require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();

// Initialize Gemini
// It will automatically use process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-1.5-flash as it's the fastest and cheapest for this task
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

const BATCH_SIZE = 10;
const DELAY_MS = 2000; // 2 seconds between batches to respect free tier limits

async function extractSkillsWithGemini(description) {
  const prompt = `
  You are an expert technical recruiter. Your task is to extract ONLY the hard technical and professional skills from the following job description.
  Return the result as a strict JSON array of strings. Do not include soft skills like "communication" or "leadership".
  Focus on tools, programming languages, methodologies, frameworks, and specific industry knowledge.
  Make sure the skills are normalized (e.g., "React.js" instead of "React", "Node.js", "Python", "SQL").
  
  Job Description:
  ${description.substring(0, 5000)} // Limit to 5000 chars to save tokens
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const skillsArray = JSON.parse(text);
    return Array.isArray(skillsArray) ? skillsArray : [];
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    return [];
  }
}

async function processJob(job) {
  if (!job.descriptions || job.descriptions.length === 0) return 0;
  
  // Use the primary description or the first one
  const descriptionContent = job.descriptions[0].content;
  if (!descriptionContent || descriptionContent.trim() === '') return 0;

  console.log(`Extracting skills for: ${job.titleRaw} at ${job.companyName}`);
  const extractedSkills = await extractSkillsWithGemini(descriptionContent);

  if (extractedSkills.length === 0) {
    console.log(`  -> No skills extracted.`);
    return 0;
  }

  console.log(`  -> Found skills: ${extractedSkills.join(', ')}`);

  // Insert skills into Database
  let addedCount = 0;
  for (const skillName of extractedSkills) {
    try {
      // 1. Ensure Skill exists in `skills` table
      const skillRecord = await prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: { name: skillName, category: 'Extracted' }
      });

      // 2. Link to Job in `job_skills` table
      await prisma.jobSkill.upsert({
        where: {
          jobId_skillId: {
            jobId: job.id,
            skillId: skillRecord.id
          }
        },
        update: {},
        create: {
          jobId: job.id,
          skillId: skillRecord.id,
          isRequired: true,
          extractedFrom: 'gemini_flash'
        }
      });
      addedCount++;
    } catch (e) {
      // Ignore unique constraint errors
    }
  }
  
  return addedCount > 0 ? 1 : 0;
}

async function main() {
  console.log("Starting Gemini Skill Extractor...");
  console.log("Checking for LinkedIn jobs without skills...");

  let processedCount = 0;
  let updatedJobsCount = 0;

  while (true) {
    // Find jobs that have NO skills
    const jobsWithoutSkills = await prisma.job.findMany({
      where: {
        source: 'LinkedIn', // Focus on LinkedIn first since Wuzzuf usually has skills
        skills: {
          none: {} // This means "where no related records exist in job_skills"
        }
      },
      select: {
        id: true,
        titleRaw: true,
        companyName: true,
        descriptions: {
          take: 1
        }
      },
      take: BATCH_SIZE
    });

    if (jobsWithoutSkills.length === 0) {
      console.log("No more jobs found that need skill extraction!");
      break;
    }

    console.log(`\nProcessing batch of ${jobsWithoutSkills.length} jobs...`);

    const promises = jobsWithoutSkills.map(job => processJob(job));
    const results = await Promise.all(promises);
    
    const successfulUpdates = results.reduce((a, b) => a + b, 0);
    updatedJobsCount += successfulUpdates;
    processedCount += jobsWithoutSkills.length;

    console.log(`Batch complete. Jobs updated: ${successfulUpdates}`);
    console.log(`Total Processed: ${processedCount} | Total Updated: ${updatedJobsCount}`);

    // Wait between batches to respect rate limits
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  console.log("\n=== Extraction Complete ===");
  console.log(`Successfully added skills to ${updatedJobsCount} jobs.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
