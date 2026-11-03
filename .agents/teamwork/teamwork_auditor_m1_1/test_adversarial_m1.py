import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from linguistic_intelligence.proper_nouns import ProperNounShield
from linguistic_intelligence.catalog import CatalogLoader

shield = ProperNounShield()

test_cases = [
    ("Senior Care", True),
    ("Senior Living", True),
    ("Senior Python Developer", False),
    ("Senior Java Engineer", False),
    ("Lead Generation", True),
    ("Lead Time Reduction", True),
    ("Lead Java Architect", False),
    ("Lead Software Engineer", False),
    ("Advanced Threat Protection", True),
    ("GitHub Advanced Security", True),
    ("Advanced Python", False),
    ("Advanced React Development", False),
    ("Master Data Management", True),
    ("Scrum Master", True),
    ("Master Java", False),
    ("Mastery of Python", False),
    ("Solid Principles", True),
    ("Solid Edge", True),
    ("Solid Javascript Knowledge", False),
    ("Deep Learning", True),
    ("Deep Understanding of Python", False),
]

passed = 0
for text, expected in test_cases:
    actual = shield.is_protected_proper_noun(text)
    if actual == expected:
        passed += 1
    else:
        print(f"MISMATCH for '{text}': expected {expected}, got {actual}")

print(f"Proper noun shield: passed {passed}/{len(test_cases)} adversarial test cases.")

# Test CatalogLoader alias resolution and novel skill handling
loader = CatalogLoader()
assert loader.get_exact_match("NonExistentSkill12345") is None, "Novel skill must return None for exact match"
assert loader.get_exact_match("   ") is None, "Empty text must return None"
assert loader.get_regex_match("   ") is None, "Empty text must return None"

print("CatalogLoader edge cases: passed.")
