import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';

function getDateFolder(baseDir: string): string {
    const date = new Date().toISOString().split('T')[0];
    const dir = path.join(baseDir, date);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export class DebugDumper {
    private baseDir: string;

    constructor(baseDir: string) {
        this.baseDir = baseDir;
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    }

    ensureRunFolder() {
        getDateFolder(this.baseDir);
    }

    async dump(page: Page, context: Record<string, any>, reason: string) {
        const folder = getDateFolder(this.baseDir);
        const stamp = Date.now();

        try {
            const html = await page.content();
            fs.writeFileSync(path.join(folder, `${stamp}_page.html`), html);
        } catch {}

        try {
            await page.screenshot({ path: path.join(folder, `${stamp}_page.png`), fullPage: true });
        } catch {}

        fs.writeFileSync(path.join(folder, `${stamp}_context.json`), JSON.stringify({ reason, context }, null, 2));
    }
}
