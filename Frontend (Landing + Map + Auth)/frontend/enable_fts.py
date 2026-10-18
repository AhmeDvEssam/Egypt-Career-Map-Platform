import sys

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\prisma\schema.prisma'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  previewFeatures = ["fullTextSearch"]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Prisma fullTextSearch enabled')
