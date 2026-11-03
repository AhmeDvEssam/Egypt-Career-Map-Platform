import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'd:\Hire Q Project\.md\collected_evidence.json', 'r', encoding='utf-8') as f:
    ev = json.load(f)

print('--- MULTISET ---')
print(json.dumps(ev['multiset'], indent=2))

print('\n--- API SAMPLES ---')
for s in ev['api_preservation_samples']:
    print(f"{s['skill']}: expected={s['expected']}, entries={s['entries_count']}, assocs={s['assocs_count']}")

print('\n--- INVARIANT FAILURES ---')
print('Count:', ev['invariant_failures_count'])

print('\n--- AUDIT ROWS COUNT ---')
print('Audit rows:', ev['audit_rows_count'])
print('Unapproved skill types count:', ev['unapproved_skill_types_count'])

print('\n--- DETERMINISM ---')
for d in ev['determinism_results']:
    print(f"{d['input']}: {d['result']} (runs={d['run_count']}, mem={d['membership_identical']}, ord={d['ordering_identical']}, cnt={d['counts_identical']})")

print('\n--- CALL SITES ---')
print('Total call sites found:', len(ev['call_sites']))
for cs in ev['call_sites']:
    print(f"  {cs['file']}:{cs['line']} -> {cs['func']}: {cs['code']}")

print('\n--- OVERLAPPING CASES ---')
for oc in ev['overlapping_results']:
    print(f"Input: {oc['input']} | Conflict: {oc['potential_conflict']}")
    print(f"  Exact matches: {oc['exact_matches']}")
    print(f"  Regex matches: {oc['regex_matches']}")
    print(f"  All matched: {oc['all_matched_names']}")
    print(f"  Shields: proper={oc['is_protected_proper']}, compound={oc['is_protected_compound']}")
