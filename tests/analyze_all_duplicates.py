import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import pandas as pd
from collections import defaultdict
from linguistic_intelligence.catalog import CatalogLoader
from linguistic_intelligence.config import (
    CANONICAL_SKILL_HOMES,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES_SET,
    DOMAIN_TO_SUBCATEGORIES,
)

cat = CatalogLoader()
df = pd.read_csv("standard_skills_catalog.csv", sep=";", encoding="utf-8-sig")

dups = df[df.duplicated(subset=["standard_skill_name"], keep=False)]
dup_names = sorted(dups["standard_skill_name"].unique())
print(f"Total unique duplicate skill names: {len(dup_names)}")

tier1_matches = []
tier2_matches = []
issues = []

for name in dup_names:
    entry = cat.get_exact_match(name)
    if entry is None:
        issues.append((name, "NOT_FOUND", "get_exact_match returned None"))
        continue
    
    # Check taxonomy
    if entry.domain not in CLOSED_DOMAINS_SET:
        issues.append((name, "INVALID_DOMAIN", entry.domain))
    if entry.sub_category not in CLOSED_SUBCATEGORIES_SET:
        issues.append((name, "INVALID_SUBCAT", entry.sub_category))
    if entry.sub_category not in DOMAIN_TO_SUBCATEGORIES.get(entry.domain, ()):
        issues.append((name, "HIERARCHY_MISMATCH", f"{entry.domain} -> {entry.sub_category}"))
    
    # Check if in Tier 1 CANONICAL_SKILL_HOMES
    is_tier1 = False
    for can_name, (can_dom, can_sub, can_type) in CANONICAL_SKILL_HOMES.items():
        if can_name.lower() == name.lower():
            is_tier1 = True
            if entry.domain != can_dom or entry.sub_category != can_sub:
                issues.append((name, "TIER1_MISMATCH", f"Expected ({can_dom}, {can_sub}) but got ({entry.domain}, {entry.sub_category})"))
            break
            
    if is_tier1:
        tier1_matches.append((name, entry.domain, entry.sub_category, entry.skill_priority))
    else:
        tier2_matches.append((name, entry.domain, entry.sub_category, entry.skill_priority))

print(f"Resolved via Tier 1 (CANONICAL_SKILL_HOMES): {len(tier1_matches)}")
print(f"Resolved via Tier 2 (Algorithmic Multi-Factor): {len(tier2_matches)}")
print(f"Taxonomy / Resolution issues found: {len(issues)}")

for iss in issues:
    print("ISSUE:", iss)

print("\n--- Tier 1 Sample Resolutions ---")
for m in tier1_matches[:10]:
    print(f"  {m[0]:<25} -> {m[1]} / {m[2]} ({m[3]})")

print("\n--- Tier 2 Sample Resolutions ---")
for m in tier2_matches[:15]:
    print(f"  {m[0]:<25} -> {m[1]} / {m[2]} ({m[3]})")
