import os

files_to_check = [
    r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\page.tsx',
    r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\Navbar.tsx',
    r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\components\analysis\LayoutEngine.tsx'
]

for fp in files_to_check:
    if not os.path.exists(fp):
        continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace custom variables with standard tailwind ones
    content = content.replace('px-margin-mobile md:px-margin-desktop max-w-container-max', 'px-6 lg:px-12 max-w-7xl')
    content = content.replace('px-margin-mobile', 'px-6')
    content = content.replace('md:px-margin-desktop', 'lg:px-12')
    content = content.replace('max-w-container-max', 'max-w-7xl')
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)

print("Layout spacing fixed")
