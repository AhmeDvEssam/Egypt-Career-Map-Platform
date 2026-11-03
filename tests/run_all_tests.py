"""
Master Test Runner: Egypt Career Map Test Suite
==============================================
Discovers and executes all 4 tiers of E2E tests, the benchmark traces,
and generates formatted execution summaries.

Usage:
    python tests/run_all_tests.py
    python tests/run_all_tests.py --verbose
    python tests/run_all_tests.py --suite tier1
    python tests/run_all_tests.py --strict
"""

import os
import sys
import time
import argparse
import unittest
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

SUITE_MAP = {
    "benchmark": "test_benchmark_spec_traces",
    "tier1": "test_tier1_feature_coverage",
    "tier2": "test_tier2_boundary_corner",
    "tier3": "test_tier3_pairwise_combinations",
    "tier4": "test_tier4_real_world_workloads",
    "multidomain": "test_multi_domain_associations",
    "seniority": "test_seniority_vs_proficiency",
}


def create_banner():
    width = 78
    return "\n".join([
        "=" * width,
        "  EGYPT CAREER MAP — ATOMIC SKILL DECOMPOSITION ENGINE",
        "  E2E Requirement-Driven Opaque-Box Test Suite Runner",
        "=" * width,
    ])


def run_suites(target_suite=None, verbose=False, failfast=False, strict=False):
    if strict:
        os.environ["SKIP_IF_UNIMPLEMENTED"] = "0"

    loader = unittest.TestLoader()
    suite_names = [target_suite] if target_suite else list(SUITE_MAP.keys())

    print(create_banner())
    print(f"Executing target suite(s): {', '.join(suite_names)}")
    print(f"Strict implementation mode: {strict}")
    print("-" * 78)

    master_suite = unittest.TestSuite()
    suite_counts = {}

    for name in suite_names:
        module_name = f"tests.{SUITE_MAP[name]}"
        try:
            mod_suite = loader.loadTestsFromName(module_name)
            count = mod_suite.countTestCases()
            suite_counts[name] = count
            master_suite.addTest(mod_suite)
            print(f"  [+] Loaded {name:10} ({module_name}): {count:3} test cases")
        except Exception as e:
            print(f"  [!] Error loading {name} ({module_name}): {e}")
            return 1

    total_tests = master_suite.countTestCases()
    print("-" * 78)
    print(f"Total Test Cases Discovered: {total_tests}")
    print("=" * 78)

    verbosity = 2 if verbose else 1
    runner = unittest.TextTestRunner(verbosity=verbosity, failfast=failfast)

    start_time = time.perf_counter()
    result = runner.run(master_suite)
    elapsed = time.perf_counter() - start_time

    passed_count = max(0, result.testsRun - len(result.failures) - len(result.errors))
    print("\n" + "=" * 78)
    print("  TEST SUITE EXECUTION SUMMARY")
    print("=" * 78)
    print(f"  Total Test Cases Discovered: {total_tests}")
    print(f"  Test Methods Executed:       {result.testsRun}")
    print(f"  Passed:                      {passed_count}")
    print(f"  Failures:                    {len(result.failures)}")
    print(f"  Errors:                      {len(result.errors)}")
    print(f"  Skipped (Pending Modules):   {len(result.skipped)}")
    print(f"  Duration:                    {elapsed:.3f} seconds")
    print("-" * 78)

    if result.wasSuccessful():
        if len(result.skipped) == result.testsRun and result.testsRun > 0:
            print("  STATUS: READY (All tests compiled and waiting for milestone implementation)")
        else:
            print("  STATUS: SUCCESS (All executed tests passed!)")
        print("=" * 78)
        return 0
    else:
        print("  STATUS: FAILED (Failures or errors detected)")
        print("=" * 78)
        return 1


def main():
    parser = argparse.ArgumentParser(description="Master Test Runner for Egypt Career Map")
    parser.add_argument(
        "--suite",
        choices=list(SUITE_MAP.keys()),
        default=None,
        help="Run a specific test suite (default: all)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output",
    )
    parser.add_argument(
        "--failfast",
        action="store_true",
        help="Stop execution on first failure",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Disallow skipping unimplemented modules; fail strictly if missing",
    )
    args = parser.parse_args()

    exit_code = run_suites(
        target_suite=args.suite,
        verbose=args.verbose,
        failfast=args.failfast,
        strict=args.strict,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
