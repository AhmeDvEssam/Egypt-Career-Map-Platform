import re
import sys

file_path = r'D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\prisma\schema.prisma'

with open(file_path, 'r', encoding='utf-8') as f:
    schema = f.read()

schema = re.sub(
    r'enum enum_Employees_contract_type\s*\{[^}]*\}',
    'enum enum_Employees_contract_type {\n  SEASONAL @map("موسمي")\n  LIMITED @map("محدد المدة")\n  MINISTERIAL @map("وزاري")\n}',
    schema
)

schema = re.sub(
    r'enum enum_Leaves_type\s*\{[^}]*\}',
    'enum enum_Leaves_type {\n  NORMAL @map("اعتيادي")\n  CASUAL @map("عارضة")\n  REST_ALLOWANCE @map("بدل راحة")\n  EXCEPTIONAL @map("استثنائية")\n}',
    schema
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(schema)

print("Fixed schema.prisma")
