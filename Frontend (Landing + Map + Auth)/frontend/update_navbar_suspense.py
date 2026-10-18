import sys

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\Navbar.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'Suspense' not in content:
    content = content.replace('import { useState', 'import { useState, Suspense')
    
content = content.replace('<FilterPanel />', '<Suspense fallback={<div className="w-24 h-10"></div>}><FilterPanel /></Suspense>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Navbar Suspense added')
