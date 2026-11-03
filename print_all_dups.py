import json

with open("catalog_threshold_comparative_report.json", "r", encoding="utf-8") as f:
    report = json.load(f)

print("=== ALL 33 DUPLICATE STEM PAIRS IN T=10 ===")
for i, (a, b) in enumerate(report["threshold_10_summary"]["sample_duplicate_stems"]):
    print(f"[{i+1:2d}] {a}  <--->  {b}")

print("\n=== ALL 64 DUPLICATE STEM PAIRS IN T=5 ===")
for i, (a, b) in enumerate(report["threshold_5_summary"]["sample_duplicate_stems"]):
    print(f"[{i+1:2d}] {a}  <--->  {b}")
