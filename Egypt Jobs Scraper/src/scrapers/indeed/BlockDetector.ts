import * as fs from 'fs';
import * as path from 'path';

export interface BlockSignal {
    type: string;
    status?: number;
    url?: string;
    message?: string;
    keyword?: string;
    city?: string;
}

export interface BlockAction {
    mode: 'normal' | 'polite';
    cooldownUntil?: number;
}

function parseEnvNumber(value: string | undefined, fallback: number): number {
    const parsed = value ? parseInt(value, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
}

const SIGNAL_WINDOW_MS = parseEnvNumber(process.env.BLOCK_SIGNAL_WINDOW_MS, 10 * 60 * 1000);
const POLITE_MODE_MS = parseEnvNumber(process.env.BLOCK_POLITE_MS, 20 * 60 * 1000);
const COOLDOWN_MS = parseEnvNumber(process.env.BLOCK_COOLDOWN_MS, 30 * 60 * 1000);
const SIGNAL_THRESHOLD = parseEnvNumber(process.env.BLOCK_SIGNAL_THRESHOLD, 2);
const COOLDOWN_THRESHOLD = parseEnvNumber(process.env.BLOCK_COOLDOWN_THRESHOLD, 4);
const GLOBAL_COOLDOWN_THRESHOLD = parseEnvNumber(process.env.BLOCK_GLOBAL_THRESHOLD, 8);
const GLOBAL_COOLDOWN_MS = parseEnvNumber(process.env.BLOCK_GLOBAL_MS, 20 * 60 * 1000);

export class BlockDetector {
    private signalTimestamps: number[] = [];
    private bucketTimestamps = new Map<string, number[]>();
    private politeUntil = 0;
    private cooldownByBucket = new Map<string, number>();
    private globalCooldownUntil = 0;
    private logPath: string;

    constructor(logPath: string) {
        this.logPath = logPath;
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    }

    detectFromResponse(status?: number, url?: string): BlockSignal | null {
        if (!status) return null;
        if ([403, 429, 503].includes(status)) {
            return { type: 'http_status', status, url };
        }
        return null;
    }

    detectFromContent(title: string, html: string, url?: string): BlockSignal | null {
        const lowerTitle = (title || '').toLowerCase();
        const lowerHtml = (html || '').toLowerCase();

        // Title-based detection (very reliable — Cloudflare sets specific titles)
        const titlePatterns = ['just a moment', 'attention required', 'access denied', 'blocked'];
        if (titlePatterns.some(p => lowerTitle.includes(p))) {
            return { type: 'challenge', url, message: `title: ${title}` };
        }

        // Body-based detection (specific Cloudflare/bot-check patterns only)
        const bodyPatterns = [
            'unusual traffic',
            'are you human',
            'verify you are human',
            'please verify',
            'ray id',                    // Cloudflare block pages always include Ray ID
            'cf-browser-verification',   // Cloudflare JS challenge div
            'turnstile',                 // Cloudflare Turnstile captcha
            'hcaptcha',
            'g-recaptcha',
        ];
        if (bodyPatterns.some(p => lowerHtml.includes(p))) {
            return { type: 'challenge', url, message: 'challenge detected in body' };
        }

        // No job content at all (empty body = likely blocked)
        if (lowerHtml.length < 500 && !lowerHtml.includes('indeed')) {
            return { type: 'empty_body', url, message: 'suspiciously short response' };
        }

        return null;
    }

    registerSignal(signal: BlockSignal, bucketKey: string): BlockAction {
        const now = Date.now();
        this.signalTimestamps = this.signalTimestamps.filter(ts => now - ts <= SIGNAL_WINDOW_MS);
        this.signalTimestamps.push(now);

        const bucketHistory = this.bucketTimestamps.get(bucketKey) || [];
        const filtered = bucketHistory.filter(ts => now - ts <= SIGNAL_WINDOW_MS);
        filtered.push(now);
        this.bucketTimestamps.set(bucketKey, filtered);

        if (this.signalTimestamps.length >= SIGNAL_THRESHOLD) {
            this.politeUntil = Math.max(this.politeUntil, now + POLITE_MODE_MS);
        }

        if (this.signalTimestamps.length >= GLOBAL_COOLDOWN_THRESHOLD) {
            this.globalCooldownUntil = Math.max(this.globalCooldownUntil, now + GLOBAL_COOLDOWN_MS);
        }

        const bucketCount = filtered.length;
        if (bucketCount >= COOLDOWN_THRESHOLD) {
            this.cooldownByBucket.set(bucketKey, now + COOLDOWN_MS);
        }

        const action: BlockAction = {
            mode: this.isPoliteMode() ? 'polite' : 'normal',
            cooldownUntil: this.cooldownByBucket.get(bucketKey)
        };

        this.logSignal(signal, bucketKey, now, action);

        return action;
    }

    isPoliteMode(): boolean {
        return Date.now() < this.politeUntil;
    }

    isInCooldown(bucketKey: string): boolean {
        const until = this.cooldownByBucket.get(bucketKey);
        return !!until && Date.now() < until;
    }

    getBucketCooldownRemainingMs(bucketKey: string): number {
        const until = this.cooldownByBucket.get(bucketKey);
        if (!until) return 0;
        return Math.max(0, until - Date.now());
    }

    isGlobalCooldown(): boolean {
        return Date.now() < this.globalCooldownUntil;
    }

    getGlobalCooldownRemainingMs(): number {
        return Math.max(0, this.globalCooldownUntil - Date.now());
    }

    private logSignal(signal: BlockSignal, bucketKey: string, timestamp: number, action: BlockAction) {
        const entry = {
            timestamp: new Date(timestamp).toISOString(),
            bucketKey,
            signal,
            action,
            globalCooldownUntil: this.globalCooldownUntil || null
        };
        fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    }
}
