
import * as dotenv from 'dotenv';

dotenv.config();

export class GeminiRotationAgent {
    private apiKeys: string[] = [];
    private currentKeyIndex = 0;
    
    constructor() {
        this.loadKeys();
    }
    
    private loadKeys() {
        // Load all keys starting with GEMINI_API_KEY from env
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith('GEMINI_API_KEY') && value) {
                this.apiKeys.push(value.trim());
            }
        }
        
        if (this.apiKeys.length === 0) {
            console.warn('[GeminiAgent] ⚠️ No GEMINI_API_KEY variables found in .env!');
        } else {
            console.log(`[GeminiAgent] 🚀 Loaded ${this.apiKeys.length} Gemini API keys for rotation.`);
        }
    }
    
    private get currentKey(): string {
        if (this.apiKeys.length === 0) return '';
        return this.apiKeys[this.currentKeyIndex];
    }
    
    private rotateKey() {
        if (this.apiKeys.length <= 1) return;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`[GeminiAgent] 🔄 Rotated to API Key index ${this.currentKeyIndex}`);
    }
    
    /**
     * Extracts skills from a raw job description string using Gemini 1.5 Flash
     */
    public async extractSkills(jobDescription: string): Promise<string[]> {
        if (!jobDescription || jobDescription.trim().length < 50) return [];
        if (this.apiKeys.length === 0) {
            console.error('[GeminiAgent] Cannot extract skills: No API keys configured.');
            return [];
        }

        const prompt = `Extract all the required skills, qualifications, tools, and technologies from the following job description.
Return ONLY a valid JSON array of strings, with no markdown formatting and no extra text.
If no skills are found, return an empty array [].

Job Description:
"""
${jobDescription.substring(0, 8000)}
"""`;

        let attempts = 0;
        const maxAttempts = this.apiKeys.length * 2; // Try each key twice max

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${this.currentKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            responseMimeType: "application/json"
                        }
                    })
                });

                if (response.status === 429) {
                    console.warn(`[GeminiAgent] ⚠️ Rate limit hit (429) on key ${this.currentKeyIndex}. Rotating...`);
                    this.rotateKey();
                    attempts++;
                    await this.sleep(1000);
                    continue;
                }

                if (!response.ok) {
                    const err = await response.text();
                    console.error(`[GeminiAgent] API Error on key ${this.currentKeyIndex}:`, err);
                    this.rotateKey();
                    attempts++;
                    await this.sleep(1000);
                    continue;
                }

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0) {
                    const content = data.candidates[0].content.parts[0].text;
                    try {
                        const skills = JSON.parse(content);
                        if (Array.isArray(skills)) {
                            return skills;
                        }
                    } catch (e) {
                        console.error('[GeminiAgent] Failed to parse JSON from Gemini:', content);
                    }
                }
                
                return []; // Fallback if format is weird
                
            } catch (error: any) {
                console.error(`[GeminiAgent] Fetch error on key ${this.currentKeyIndex}:`, error.message);
                this.rotateKey();
                attempts++;
                await this.sleep(2000);
            }
        }
        
        console.error('[GeminiAgent] ❌ Exhausted all API keys and retries.');
        return [];
    }
    
    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
