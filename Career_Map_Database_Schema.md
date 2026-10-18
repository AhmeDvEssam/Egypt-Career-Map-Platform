# هيكل قاعدة بيانات خريطة التوظيف (Egypt's Career Map Intelligence)

تم تصميم هذا الهيكل ليربط بين **نظام تحليل السير الذاتية بالذكاء الاصطناعي (Resume Screener)** الذي تمتلكونه، وبين **الخريطة التفاعلية ثلاثية الأبعاد (3D Career Globe)**. 

يتكون الهيكل من 4 جداول أساسية لتكوين صورة كاملة عن سوق العمل:

---

## 1. جدول الشركات (`companies`)
هذا الجدول يمثل الكيانات التي تطرح الوظائف، ويحتوي على الإحداثيات الجغرافية لزرعها على الخريطة.

| اسم العمود (Column) | النوع (Type) | الوصف (Description) |
| :--- | :--- | :--- |
| `id` | UUID | المعرف الفريد للشركة (Primary Key) |
| `name` | String | اسم الشركة |
| `industry` | String | مجال الشركة (مثال: Software, Finance, Healthcare) |
| `size` | Enum | حجم الشركة (Startup, SME, Enterprise) |
| `city` | String | المحافظة (مثال: Cairo, Alexandria) |
| `neighborhood` | String | المنطقة (مثال: Maadi, Smart Village, New Cairo) |
| `latitude` | Float | **خط العرض (مهم جداً لعرض الشركة على الخريطة 3D)** |
| `longitude` | Float | **خط الطول (مهم جداً لعرض الشركة على الخريطة 3D)** |

---

## 2. جدول الوظائف الشاغرة (`jobs`)
يحتوي على تفاصيل الوظائف المتاحة ويتم ربطه بالشركة.

| اسم العمود (Column) | النوع (Type) | الوصف (Description) |
| :--- | :--- | :--- |
| `id` | UUID | المعرف الفريد للوظيفة (Primary Key) |
| `company_id` | UUID | مُعرف الشركة (Foreign Key) |
| `title` | String | المسمى الوظيفي (يجب عمل Normalization له لاحقاً) |
| `category` | String | تصنيف الوظيفة (نفس التصنيفات التي يخرجها نموذج الـ ML الخاص بكم) |
| `level` | Enum | المستوى (Entry, Junior, Mid, Senior, Lead) |
| `work_mode` | Enum | نظام العمل (On-site, Remote, Hybrid) |
| `salary_min` | Integer | الحد الأدنى للراتب المتوقع |
| `salary_max` | Integer | الحد الأقصى للراتب المتوقع |
| `required_experience_min`| Integer | الحد الأدنى لسنوات الخبرة المطلوبة |
| `required_experience_max`| Integer | الحد الأقصى لسنوات الخبرة المطلوبة |
| `source` | String | مصدر الوظيفة (للمساعدة في الـ Deduplication) |
| `external_id` | String | المعرف الخارجي للوظيفة في الموقع المصدر |
| `source_url` | String | رابط الوظيفة الأصلي |
| `status` | Enum | حالة الوظيفة (Open, Closed) |
| `first_seen_at` | Timestamp | تاريخ أول رصد للوظيفة |
| `last_seen_at` | Timestamp | تاريخ آخر رصد للوظيفة (لحساب الـ Active Stock) |
| `closed_at` | Timestamp | تاريخ إغلاق الوظيفة (لحساب الـ Market Churn) |

---

## 3. جدول الكفاءات / الباحثين عن عمل (`candidates`)
هذا الجدول يعتمد على مخرجات الموديل الخاص بكم لتخزين بيانات السير الذاتية.

| اسم العمود (Column) | النوع (Type) | الوصف (Description) |
| :--- | :--- | :--- |
| `id` | UUID | المعرف الفريد للباحث عن عمل |
| `predicted_category` | String | التصنيف الذي توقعه الذكاء الاصطناعي للسيرة الذاتية |
| `experience_years` | Integer | سنوات الخبرة (للمقارنة مع الـ required_experience) |
| `city` | String | مدينة الباحث عن عمل |
| `latitude` | Float | خط العرض (لعرض "أماكن تركز الكفاءات") |
| `longitude` | Float | خط الطول |
| `status` | Enum | حالة البحث عن عمل (Actively Looking, Employed) |

---

## 4. نظام المهارات المترابط (Relational Skills)
بدلاً من تخزين المهارات كـ JSON، تم فصلها في جداول مترابطة لتسهيل استخراج (Skill Co-occurrence) و (Skill Gap).

### جدول المهارات (`skills`)
| اسم العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | المعرف الفريد |
| `name` | String | اسم المهارة |
| `canonical_name`| String | الاسم الموحد للمهارة (مثال: "SQL" بدلاً من "sql") |
| `category` | String | تصنيف المهارة (Soft, Technical, Tools) |

### جدول ربط المهارات بالوظائف (`job_skills`)
| اسم العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `job_id` | UUID | مُعرف الوظيفة (FK) |
| `skill_id` | UUID | مُعرف المهارة (FK) |

### جدول ربط المهارات بالكفاءات (`candidate_skills`)
| اسم العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `candidate_id`| UUID | مُعرف الباحث عن عمل (FK) |
| `skill_id` | UUID | مُعرف المهارة (FK) |

---

## 5. جدول التقديمات والترشيحات (`applications`)
يربط بين الباحثين عن عمل والوظائف، ويمكن استخدامه لرسم خطوط (Flow lines) على الخريطة توضح هجرة الكفاءات.

| اسم العمود (Column) | النوع (Type) | الوصف (Description) |
| :--- | :--- | :--- |
| `id` | UUID | المعرف الفريد |
| `job_id` | UUID | مُعرف الوظيفة (Foreign Key) |
| `candidate_id` | UUID | مُعرف الباحث عن عمل (Foreign Key) |
| `match_score` | Float | **نسبة التوافق التي حددها الذكاء الاصطناعي بين الـ Resume والـ Job** |
| `status` | Enum | حالة التقديم (Applied, Shortlisted, Rejected, Hired) |
| `applied_at` | Timestamp | تاريخ التقديم |

---

### 💡 كيف سيخدم هذا الهيكل الخريطة (Career Map)؟
من خلال هذه الجداول، يمكن للخريطة الإجابة (برمجياً ومرئياً) على أسئلة تحليلية معقدة مثل:
- **تحليل العرض والطلب:** الخريطة تعرض أماكن الوظائف (Jobs) كنقاط خضراء، وأماكن الكفاءات (Candidates) كنقاط زرقاء، مما يوضح الفجوة الجغرافية.
- **تحليل الرواتب:** النقر على منطقة "المعادي" يجمع `salary_min` و `salary_max` لكل الوظائف في هذه المنطقة ويعرض المتوسط.
- **التفاعل الصوتي:** عندما يسأل المستخدم *"أين توجد وظائف Data Science؟"*، يقوم النظام بالبحث في جدول `jobs` حيث `category = Data Science` وينقل كاميرا الخريطة لإحداثيات الشركات التي توفرها.
