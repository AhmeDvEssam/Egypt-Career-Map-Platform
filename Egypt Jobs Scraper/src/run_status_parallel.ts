/**
 * run_status_parallel.ts
 * 
 * Orchestrator that launches one sync_status.ts process per source in parallel.
 * - Non-Bayt sources (LinkedIn, Wuzzuf, Indeed, Forasna) run fully concurrently.
 * - Bayt runs in its own isolated process (with its own browser window).
 * 
 * Usage:
 *   ts-node src/run_status_parallel.ts
 */

import { spawn } from 'child_process';
import * as path from 'path';

const SOURCES = ['LinkedIn', 'Wuzzuf', 'Indeed', 'Forasna', 'Bayt'];

const colors: Record<string, string> = {
    LinkedIn:  '\x1b[34m', // Blue
    Wuzzuf:    '\x1b[32m', // Green
    Indeed:    '\x1b[35m', // Magenta
    Forasna:   '\x1b[36m', // Cyan
    Bayt:      '\x1b[33m', // Yellow
    reset:     '\x1b[0m',
};

function launchSource(source: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const color = colors[source] || '';
        const reset = colors.reset;
        const prefix = `${color}[${source}]${reset}`;

        console.log(`${prefix} Starting...`);

        const tsNodeBin = path.join(__dirname, '..', 'node_modules', 'ts-node', 'dist', 'bin.js');
        const scriptPath = path.join(__dirname, 'sync_status.ts');

        const child = spawn(process.execPath, [tsNodeBin, scriptPath, '--source', source], {
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe',
        });

        child.stdout.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => process.stdout.write(`${prefix} ${line}\n`));
        });

        child.stderr.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => process.stderr.write(`${prefix} [ERR] ${line}\n`));
        });

        child.on('close', (code: number) => {
            if (code === 0) {
                console.log(`${prefix} Finished successfully.`);
                resolve();
            } else {
                console.error(`${prefix} Exited with code ${code}`);
                resolve(); // Don't reject so other sources continue
            }
        });

        child.on('error', (err: Error) => {
            console.error(`${prefix} Failed to start: ${err.message}`);
            resolve();
        });
    });
}

async function main() {
    console.log('================================================');
    console.log('   Parallel Status Updater (All Sources)');
    console.log('================================================');
    console.log(`Launching ${SOURCES.length} workers in parallel...\n`);

    const startTime = Date.now();

    // All sources run in parallel - each is an isolated OS process
    await Promise.all(SOURCES.map(source => launchSource(source)));

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n================================================`);
    console.log(`   All sources done in ${elapsed} minutes.`);
    console.log('================================================');
}

main().catch(console.error);
