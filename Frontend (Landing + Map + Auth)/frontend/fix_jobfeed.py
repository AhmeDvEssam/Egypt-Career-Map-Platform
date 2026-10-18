import sys

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\JobFeed.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { useEffect, useState } from "react";', 'import { useEffect, useState } from "react";\nimport { useSearchParams } from "next/navigation";')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('JobFeed fixed')
