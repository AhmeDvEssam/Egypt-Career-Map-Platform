import sys

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\Navbar.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_str = 'import { usePathname } from "next/navigation";\nimport FilterPanel from "@/components/FilterPanel";'
content = content.replace('import { usePathname } from "next/navigation";', import_str)

# Add before Ask AI
ask_ai_btn = '{/* Ask AI */}'
replacement = '{/* Global Filters */}\n            <FilterPanel />\n            {/* Ask AI */}'
content = content.replace(ask_ai_btn, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Navbar updated')
