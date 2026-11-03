import sys
import os
import unittest
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')

test_dir = os.path.abspath(os.path.dirname(__file__))
test_files = sorted([f for f in os.listdir(test_dir) if f.startswith('test_') and f.endswith('.py')])

print(f"Auditing {len(test_files)} test suites in {test_dir}\n")

suite_results = []

for tf in test_files:
    module_name = tf[:-3]
    loader = unittest.TestLoader()
    try:
        suite = loader.loadTestsFromName(f"tests.{module_name}")
        discovered = suite.countTestCases()
    except Exception as e:
        suite_results.append({
            "file": tf,
            "discovered": 0,
            "passed": 0,
            "failed": 0,
            "errors": 1,
            "skipped_classes": 0,
            "not_run": 0,
            "notes": f"Load error: {e}"
        })
        continue

    # Run the suite
    stream = io.StringIO()
    runner = unittest.TextTestRunner(stream=stream, verbosity=0)
    result = runner.run(suite)

    failed = len(result.failures)
    errors = len(result.errors)
    skipped_classes = len(result.skipped)

    # In unittest, if setUpClass skips, result.testsRun is 0.
    # Any method that actually ran without failing/erring is passed.
    method_skips = len([s for s in result.skipped if "setUpClass" not in str(s[0])])
    passed = max(0, result.testsRun - failed - errors - method_skips)
    not_run = max(0, discovered - passed - failed - errors)

    notes = ""
    if skipped_classes > 0:
        notes = f"{skipped_classes} downstream class(es) skipped (M2-M5 on hold)"
    elif passed == discovered and discovered > 0:
        notes = "100% passed (M1 pure suite)"

    suite_results.append({
        "file": tf,
        "discovered": discovered,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "skipped_classes": skipped_classes,
        "not_run": not_run,
        "notes": notes
    })

print("| Test File | Discovered Methods | Executed & Passed | Failed | Errors | Skipped Classes | Not Run (Pending M2-M5) | Notes |")
print("| --------- | -----------------: | ----------------: | -----: | -----: | --------------: | -----------------------: | ----- |")

tot_disc = tot_pass = tot_fail = tot_err = tot_skip_cls = tot_not_run = 0
for r in suite_results:
    tot_disc += r["discovered"]
    tot_pass += r["passed"]
    tot_fail += r["failed"]
    tot_err += r["errors"]
    tot_skip_cls += r["skipped_classes"]
    tot_not_run += r["not_run"]
    print(f"| `{r['file']}` | {r['discovered']} | {r['passed']} | {r['failed']} | {r['errors']} | {r['skipped_classes']} | {r['not_run']} | {r['notes']} |")

print(f"| **TOTAL** | **{tot_disc}** | **{tot_pass}** | **{tot_fail}** | **{tot_err}** | **{tot_skip_cls}** | **{tot_not_run}** | |")
