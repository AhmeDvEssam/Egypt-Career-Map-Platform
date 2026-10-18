import sys
import re

# 1. Update Map
file_path_map = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path_map, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Canvas/World_Light_Gray_Base', 'Canvas/World_Dark_Gray_Base')
content = content.replace('color: #78716c;', 'color: #c4b5fd;')
content = content.replace('color: #292524;', 'color: #ffffff;')
content = content.replace('backgroundColor: "#faf6f0"', 'backgroundColor: "#090514"')
content = content.replace('rgba(250,246,240,0.95)', 'rgba(21,14,40,0.95)')

with open(file_path_map, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update Globals
file_path_css = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\globals.css'
with open(file_path_css, 'r', encoding='utf-8') as f:
    content = f.read()

root_replacement = """:root {
  --background: #090514;
  --foreground: #ffffff;
}"""
content = re.sub(r':root\s*\{[^}]*\}', root_replacement, content)

theme_replacement = """@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: #ff2a7a;
  --color-secondary: #00e5ff;
  --color-tertiary: #a200ff;
  --color-error: #ef4444;
  --color-surface: #150e28;
  --color-surface-variant: #261947;
  --color-surface-container: #1b1236;
  --color-surface-container-high: #261947;
  --color-outline: #7b52ab;
  --color-outline-variant: #49306b;
}"""
content = re.sub(r'@theme inline\s*\{[^}]*\}', theme_replacement, content)

with open(file_path_css, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated to Cyberpunk Neon')
