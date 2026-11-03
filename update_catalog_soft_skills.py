import csv
import sys
sys.stdout.reconfigure(encoding='utf-8')

CATALOG_PATH = 'standard_skills_catalog.csv'

new_soft_skills = [
    {
        'standard_skill_name': 'Growth Mindset',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?عقل[يى][هة]\s+(?:[وبلفك]?(?:[أإآا]ل)?)?نمو|Growth[\s\-_/]+Mindset)(?!\w)',
        'known_aliases': 'عقلية النمو, حب التطور, التطور المستمر, Growth Mindset',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Intellectual Curiosity',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?فضول\s+(?:[وبلفك]?(?:[أإآا]ل)?)?معرف[يى]|(?:[وبلفك]?(?:[أإآا]ل)?)?حب\s+(?:[وبلفك]?(?:[أإآا]ل)?)?تعلم|Intellectual[\s\-_/]+Curiosity|Eagerness[\s\-_/]+to[\s\-_/]+Learn)(?!\w)',
        'known_aliases': 'الفضول المعرفي, الشغف بالتعلم, حب التعلم, Intellectual Curiosity, Eagerness to Learn, Fast Learner',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Fast-paced Work Environment',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?عمل\s+ف[يى]\s+ب[يى][ئء][هة]\s+(?:[وبلفك]?(?:[أإآا]ل)?)?عمل\s+سر[يى]ع[هة]|Fast[\s\-_/]+paced[\s\-_/]+Work[\s\-_/]+Environment|Fast[\s\-_/]+paced[\s\-_/]+Environment)(?!\w)',
        'known_aliases': 'العمل في بيئة سريعة, بيئة عمل ديناميكية, سرعة التكيف مع وتيرة العمل, Fast-paced Environment, Dynamic Environment, Fast-paced Work Environment',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Coordination',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?تنس[يى]ق\s+و(?:[وبلفك]?(?:[أإآا]ل)?)?مت[أإآا]بع[هة]|(?:[وبلفك]?(?:[أإآا]ل)?)?م[هة][أإآا]ر[أإآا]ت\s+(?:[وبلفك]?(?:[أإآا]ل)?)?تنس[يى]ق|Coordination[\s\-_/]+Skills|General[\s\-_/]+Coordination|Coordination)(?!\w)',
        'known_aliases': 'التنسيق, مهارات التنسيق والمتابعة, أعمال التنسيق, Coordination Skills, General Coordination',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Computer Literacy',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?[إأا]لم[أإآا]م\s+ب[أإآا]لح[أإآا]سب\s+(?:[وبلفك]?(?:[أإآا]ل)?)?[أإآا]ل[يى]|(?:[وبلفك]?(?:[أإآا]ل)?)?[أإآا]س[أإآا]س[يى][أإآا]ت\s+(?:[وبلفك]?(?:[أإآا]ل)?)?كمب[يى]وتر|Computer[\s\-_/]+Literacy|Basic[\s\-_/]+Computer[\s\-_/]+Skills)(?!\w)',
        'known_aliases': 'الإلمام بالحاسب الآلي, مهارات الكمبيوتر الأساسية, مبادئ الحاسوب, محو الأمية الرقمية, Computer Literacy, Basic Computer Skills',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Work Under Pressure',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?عمل\s+تحت\s+(?:[وبلفك]?(?:[أإآا]ل)?)?ضغط|(?:[وبلفك]?(?:[أإآا]ل)?)?تحمل\s+(?:[وبلفك]?(?:[أإآا]ل)?)?ضغوط|Work[\s\-_/]+Under[\s\-_/]+Pressure|Stress[\s\-_/]+Tolerance|Working[\s\-_/]+Under[\s\-_/]+Pressure)(?!\w)',
        'known_aliases': 'العمل تحت ضغط, تحمل ضغوط العمل, التعامل مع الضغوط, القدرة على تحمل الضغوط, Work Under Pressure, Stress Tolerance, Working Under Pressure',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Self-Motivation',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?تحف[يى]ز\s+(?:[وبلفك]?(?:[أإآا]ل)?)?ذ[أإآا]ت[يى]|(?:[وبلفك]?(?:[أإآا]ل)?)?مب[أإآا]در[هة]\s+(?:[وبلفك]?(?:[أإآا]ل)?)?ذ[أإآا]ت[يى][هة]|Self[\s\-_/]+Motivat(?:ion|ed)|Self[\s\-_/]+Starter)(?!\w)',
        'known_aliases': 'التحفيز الذاتي, المبادرة الذاتية, دوافع ذاتية, مهارة المبادرة, Self-Motivation, Self-Motivated, Self-Starter',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Stress Management',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?[إأا]د[أإآا]ر[هة]\s+(?:[وبلفك]?(?:[أإآا]ل)?)?ضغوط|Stress[\s\-_/]+Management)(?!\w)',
        'known_aliases': 'إدارة الضغوط, إدارة الإجهاد, التعامل مع الضغوط المهنية, Stress Management',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Accountability',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?مس[ؤئء]ول[يى][هة]|Accountability|Ownership[\s\-_/]+Mindset)(?!\w)',
        'known_aliases': 'تحمل المسؤولية, المساءلة, الشعور بالمسؤولية, حس المسؤولية, Accountability, Ownership Mindset',
        'skill_priority': 'Core'
    },
    {
        'standard_skill_name': 'Interpersonal Communication',
        'domain': 'Operations & Project Management',
        'sub_category': 'Office & Administrative Management',
        'skill_type': 'Soft Skill',
        'applicable_level_category': 'Demonstrated Trait',
        'initial_regex_pattern': r'(?<!\w)(?:(?:[وبلفك]?(?:[أإآا]ل)?)?تو[أإآا]صل\s+(?:[وبلفك]?(?:[أإآا]ل)?)?شخص[يى]|Interpersonal[\s\-_/]+Communication|Interpersonal[\s\-_/]+Skills)(?!\w)',
        'known_aliases': 'التواصل بين الأشخاص, مهارات التعامل مع الآخرين, بناء العلاقات المهنية, Interpersonal Skills, Interpersonal Communication',
        'skill_priority': 'Core'
    }
]

# Read existing rows
with open(CATALOG_PATH, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    fieldnames = reader.fieldnames
    existing_rows = list(reader)

existing_names = set(r['standard_skill_name'].lower() for r in existing_rows)

added_count = 0
for skill in new_soft_skills:
    if skill['standard_skill_name'].lower() not in existing_names:
        existing_rows.append(skill)
        existing_names.add(skill['standard_skill_name'].lower())
        added_count += 1

with open(CATALOG_PATH, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
    writer.writeheader()
    writer.writerows(existing_rows)

print(f"[+] Successfully added {added_count} comprehensive soft skills to {CATALOG_PATH}.")
print(f"[+] Total catalog rows now: {len(existing_rows)}")
