import sys
file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\InteractiveMap.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change map source to standard colorful street map
content = content.replace('Canvas/World_Light_Gray_Base', 'World_Street_Map')
# Some tooltips had color changed to dark, let's revert to white for blue background
content = content.replace('color: #374151;', 'color: #dae2fd;')
content = content.replace('color: #111827;', 'color: #ffffff;')
content = content.replace('backgroundColor: "#f9fafb"', 'backgroundColor: "#0a192f"')

# Also revert tooltip background to match new blue theme
content = content.replace('rgba(255,255,255,0.95)', 'rgba(17,34,64,0.95)')
# Also check if it's currently something else, in case it was missed
content = content.replace('rgba(11,19,38,0.95)', 'rgba(17,34,64,0.95)')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Map style updated to natural blue')
