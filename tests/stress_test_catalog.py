import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import time
import re
from linguistic_intelligence.catalog import CatalogLoader

cat = CatalogLoader()

test_inputs = [
    '', '   ', None, '123', '404', '0', '\U0001f40d', '\U0001f4bb\U0001f680', '\u0628\u0627\u064a\u062b\u0648\u0646', '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639',
    'C++', 'C#', 'Node.js', 'ASP.NET', '(SQL)', 'Python (Advanced)', '[React]',
    '*.*', '?+', r'\d+', 'A' * 10000, 'NonExistentSkillXYZ123'
]

print("=== EXACT MATCH TESTING ===")
for inp in test_inputs:
    try:
        res = cat.get_exact_match(inp)
        res_name = res.standard_skill_name if res else "None"
        print(f"input={repr(inp)[:30]} -> {res_name}")
    except Exception as e:
        print(f"input={repr(inp)[:30]} -> EXCEPTION: {type(e).__name__}: {e}")

print("\n=== REGEX MATCH TESTING ===")
for inp in test_inputs:
    try:
        res = cat.get_regex_match(inp)
        res_name = res.standard_skill_name if res else "None"
        print(f"input={repr(inp)[:30]} -> {res_name}")
    except Exception as e:
        print(f"input={repr(inp)[:30]} -> EXCEPTION: {type(e).__name__}: {e}")
