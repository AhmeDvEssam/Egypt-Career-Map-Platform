import sys
import re

# 1. Update Map
file_path_map = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path_map, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Canvas/World_Street_Map', 'Canvas/World_Dark_Gray_Base')
content = content.replace('color: #dae2fd;', 'color: #a1a1aa;')
content = content.replace('color: #ffffff;', 'color: #f4f4f5;')
content = content.replace('backgroundColor: "#0a192f"', 'backgroundColor: "#000000"')
content = content.replace('rgba(17,34,64,0.95)', 'rgba(24,24,27,0.95)')

with open(file_path_map, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update Globals
file_path_css = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\globals.css'
with open(file_path_css, 'r', encoding='utf-8') as f:
    content = f.read()

root_replacement = """:root {
  --background: #000000;
  --foreground: #f4f4f5;
}"""
content = re.sub(r':root\s*\{[^}]*\}', root_replacement, content)

theme_replacement = """@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: #818cf8;
  --color-secondary: #6366f1;
  --color-tertiary: #f472b6;
  --color-error: #ef4444;
  --color-surface: #121212;
  --color-surface-variant: #27272a;
  --color-surface-container: #18181b;
  --color-surface-container-high: #27272a;
  --color-outline: #52525b;
  --color-outline-variant: #3f3f46;
}"""
content = re.sub(r'@theme inline\s*\{[^}]*\}', theme_replacement, content)

with open(file_path_css, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated to Midnight Obsidian')
