import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export async function askResumeOrRestart(scraperName: string): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`\n[${scraperName}] Do you want to resume or restart? (Press Enter to resume, type 'R' to restart): `, (answer) => {
            rl.close();
            if (answer.trim().toUpperCase() === 'R') {
                console.log(`\n[${scraperName}] 🔄 Restarting from the beginning. Clearing state...`);
                // Clear state
                const dataDir = path.join(__dirname, '../../data');
                const statePaths = [
                    path.join(dataDir, `${scraperName.toLowerCase()}_state.json`),
                    path.join(dataDir, `${scraperName.toLowerCase()}_v5_state_bak.json`),
                    path.join(dataDir, `${scraperName.toLowerCase()}_v1_state.json`),
                    path.join(dataDir, `${scraperName.toLowerCase()}_v2_state.json`)
                ];
                
                for (const statePath of statePaths) {
                    if (fs.existsSync(statePath)) {
                        fs.unlinkSync(statePath);
                        console.log(`[${scraperName}] Deleted state file: ${path.basename(statePath)}`);
                    }
                }
            } else {
                console.log(`\n[${scraperName}] ⏭️ Resuming from where it left off...`);
            }
            resolve();
        });
    });
}
