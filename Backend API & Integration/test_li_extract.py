import sys
import os
import json
import time
sys.path.append(r"d:\Hire Q Project\Backend API & Integration")
from extract_questions import extract_job_questions

url = "https://www.linkedin.com/jobs/view/4479820248/"
print(f"Extracting questions from LinkedIn job: {url}...", flush=True)
res = extract_job_questions(url)
print("EXTRACT RESULT FROM LINKEDIN:", flush=True)
print(json.dumps(res, indent=2, ensure_ascii=False), flush=True)
