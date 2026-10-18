import sys
import re

# 1. Update Map
file_path_map = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path_map, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Canvas/World_Dark_Gray_Base', 'Canvas/World_Light_Gray_Base')
# Revert colors to light theme styles
content = content.replace('color: #a1a1aa;', 'color: #78716c;')
content = content.replace('color: #f4f4f5;', 'color: #292524;')
content = content.replace('backgroundColor: "#000000"', 'backgroundColor: "#faf6f0"')
content = content.replace('rgba(24,24,27,0.95)', 'rgba(250,246,240,0.95)')

with open(file_path_map, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update Globals
file_path_css = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\globals.css'
with open(file_path_css, 'r', encoding='utf-8') as f:
    content = f.read()

root_replacement = """:root {
  --background: #faf6f0;
  --foreground: #292524;
}"""
content = re.sub(r':root\s*\{[^}]*\}', root_replacement, content)

theme_replacement = """@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: #d97757;
  --color-secondary: #c05c3c;
  --color-tertiary: #5c6e58;
  --color-error: #dc2626;
  --color-surface: #ffffff;
  --color-surface-variant: #e5dfd3;
  --color-surface-container: #f5efe6;
  --color-surface-container-high: #e5dfd3;
  --color-outline: #a8a29e;
  --color-outline-variant: #d6d3d1;
}"""
content = re.sub(r'@theme inline\s*\{[^}]*\}', theme_replacement, content)

with open(file_path_css, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated to Desert Sand')
