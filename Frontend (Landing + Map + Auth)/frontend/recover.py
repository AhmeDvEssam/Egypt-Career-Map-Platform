import json
import os

transcript_path = r"C:\Users\ahmed\.gemini\antigravity\brain\73ae5a27-a225-4abc-91a3-c159b91ca1e2\.system_generated\logs\transcript_full.jsonl"
target_file = r"d:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend\src\app\page.tsx"

best_content = None

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if "tool_calls" in entry:
                for tc in entry["tool_calls"]:
                    if tc["name"] in ("write_to_file", "replace_file_content"):
                        if tc["args"].get("TargetFile", "").endswith("src\\app\\page.tsx"):
                            if "CodeContent" in tc["args"]:
                                best_content = tc["args"]["CodeContent"]
        except Exception as e:
            pass

if best_content:
    with open("recovered_page.tsx", "w", encoding='utf-8') as out:
        out.write(best_content)
    print("Recovered!")
else:
    print("Not found.")
