import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

interface PythonResponse {
    ok: boolean;
    data?: any;
    error?: string;
    status?: string;
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
}

export class IndeedPythonWorker {
    private proc: ChildProcessWithoutNullStreams | null = null;
    private stdoutRl: readline.Interface | null = null;
    private stderrRl: readline.Interface | null = null;
    private pending: PendingRequest[] = [];
    private ready = false;
    private starting: Promise<void> | null = null;
    private startupTimeoutMs = parseInt(process.env.INDEED_PY_STARTUP_TIMEOUT_MS || '120000', 10);

    private scriptPath = path.resolve(__dirname, '../../../scripts/indeed_scraper.py');

    async start(): Promise<void> {
        if (this.ready) return;
        if (this.starting) return this.starting;

        this.starting = this.startWithRetry();
        return this.starting;
    }

    private async startWithRetry(retries = 3): Promise<void> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.launch();
                return;
            } catch (err: any) {
                console.error(`[IndeedPy] ⚠️ Startup attempt ${attempt}/${retries} failed: ${err.message}`);
                await this.cleanupSystem();
                if (attempt === retries) {
                    this.starting = null; // Allow future retries if this fails
                    throw err;
                }
                const backoff = attempt * 5000;
                console.log(`[IndeedPy] ⏳ Waiting ${backoff / 1000}s before retry...`);
                await new Promise(r => setTimeout(r, backoff));
            }
        }
    }

    private async cleanupSystem(): Promise<void> {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        const profileDir = path.resolve(__dirname, '../../../data/indeed_uc_profile');
        try {
            // Kill stale chrome and drivers carefully
            await execAsync('pkill -f "undetected_chromedriver" || true');
            await execAsync('pkill -f "chrome" || true');

            // 🔥 Nuke the profile directory to clear "blocked" session state
            await execAsync(`rm -rf "${profileDir}" || true`);
            console.log(`[IndeedPy] 🧹 Cleared profile directory: ${profileDir}`);
        } catch (e) {
            // ignore
        }
    }

    private launch(): Promise<void> {
        return new Promise((resolve, reject) => {
            const isWindows = process.platform === 'win32';
            const useXvfb = !isWindows && !process.env.DISPLAY;
            
            const command = useXvfb ? 'xvfb-run' : (isWindows ? 'python' : 'python3');
            const args = useXvfb 
                ? ['-a', 'python3', this.scriptPath] 
                : [this.scriptPath];

            const proc = spawn(command, args, {
                stdio: 'pipe',
                env: { ...process.env }
            });
            this.proc = proc;

            const timeout = setTimeout(() => {
                reject(new Error('Python worker startup timeout'));
            }, this.startupTimeoutMs);

            proc.on('exit', (code) => {
                this.ready = false;
                this.proc = null;
                // If we were waiting for ready, reject
                // implementation detail: if launch() is pending, this listener might need to reject that specific promise
                // But handleLine handles the 'ready' resolution.
                // We need to ensure if exit happens BEFORE ready, we reject.
            });

            // We need a way to reject THIS promise if exit happens.
            // The existing listener in handleLine is good but we need to hook it up.

            // Re-using the logic from original start() but mapped to launch()

            const exitListener = (code: number) => {
                this.ready = false;
                this.proc = null;
                reject(new Error(`Python worker exited early (code ${code})`));
            };
            proc.once('exit', exitListener);

            this.stdoutRl = readline.createInterface({ input: proc.stdout });
            this.stdoutRl.on('line', (line: string) => {
                this.handleLine(line, () => {
                    proc.removeListener('exit', exitListener); // Success, remove error listener
                    clearTimeout(timeout);
                    resolve();
                }, (err) => {
                    proc.removeListener('exit', exitListener);
                    clearTimeout(timeout);
                    reject(err);
                }, timeout);
            });

            this.stderrRl = readline.createInterface({ input: proc.stderr });
            this.stderrRl.on('line', (line: string) => {
                // Forward log but filter some noise if needed
                if (line.trim()) {
                    console.log(`[IndeedPy] ${line.trim()}`);
                }
            });
        });
    }

    private handleLine(
        line: string,
        resolve: () => void,
        reject: (error: Error) => void,
        timeout: NodeJS.Timeout
    ) {
        const trimmed = line.trim();
        if (!trimmed) return;
        let message: PythonResponse | null = null;
        try {
            message = JSON.parse(trimmed);
        } catch {
            return;
        }
        if (!message) return;

        if (!this.ready && message.status === 'ready' && message.ok) {
            this.ready = true;
            clearTimeout(timeout);
            resolve();
            return;
        }

        if (!this.ready && message.ok === false) {
            clearTimeout(timeout);
            reject(new Error(message.error || 'Python worker failed to start'));
            return;
        }

        const pending = this.pending.shift();
        if (!pending) return;
        clearTimeout(pending.timeout);
        if (message.ok) {
            pending.resolve(message.data);
        } else {
            pending.reject(new Error(message.error || 'Python worker error'));
        }
    }

    private async send(command: Record<string, any>): Promise<any> {
        await this.start();
        if (!this.proc) throw new Error('Python worker not running');
        const proc = this.proc;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Python worker response timeout'));
            }, 60000);

            this.pending.push({ resolve, reject, timeout });
            proc.stdin.write(JSON.stringify(command) + '\n');
        });
    }

    async discover(keyword: string, location: string, start: number, days: number): Promise<{ jobs: any[]; blocked: boolean; reason?: string }> {
        const data = await this.send({ cmd: 'discover', keyword, location, start, days });
        if (Array.isArray(data)) return { jobs: data, blocked: false } as any;
        if (data && typeof data === 'object') {
            return {
                jobs: Array.isArray(data.jobs) ? data.jobs : [],
                blocked: !!data.blocked,
                reason: data.reason || ''
            };
        }
        return { jobs: [], blocked: false };
    }

    async detail(url: string): Promise<any> {
        return this.send({ cmd: 'detail', url });
    }

    async getCookies(): Promise<any[]> {
        try {
            const data = await this.send({ cmd: 'cookies' });
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async warmupOnly(): Promise<any[]> {
        try {
            const data = await this.send({ cmd: 'warmup_only' });
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async close(): Promise<void> {
        if (!this.proc) return;
        try {
            await this.send({ cmd: 'quit' });
        } catch {
        }
        try {
            this.proc.kill();
        } catch {
        }
        this.proc = null;
        this.ready = false;
        this.starting = null;
        if (this.stdoutRl) this.stdoutRl.close();
        if (this.stderrRl) this.stderrRl.close();
        this.stdoutRl = null;
        this.stderrRl = null;
    }
}
