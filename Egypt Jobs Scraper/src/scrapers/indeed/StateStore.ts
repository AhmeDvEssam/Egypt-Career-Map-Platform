import * as fs from 'fs';

export interface QueryState {
    lastOffset: number;
    lastRunAt?: string;
    consecutiveEmptyPages: number;
    lastPageFingerprint?: string;
    seenJobKeys: string[];
}

export interface RetryJob {
    jobKey?: string;
    jobUrl: string;
    keyword: string;
    city: string;
    mode: string;
    attempts: number;
    nextAttemptAt?: string;
    lastError?: string;
    payload: RetryJobPayload;
}

export interface RetryJobPayload {
    title: string;
    company: string;
    location: string;
    postedDate: string;
    jobType: string;
    careerLevel: string;
    workType: string;
    category: string;
    experience: string;
    jobKey: string;
    queryKeyword: string;
    firstSeenAt: string;
    lastSeenAt: string;
}

export interface SeenJob {
    firstSeenAt: string;
    lastSeenAt: string;
}

export interface StateData {
    version: number;
    queryStates: Record<string, QueryState>;
    retryQueue: RetryJob[];
    seenJobs: Record<string, SeenJob>;
}

const MAX_SEEN_KEYS_PER_QUERY = 5000;

export class StateStore {
    private statePath: string;
    private state: StateData;

    constructor(statePath: string) {
        this.statePath = statePath;
        this.state = this.load();
    }

    private load(): StateData {
        try {
            if (fs.existsSync(this.statePath)) {
                const data = JSON.parse(fs.readFileSync(this.statePath, 'utf-8')) as StateData;
                return {
                    version: data.version || 1,
                    queryStates: data.queryStates || {},
                    retryQueue: data.retryQueue || [],
                    seenJobs: data.seenJobs || {}
                };
            }
        } catch {}
        return { version: 1, queryStates: {}, retryQueue: [], seenJobs: {} };
    }

    save() {
        fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    }

    getQueryState(queryKey: string): QueryState {
        if (!this.state.queryStates[queryKey]) {
            this.state.queryStates[queryKey] = {
                lastOffset: 0,
                consecutiveEmptyPages: 0,
                seenJobKeys: []
            };
        }
        return this.state.queryStates[queryKey];
    }

    updateQueryState(queryKey: string, update: Partial<QueryState>) {
        const current = this.getQueryState(queryKey);
        this.state.queryStates[queryKey] = { ...current, ...update };
    }

    markSeen(key: string, timestamp: string): { isNew: boolean; firstSeenAt: string; lastSeenAt: string } {
        const existing = this.state.seenJobs[key];
        if (!existing) {
            this.state.seenJobs[key] = { firstSeenAt: timestamp, lastSeenAt: timestamp };
            return { isNew: true, firstSeenAt: timestamp, lastSeenAt: timestamp };
        }
        existing.lastSeenAt = timestamp;
        return { isNew: false, firstSeenAt: existing.firstSeenAt, lastSeenAt: existing.lastSeenAt };
    }

    trackQuerySeenKey(queryKey: string, key: string) {
        const state = this.getQueryState(queryKey);
        if (!state.seenJobKeys.includes(key)) {
            state.seenJobKeys.push(key);
            if (state.seenJobKeys.length > MAX_SEEN_KEYS_PER_QUERY) {
                state.seenJobKeys.shift();
            }
        }
    }

    hasQuerySeenKey(queryKey: string, key: string): boolean {
        const state = this.getQueryState(queryKey);
        return state.seenJobKeys.includes(key);
    }

    enqueueRetry(job: RetryJob) {
        this.state.retryQueue.push(job);
    }

    getRetryQueue(): RetryJob[] {
        return this.state.retryQueue;
    }

    replaceRetryQueue(queue: RetryJob[]) {
        this.state.retryQueue = queue;
    }
}
