# 📘 التوثيق الكامل والمفصل لمشروع "Egypt Jobs Scraper"
## شرح الكود "سطر بسطر" للمبتدئين - الإصدار v3.1 Turbo

هذا الملف يحتوي على شرح تفصيلي لكل جزء في المشروع، الهدف منه هو فهم "كيف يعمل هذا المصنع" من الداخل.

---

## 🏗️ الهيكل العام للمشروع (Project Structure)

قبل الغوص في الكود، لنتخيل أن المشروع عبارة عن **شركة** تتكون من عدة أقسام:

| الملف | الوظيفة | التشبيه |
|-------|---------|--------|
| `GlobalManager.ts` | يدير الدورة الكاملة | المدير العام |
| `JobCollector.ts` | يجمع ويفلتر الوظائف | مدير المخزن |
| `BaseScraper.ts` | يجلب صفحات الإنترنت | السيارة / المحرك |
| `WuzzufScraper.ts` | يقرأ موقع وظف | العامل المتخصص |

---

## 🚀 ما الجديد في الإصدار 3.1 Turbo؟

### 1. استراتيجية الجلب الهجينة (Hybrid Fetching)

```
┌─────────────────────────────────────────────────────────────┐
│                   fetchHtml(url, options)                    │
├─────────────────────────────────────────────────────────────┤
│  إذا كان enableJs = true:                                   │
│    → استخدم Playwright كامل (page.goto)                     │
│    → بطيء لكن ضروري لصفحات البحث                            │
│                                                              │
│  إذا كان enableJs = false:                                  │
│    → استخدم API Request (context.request.get)              │
│    → سريع جداً (~800ms بدل 2s)                              │
│    → مناسب لصفحات تفاصيل الوظائف                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. مجموعة السياقات (Context Pool)

بدلاً من فتح متصفح جديد لكل طلب، نستخدم 5 سياقات مُعاد استخدامها:

```typescript
private contextPool: any[] = [];
private poolSize = 5;
private poolIndex = 0;

private async getNoJsContext(): Promise<any> {
    // Round Robin: نوزع الطلبات على السياقات بالتناوب
    const ctx = this.contextPool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.poolSize;
    return ctx;
}
```

### 3. الحماية من الحظر (Anti-Block Protection)

#### أ. حماية 429 Rate Limit:
```typescript
if (response.status() === 429) {
    const waitTime = 5000 * Math.pow(2, attempt); // 5s, 10s, 20s
    console.warn(`⚠️ Rate Limited! Waiting ${waitTime / 1000}s...`);
    await new Promise(r => setTimeout(r, waitTime));
    continue; // إعادة المحاولة
}
```

#### ب. حماية 502/503 Server Errors:
```typescript
if (response.status() === 502 || response.status() === 503) {
    const waitTime = 3000 * (attempt + 1); // 3s, 6s, 9s
    console.warn(`⚠️ Server Error! Waiting ${waitTime / 1000}s...`);
    await new Promise(r => setTimeout(r, waitTime));
    continue; // إعادة المحاولة
}
```

### 4. المعالجة بالدفعات (Batch Processing)

بدلاً من جلب 19 وظيفة بالتوازي (يسبب حظر)، نجلب 5 فقط في كل دفعة:

```typescript
const batchSize = 5;

for (let i = 0; i < allElements.length; i += batchSize) {
    const batch = allElements.slice(i, i + batchSize);
    
    // جلب 5 وظائف بالتوازي
    const results = await Promise.all(batch.map(el => processCard(el)));
    
    // انتظار 1.5 ثانية قبل الدفعة التالية
    if (i + batchSize < allElements.length) {
        await new Promise(r => setTimeout(r, 1500));
        console.log(`⏳ Batch complete, waiting...`);
    }
}
```

---

## 1. 🎩 المدير العام (`src/GlobalManager.ts`)

هذا الملف هو نقطة البداية (`Entry Point`). تشغيله يعني تشغيل البرنامج.

**الثوابت:**
```typescript
const CSV_FILE = path.join(__dirname, '../data/wuzzuf_clean_data_v3.csv');
const SLEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 دقائق
```

**الدورة الكاملة:**
```typescript
while (true) {
    try {
        // 1. تنظيف الملفات
        await cleaner.clean();

        // 2. تشغيل العامل والمجمّع
        const wuzzufScraper = new WuzzufScraper('');
        const collector = new JobCollector(wuzzufScraper, CSV_FILE);
        const result = await collector.runCycle();

        // 3. إغلاق المتصفح
        await wuzzufScraper.closeBrowser();

        // 4. النوم 10 دقائق
        await new Promise(r => setTimeout(r, SLEEP_INTERVAL_MS));

    } catch (e) {
        // إعادة التشغيل بعد 30 ثانية في حالة الخطأ
        await new Promise(r => setTimeout(r, 30000));
    }
}
```

---

## 2. 📦 مدير المخزن (`src/scrapers/JobCollector.ts`)

هذا الملف هو "العقل المدبر" لعملية التجميع.

**التعديلات الجديدة:**
```typescript
// انتظار 2.5 ثانية بين كل صفحة
page++;
console.log(`[Collector] ⏳ Waiting 2.5s before next page...`);
await new Promise(r => setTimeout(r, 2500));
```

---

## 3. 🚗 المحرك الأساسي (`src/core/BaseScraper.ts`)

**الهيكل الجديد:**

```typescript
export abstract class BaseScraper {
    
    private browserInstance: any = null; 
    private contextPool: any[] = [];
    private poolSize = 5;
    private poolIndex = 0;

    protected async fetchHtml(url: string, options: { enableJs?: boolean } = { enableJs: true }): Promise<string> {
        
        // 1. فتح المتصفح لو مش مفتوح
        if (!this.browserInstance) {
            this.browserInstance = await chromium.launch({ headless: true });
        }

        // 2. لو الجافاسكربت مش مطلوب → استخدم API Request (سريع)
        if (options.enableJs === false) {
            const context = await this.getNoJsContext();
            const maxRetries = 3;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const response = await context.request.get(url, {
                    headers: { 'User-Agent': this.userAgent },
                    timeout: 20000
                });

                // حماية 429
                if (response.status() === 429) {
                    const waitTime = 5000 * Math.pow(2, attempt);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }

                // حماية 502/503
                if (response.status() === 502 || response.status() === 503) {
                    const waitTime = 3000 * (attempt + 1);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }

                return await response.text();
            }
        }

        // 3. لو الجافاسكربت مطلوب → استخدم Playwright كامل
        const page = await this.browserInstance.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.content();
        await page.close();
        return content;
    }
}
```

---

## 4. 👷 العامل المتخصص (`src/scrapers/wuzzuf/WuzzufScraper.ts`)

**استخراج فئات الوظائف (job_categories):**
```typescript
// الطريقة الصحيحة للوصول للفئات:
const categories = attrs.workRoles?.map((r: any) => r.name).join(', ') || null;

// مثال على البيانات:
// attrs.workRoles = [
//   { name: "Engineering - Mechanical/Electrical" },
//   { name: "Project/Program Management" }
// ]
// النتيجة: "Engineering - Mechanical/Electrical, Project/Program Management"
```

**استدعاء الجلب السريع:**
```typescript
// صفحة البحث → Playwright كامل
const searchHtml = await this.fetchHtml(searchUrl); // enableJs: true افتراضياً

// صفحة تفاصيل الوظيفة → API Request سريع
const detailHtml = await this.fetchHtml(fullUrl, { enableJs: false });
```

---

## 📊 مقارنة الأداء

| القياس | v3.0 (القديم) | v3.1 Turbo (الجديد) |
|--------|---------------|---------------------|
| **جلب تفاصيل وظيفة** | ~2 ثانية | ~0.8 ثانية |
| **صفحة كاملة (19 وظيفة)** | ~40 ثانية | ~15 ثانية |
| **100 صفحة** | غير مستقر | **~25 دقيقة** |
| **7000+ وظيفة** | ❌ يفشل | ✅ يكتمل بين ليلة وضحاها |

---

## 📝 الخلاصة (Summary)

```
┌─────────────────────────────────────────────────────────────┐
│                      سير العمل الكامل                        │
├─────────────────────────────────────────────────────────────┤
│  GlobalManager                                               │
│    ↓                                                         │
│  JobCollector.runCycle()                                     │
│    ↓                                                         │
│  WuzzufScraper.scrapeSpecificPage(page)                      │
│    ├── fetchHtml(searchUrl) [JS: true] → صفحة البحث         │
│    └── لكل 5 وظائف:                                          │
│        ├── fetchHtml(jobUrl) [JS: false] → تفاصيل سريعة     │
│        ├── لو 429: انتظر 5s→10s→20s ثم أعد المحاولة        │
│        ├── لو 502: انتظر 3s→6s→9s ثم أعد المحاولة         │
│        └── انتظر 1.5s قبل الدفعة التالية                    │
│    ↓                                                         │
│  حفظ في CSV                                                  │
│    ↓                                                         │
│  انتظار 2.5s ثم الصفحة التالية                              │
│    ↓                                                         │
│  نوم 10 دقائق ثم تكرار                                      │
└─────────────────────────────────────────────────────────────┘
```

**الميزات الرئيسية:**
- ✅ سرعة 3x أسرع من الإصدار السابق
- ✅ حماية تلقائية من الحظر (429, 502, 503)
- ✅ يعمل لساعات بدون توقف
- ✅ يكمل 7000+ وظيفة بين ليلة وضحاها
