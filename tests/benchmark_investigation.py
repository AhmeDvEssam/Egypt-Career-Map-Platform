import sys
import os
import time
import statistics

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')

from linguistic_intelligence.catalog import CatalogLoader

print("=== BENCHMARK LATENCY FORENSIC INVESTIGATION ===")
loader = CatalogLoader()
num_patterns = len(loader.compiled_regexes)
print(f"Total compiled catalog regex patterns: {num_patterns}")

# Exact lookup benchmark (10 rounds of 1,000 lookups)
test_skills = [
    "Python", "SQL", "Microsoft Excel", "Excel", "Git", "Jira", "Docker", "Linux",
    "Communication", "Problem Solving", "Data Analysis", "Machine Learning",
    "Java", "C++", "JavaScript", "HTML", "CSS", "React", "Angular", "Node.js",
]
exact_latencies = []
for r in range(10):
    t0 = time.perf_counter()
    for i in range(1000):
        s = test_skills[i % len(test_skills)]
        res = loader.get_exact_match(s)
    el = (time.perf_counter() - t0) * 1000
    exact_latencies.append(el)

print(f"\n1. Exact Match (1,000 lookups across 10 rounds):")
print(f"   Min:    {min(exact_latencies):.2f} ms")
print(f"   Max:    {max(exact_latencies):.2f} ms")
print(f"   Mean:   {statistics.mean(exact_latencies):.2f} ms")
print(f"   Median: {statistics.median(exact_latencies):.2f} ms")
print(f"   Per-lookup latency: {statistics.mean(exact_latencies)/1000*1000:.2f} microseconds")

# Matched regex benchmark (10 rounds of 100 searches)
test_phrases = [
    "Senior Python Developer", "Proficient in SQL and R", "Advanced Microsoft Excel User",
    "Git version control", "Jira sprint tracking", "Docker containers",
]
matched_latencies = []
for r in range(10):
    t0 = time.perf_counter()
    for i in range(100):
        p = test_phrases[i % len(test_phrases)]
        res = loader.get_regex_match(p)
    el = (time.perf_counter() - t0) * 1000
    matched_latencies.append(el)

print(f"\n2. Matched Regex (100 searches across 10 rounds):")
print(f"   Min:    {min(matched_latencies):.2f} ms")
print(f"   Max:    {max(matched_latencies):.2f} ms")
print(f"   Mean:   {statistics.mean(matched_latencies):.2f} ms")
print(f"   Median: {statistics.median(matched_latencies):.2f} ms")
print(f"   Per-search latency: {statistics.mean(matched_latencies)/100:.2f} ms/search")

# Unmatched regex benchmark (Worst Case: 10 rounds of 100 searches, iterating all 2,756 patterns)
unmatched_phrases = [f"UnmatchedNovelSkillExpression_{i}" for i in range(100)]
unmatched_latencies = []
for r in range(10):
    t0 = time.perf_counter()
    for p in unmatched_phrases:
        res = loader.get_regex_match(p)
    el = (time.perf_counter() - t0) * 1000
    unmatched_latencies.append(el)

total_evaluations_per_round = 100 * num_patterns
print(f"\n3. Worst-Case Unmatched Regex (100 searches = {total_evaluations_per_round:,} regex evals across 10 rounds):")
print(f"   Min:    {min(unmatched_latencies):.2f} ms")
print(f"   Max:    {max(unmatched_latencies):.2f} ms")
print(f"   Mean:   {statistics.mean(unmatched_latencies):.2f} ms")
print(f"   Median: {statistics.median(unmatched_latencies):.2f} ms")
print(f"   Per-search latency: {statistics.mean(unmatched_latencies)/100:.2f} ms/search")
print(f"   Per-pattern evaluation latency: {statistics.mean(unmatched_latencies)*1000 / total_evaluations_per_round:.3f} microseconds / evaluation")
