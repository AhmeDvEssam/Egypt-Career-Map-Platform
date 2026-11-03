import tempfile
import json
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from linguistic_intelligence.catalog import CatalogLoader
from linguistic_intelligence.proper_nouns import AcronymResolver

# 1. Test custom acronym dictionary
custom_acronyms = {
    "CUSTOM1": {
        "acronym": "CUSTOM1",
        "full_name": "Custom Full Skill One",
        "canonical_skill_name": "Custom Full Skill One",
        "domain": "Software Engineering & IT",
        "sub_category": "Backend Development",
        "skill_type": "Hard Skill",
        "source": "AuditTest"
    }
}

with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json", encoding="utf-8") as f:
    json.dump(custom_acronyms, f)
    custom_acronym_path = f.name

try:
    resolver = AcronymResolver(custom_acronym_path)
    assert len(resolver.acronyms) == 1, f"Expected 1 acronym, got {len(resolver.acronyms)}"
    entry = resolver.get_acronym("CUSTOM1")
    assert entry is not None, "Failed to retrieve CUSTOM1"
    assert entry.full_name == "Custom Full Skill One"
    assert resolver.get_acronym("Custom Full Skill One") is not None, "Reverse lookup failed"
    print("AcronymResolver dynamic loading: PASSED")
finally:
    Path(custom_acronym_path).unlink(missing_ok=True)

# 2. Test custom catalog with semicolon parsing
custom_catalog_rows = [
    ["standard_skill_name", "domain", "sub_category", "skill_type", "applicable_level_category", "initial_regex_pattern", "known_aliases", "skill_priority"],
    ["AuditedSkillA", "Software Engineering & IT", "Backend Development", "Hard Skill", "Hard Skill", r"\baudited\s*a\b", "AliasA1,AliasA2", "Core"],
    ["AuditedSkillB", "Data Science & Analytics", "Data Engineering", "Tool / Software", "Tool / Software", "", "AliasB", "Foundational"]
]

with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f, delimiter=";")
    writer.writerows(custom_catalog_rows)
    custom_catalog_path = f.name

with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f, delimiter=";")
    writer.writerow(["skill_type", "level_category", "standard_level", "rank_order", "regex_patterns", "arabic_patterns", "example_usage"])
    writer.writerow(["Hard Skill", "Hard Skill", "Advanced", 1, r"\badv\b", "", ""])
    custom_levels_path = f.name

try:
    loader = CatalogLoader(
        catalog_path=custom_catalog_path,
        acronyms_path=DEFAULT_ACRONYM_PATH if 'DEFAULT_ACRONYM_PATH' in locals() else Path(__file__).resolve().parent.parent.parent.parent / "skills_acronym_dictionary.json",
        levels_path=custom_levels_path,
    )
    assert loader.raw_row_count == 2, f"Expected 2 rows, got {loader.raw_row_count}"
    assert len(loader.unique_standard_skills) == 2
    match_a = loader.get_exact_match("AuditedSkillA")
    assert match_a is not None and match_a.domain == "Software Engineering & IT"
    match_alias = loader.get_exact_match("AliasA1")
    assert match_alias is not None and match_alias.standard_skill_name == "AuditedSkillA"
    regex_match = loader.get_regex_match("I know audited a well")
    assert regex_match is not None and regex_match.standard_skill_name == "AuditedSkillA"
    print("CatalogLoader dynamic CSV parsing & alias resolution: PASSED")
finally:
    Path(custom_catalog_path).unlink(missing_ok=True)
    Path(custom_levels_path).unlink(missing_ok=True)

print("ALL DYNAMIC AUDIT CHECKS PASSED.")
