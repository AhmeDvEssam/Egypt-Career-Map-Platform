import sys
import re

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\api\jobs\route.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """    if (q) {
      const tsQuery = q.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').trim().split(/\s+/).filter(Boolean).join(' | ');
      
      AND.push({
        OR: [
          { titleRaw: { contains: q, mode: "insensitive" } },
          { titleNormalized: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { jobCategory: { contains: q, mode: "insensitive" } },
          { locationNormalized: { contains: q, mode: "insensitive" } },
          { descriptions: { some: { content: tsQuery ? { search: tsQuery } : { contains: q, mode: "insensitive" } } } },
          { skills: { some: { skill: { name: { contains: q, mode: "insensitive" } } } } },
          { industries: { some: { industry: { name: { contains: q, mode: "insensitive" } } } } }
        ]
      });
    }"""

content = re.sub(r'    if \(q\) \{.*?\n    \}', replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Jobs route updated')
