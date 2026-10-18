import sys
import json
sys.path.append('D:/Hire Q Project/Backend API & Integration')
from ai_worker import SmartAPIRouter, call_llm

router = SmartAPIRouter()
key, provider = router.get_best_available_key(task_type='extraction')
prompt = """
You are evaluating a candidate's CV against required market skills. 
You are given a dictionary where the keys are skill names, and the values are lists of short text snippets extracted from the CV.
Evaluate if each skill is present in the CV snippets.

Input:
{"PowerBI": ["using Power BI, Python, SQL, Excel VBA, and Power Query.", "Built a Power BI dashboard"]}

Output ONLY a JSON mapping each skill to "PRESENT", "NOT_FOUND", or "UNCERTAIN".
"""
res = call_llm(prompt, key, provider)
print(res)
