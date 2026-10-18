import * as fs from 'fs';
import * as path from 'path';

export interface ScraperState {
    lastKeyword: string;
    lastPage: number;
    completedKeywords: string[];
    globalStats: any;
}

export class StateTracker {
    private statePath: string;
    private state: ScraperState;

    constructor(scraperName: string) {
        this.statePath = path.join(__dirname, `../../data/${scraperName}_state.json`);
        // Ensure data directory exists
        const dataDir = path.dirname(this.statePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.state = this.loadState();
    }

    private loadState(): ScraperState {
        if (fs.existsSync(this.statePath)) {
            try {
                return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
            } catch (e) {
                console.error(`[StateTracker] Failed to parse state file: ${this.statePath}`);
            }
        }
        return {
            lastKeyword: '',
            lastPage: 0,
            completedKeywords: [],
            globalStats: {}
        };
    }

    public saveState() {
        fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
    }

    public updateKeywordProgress(keyword: string, page: number) {
        this.state.lastKeyword = keyword;
        this.state.lastPage = page;
        this.saveState();
    }

    public markKeywordCompleted(keyword: string) {
        if (!this.state.completedKeywords.includes(keyword)) {
            this.state.completedKeywords.push(keyword);
        }
        this.state.lastKeyword = '';
        this.state.lastPage = 0;
        this.saveState();
    }

    public isKeywordCompleted(keyword: string): boolean {
        return this.state.completedKeywords.includes(keyword);
    }

    public getLastProgress(keyword: string): number {
        if (this.state.lastKeyword === keyword) {
            return this.state.lastPage;
        }
        return 0; // Start from beginning if different keyword
    }
    
    public clearCompleted() {
        this.state.completedKeywords = [];
        this.state.lastKeyword = '';
        this.state.lastPage = 0;
        this.saveState();
    }

    public getRawState(): ScraperState {
        return this.state;
    }
}
