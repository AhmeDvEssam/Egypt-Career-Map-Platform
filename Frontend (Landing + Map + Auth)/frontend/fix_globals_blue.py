import sys
file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\globals.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Replace :root
root_replacement = """:root {
  --background: #0a192f;
  --foreground: #ffffff;
}"""
content = re.sub(r':root\s*\{[^}]*\}', root_replacement, content)

# Replace @theme inline
theme_replacement = """@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: #3b82f6;
  --color-secondary: #60a5fa;
  --color-tertiary: #38bdf8;
  --color-error: #ef4444;
  --color-surface: #112240;
  --color-surface-variant: #233554;
  --color-surface-container: #0a192f;
  --color-surface-container-high: #112240;
  --color-outline: #60a5fa;
  --color-outline-variant: #3b82f6;
}"""
content = re.sub(r'@theme inline\s*\{[^}]*\}', theme_replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Globals updated')
