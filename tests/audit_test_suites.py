"""
Master Test Suite Auditor — Egypt Career Map Platform
=====================================================
Discovers and executes all test suites, accurately classifying:
  - Discovered Methods
  - Executed & Passed
  - Failed
  - Errors
  - Skipped (Class-Level & Method-Level)
Enforces a non-zero exit code (1) upon any failure or error,
and exits with 0 only if all test suites pass or skip cleanly.
"""

import io
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.stdout.reconfigure(encoding="utf-8")

test_dir = os.path.abspath(os.path.dirname(__file__))
test_files = sorted(
    [f for f in os.listdir(test_dir) if f.startswith("test_") and f.endswith(".py")]
)

print(f"Auditing {len(test_files)} test suites in {test_dir}\n", flush=True)

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
            "class_skips": 0,
            "total_skipped_methods": 0,
            "notes": f"Load error: {e}",
        })
        continue

    # Run the suite
    stream = io.StringIO()
    runner = unittest.TextTestRunner(stream=stream, verbosity=0)
    result = runner.run(suite)

    failed = len(result.failures)
    errors = len(result.errors)

    # Class-level skips (setUpClass) vs individual method skips
    class_skip_records = [s for s in result.skipped if "setUpClass" in str(s[0])]
    method_skips = len([s for s in result.skipped if "setUpClass" not in str(s[0])])
    class_skips = len(class_skip_records)

    passed = max(0, result.testsRun - failed - errors - method_skips)
    class_skipped_methods = max(0, discovered - (passed + failed + errors + method_skips))
    total_skipped_methods = method_skips + class_skipped_methods

    notes = ""
    if class_skips > 0:
        notes = f"{class_skips} class(es) skipped ({class_skipped_methods} methods pending M3.2-M5)"
    elif failed > 0 or errors > 0:
        notes = f"FAILED: {failed} failure(s), {errors} error(s)"
    elif passed == discovered and discovered > 0:
        if "milestone3" in tf or "m3" in tf:
            notes = "100% passed (M3.0 pure suite)"
        elif "milestone2" in tf or "m2" in tf:
            notes = "100% passed (M2 pure suite)"
        else:
            notes = "100% passed (M1 pure suite)"

    suite_results.append({
        "file": tf,
        "discovered": discovered,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "class_skips": class_skips,
        "total_skipped_methods": total_skipped_methods,
        "notes": notes,
    })

print(
    "| Test File | Discovered Methods | Executed & Passed | Failed | Errors | Skipped Classes | Skipped Methods (Pending M3.2-M5) | Notes |"
)
print(
    "| --------- | -----------------: | ----------------: | -----: | -----: | --------------: | --------------------------------: | ----- |"
)

tot_disc = tot_pass = tot_fail = tot_err = tot_skip_cls = tot_skip_meth = 0
for r in suite_results:
    tot_disc += r["discovered"]
    tot_pass += r["passed"]
    tot_fail += r["failed"]
    tot_err += r["errors"]
    tot_skip_cls += r["class_skips"]
    tot_skip_meth += r["total_skipped_methods"]
    print(
        f"| `{r['file']}` | {r['discovered']} | {r['passed']} | {r['failed']} | {r['errors']} | {r['class_skips']} | {r['total_skipped_methods']} | {r['notes']} |",
        flush=True,
    )

print(
    f"| **TOTAL** | **{tot_disc}** | **{tot_pass}** | **{tot_fail}** | **{tot_err}** | **{tot_skip_cls}** | **{tot_skip_meth}** | |",
    flush=True,
)

if tot_fail > 0 or tot_err > 0:
    print(
        f"\n[AUDIT FAILED] Regression detected: {tot_fail} failure(s) and {tot_err} error(s).",
        flush=True,
    )
    sys.exit(1)
else:
    print(
        f"\n[AUDIT PASSED] All {tot_pass} executed tests passed with 0 failures and 0 errors ({tot_skip_meth} methods deferred to downstream milestones).",
        flush=True,
    )
    sys.exit(0)
