import sys
import os
import unittest
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')

test_dir = os.path.abspath(os.path.dirname(__file__))
test_files = sorted([f for f in os.listdir(test_dir) if f.startswith('test_') and f.endswith('.py')])

print(f"Discovered {len(test_files)} test files in {test_dir}\n")

suite_results = []

for tf in test_files:
    module_name = tf[:-3]
    loader = unittest.TestLoader()
    try:
        suite = loader.loadTestsFromName(f"tests.{module_name}")
        discovered = suite.countTestCases()
    except Exception as e:
        discovered = 0
        suite_results.append({
            "file": tf,
            "discovered": discovered,
            "passed": 0,
            "failed": 0,
            "errors": 1,
            "skipped": 0,
            "not_run": 0,
            "blocked": 0,
            "not_applicable": 0,
            "notes": f"Load error: {e}"
        })
        continue

    # Run the suite
    stream = io.StringIO()
    runner = unittest.TextTestRunner(stream=stream, verbosity=0)
    result = runner.run(suite)
    
    passed = result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped)
    failed = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped)
    not_run = 0
    blocked = 0
    not_applicable = 0
    
    # Check if this file has tests that were skipped due to downstream milestone dependencies
    notes = ""
    if skipped > 0:
        notes = f"{skipped} skipped (e.g. downstream dependencies)"
        
    suite_results.append({
        "file": tf,
        "discovered": discovered,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "skipped": skipped,
        "not_run": not_run,
        "blocked": blocked,
        "not_applicable": not_applicable,
        "notes": notes
    })

print("| Test File | Discovered | Passed | Failed | Errors | Skipped | Not Run | Blocked | Not Applicable | Notes |")
print("| --------- | ---------: | -----: | -----: | -----: | ------: | ------: | ------: | -------------: | ----- |")
total_disc = total_pass = total_fail = total_err = total_skip = 0
for r in suite_results:
    total_disc += r["discovered"]
    total_pass += r["passed"]
    total_fail += r["failed"]
    total_err += r["errors"]
    total_skip += r["skipped"]
    print(f"| `{r['file']}` | {r['discovered']} | {r['passed']} | {r['failed']} | {r['errors']} | {r['skipped']} | {r['not_run']} | {r['blocked']} | {r['not_applicable']} | {r['notes']} |")

print(f"| **TOTAL** | **{total_disc}** | **{total_pass}** | **{total_fail}** | **{total_err}** | **{total_skip}** | **0** | **0** | **0** | |")
