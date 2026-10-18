import sys
import re

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\globals.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("""  --spacing-margin-mobile: 1.5rem;
  --spacing-margin-desktop: 4rem;
  --spacing-container-max: 1280px;
""", "")

theme_replacement = """@theme inline {
  --spacing-margin-mobile: 1.5rem;
  --spacing-margin-desktop: 4rem;
  --spacing-container-max: 1280px;"""

content = content.replace("@theme inline {", theme_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed globals")
