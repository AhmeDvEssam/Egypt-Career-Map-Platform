import sys
file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('color: #dae2fd;', 'color: #374151;')
content = content.replace('color: #fff;', 'color: #111827;')
content = content.replace('backgroundColor: "#0b1326"', 'backgroundColor: "#f9fafb"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Map style updated further')
