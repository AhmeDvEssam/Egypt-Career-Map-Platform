import { LinkedInBrowserScraper } from './scrapers/linkedin/LinkedInBrowserScraper';
import { JobCollector } from './scrapers/JobCollector';
import { networkHealth } from './utils/NetworkHealthCheck';
import { keepAwake } from './utils/KeepAwake';
import { StateTracker } from './utils/StateTracker';
import { KEYWORD_DATABASE } from './LinkedInManager';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

const CSV_FILE = path.join(__dirname, '../data/linkedin_clean_data.csv');

// Promisify readline for CLI interaction
function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

import { askResumeOrRestart } from './utils/promptResume';

async function startV2() {
    await askResumeOrRestart('LinkedIn');
    console.log(`
================================================
   🚀 LinkedIn Scraper V2 (PARALLEL MODE) 🚀
================================================
⚠️ WARNING: Running too many tabs in parallel 
can cause high RAM usage and temporary IP bans.
================================================
`);

    const allKeywords = KEYWORD_DATABASE.map(k => k.keyword);
    
    // --- 1. PRINT GRID VIEW ---
    console.log(`\n================================================`);
    console.log(`       DATABASE KEYWORDS (${allKeywords.length} Total)       `);
    console.log(`================================================`);
    
    let gridOut = "";
    const cols = 4;
    const colWidth = 28;
    const rows = Math.ceil(allKeywords.length / cols);
    
    for (let r = 0; r < rows; r++) {
        let line = "";
        for (let c = 0; c < cols; c++) {
            const idx = r + c * rows; // Column-major order
            if (idx < allKeywords.length) {
                const displayStr = `[${idx + 1}] ${allKeywords[idx]}`;
                line += displayStr.padEnd(colWidth, " ");
            }
        }
        gridOut += line + "\n";
    }
    console.log(gridOut);
    
    // --- 2. CLI PROMPTS ---
    const concurrentInput = await askQuestion('\n👉 How many TABS to open at the same time? (Default 1, Max 5): ');
    const concurrency = Math.min(Math.max(parseInt(concurrentInput) || 1, 1), 5);
    
    console.log('\n================================================');
    console.log('                 CUSTOMIZATION                  ');
    console.log('================================================');
    console.log('You can prioritize certain keywords to be scraped FIRST.');
    console.log('After finishing them, the scraper will AUTOMATICALLY continue with the rest of the database.');
    
    const startInput = await askQuestion('\n👉 Enter numbers/words to START WITH (e.g. 1, 5, React) or press ENTER to run default order: ');
    
    const extraInput = await askQuestion('👉 Enter any NEW keywords to add to the database (or press ENTER): ');
    
    let startList: string[] = [];
    let extraList: string[] = [];
    
    // Parse Start Input
    if (startInput.trim()) {
        const parts = startInput.split(',').map(s => s.trim()).filter(s => s);
        for (const p of parts) {
            const num = parseInt(p);
            if (!isNaN(num) && num > 0 && num <= allKeywords.length) {
                startList.push(allKeywords[num - 1]);
            } else {
                startList.push(p);
            }
        }
    }
    
    // Parse Extra Input
    if (extraInput.trim()) {
        extraList = extraInput.split(',').map(s => s.trim()).filter(s => s);
    }
    
    const reverseInput = await askQuestion('👉 Do you want to start the REMAINING list in REVERSE order? (y/N): ');
    
    // --- 3. BUILD FINAL LIST ---
    // Remove duplicates from the remaining list
    let remaining = allKeywords.filter(k => !startList.includes(k) && !extraList.includes(k));
    
    if (reverseInput.toLowerCase() === 'y') {
        remaining.reverse();
    }
    
    const targetKeywords = [...startList, ...extraList, ...remaining];
    const isInfiniteLoop = true; // Always infinite loop mode for this new architecture
    
    console.log(`\n✅ Starting V2 with ${concurrency} concurrent tabs.`);
    console.log(`✅ Total Targets: ${targetKeywords.length}`);
    if (startList.length > 0) console.log(`   Priority Start: ${startList.join(', ')}`);
    if (extraList.length > 0) console.log(`   Added New: ${extraList.join(', ')}`);
    
    // Initialize State & Collector
    const stateTracker = new StateTracker('linkedin_v2');
    
    const scrapers: LinkedInBrowserScraper[] = [];
    for (let i = 0; i < concurrency; i++) {
        const s = new LinkedInBrowserScraper();
        scrapers.push(s);
    }
    
    const collector = new JobCollector(scrapers[0] as any, CSV_FILE);
    
    // Worker function for parallel execution
    async function processKeyword(keyword: string, scraper: LinkedInBrowserScraper, workerId: number) {
        if (stateTracker.isKeywordCompleted(keyword)) {
            console.log(`[Worker ${workerId}] ⏭️ Skipping "${keyword}", already completed in previous interrupted run.`);
            return;
        }
        
        console.log(`\n[Worker ${workerId}] 🔎 Starting Discovery for: "${keyword}"`);
        
        try {
            await networkHealth.waitForNetwork();
            
            const discovered = await networkHealth.executeWithRetry(
                () => scraper.discoverJobs(keyword),
                3,
                `Discover "${keyword}"`
            );
            
            if (!discovered || discovered.length === 0) {
                console.log(`[Worker ${workerId}] ❌ No jobs found for "${keyword}". Marking completed.`);
                stateTracker.markKeywordCompleted(keyword);
                return;
            }
            
            const knownIds = collector.getKnownIds();
            const newJobs = discovered.filter(j => !knownIds.has(j.source_job_id));
            console.log(`[Worker ${workerId}] 💡 "${keyword}": ${newJobs.length} NEW jobs out of ${discovered.length} total.`);
            
            if (newJobs.length === 0) {
                stateTracker.markKeywordCompleted(keyword);
                return;
            }
            
            let savedCount = 0;
            for (const partialJob of newJobs) {
                if (knownIds.has(partialJob.source_job_id)) continue;
                
                await networkHealth.waitForNetwork();
                
                const detailed = await networkHealth.executeWithRetry(
                    () => scraper.scrapeJobDetail(partialJob.source_job_id, partialJob),
                    2,
                    `Detail ${partialJob.source_job_id}`
                );
                
                if (detailed) {
                    try {
                        await collector.saveJobs([detailed as any]);
                        knownIds.add(detailed.job_id || partialJob.source_job_id);
                        savedCount++;
                    } catch (e) {
                        console.error(`[Worker ${workerId}] ❌ Save failed for ${partialJob.source_job_id}`);
                    }
                }
                
                // Anti-bot delay
                await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000));
            }
            
            console.log(`[Worker ${workerId}] ✅ Finished "${keyword}". Saved: ${savedCount}/${newJobs.length}.`);
            stateTracker.markKeywordCompleted(keyword);
            
        } catch (err: any) {
            console.error(`[Worker ${workerId}] ⚠️ Error processing "${keyword}": ${err.message}`);
        }
    }
    
    keepAwake.start();
    
    // INFINITE LOOP MODE
    let cycleCount = 1;
    while (true) {
        console.log(`\n================================================`);
        console.log(`   🔄 STARTING V2 CYCLE #${cycleCount} `);
        console.log(`================================================\n`);
        
        // Refresh knowledge base at start of cycle
        const knownIds = collector.getKnownIds();
        console.log(`[Manager V2] 🛡️ Knowledge Base: ${knownIds.size} unique Job IDs`);

        let index = 0;
        
        // Worker Controller
        async function worker(workerId: number) {
            const scraper = scrapers[workerId];
            
            while (index < targetKeywords.length) {
                const currentIndex = index++;
                const keyword = targetKeywords[currentIndex];
                
                // Save progress for resume feature (store the index of the furthest keyword reached)
                stateTracker.updateKeywordProgress('global_scan_v2', currentIndex);
                
                await processKeyword(keyword, scraper, workerId);
                
                // Delay between keywords to avoid rate limit spikes
                await new Promise(r => setTimeout(r, 5000));
            }
            
            try {
                await scraper.close();
            } catch (e) {}
        }
        
        // Launch workers concurrently
        const workers = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push(worker(i));
        }
        
        await Promise.all(workers);
        
        console.log(`\n🎉 V2 Scrape Cycle #${cycleCount} Completed Successfully! 🎉`);
        stateTracker.clearCompleted(); // Reset state for next full run
        
        if (!isInfiniteLoop) {
            console.log(`[Manager V2] Custom target list finished. Exiting.`);
            break;
        }

        cycleCount++;
        const sleepMinutes = 15;
        console.log(`\n[Manager V2] 💤 Sleeping for ${sleepMinutes} minutes before next cycle to prevent bans...`);
        await new Promise(r => setTimeout(r, sleepMinutes * 60 * 1000));
    }
    
    keepAwake.stop();
    process.exit(0);
}

startV2().catch(e => {
    console.error('Fatal Error:', e);
    process.exit(1);
});
