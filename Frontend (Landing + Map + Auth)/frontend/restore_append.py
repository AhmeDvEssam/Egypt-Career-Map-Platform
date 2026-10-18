import sys

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the appendChild(el) back right after we set the transition
old_line = 'el.style.transition = "all 0.3s ease";'
new_line = 'el.style.transition = "all 0.3s ease";\n        markerContainer.appendChild(el);'
content = content.replace(old_line, new_line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
