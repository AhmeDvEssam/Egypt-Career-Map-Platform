import sys
sys.path.append('D:/Hire Q Project/Backend API & Integration')
from ai_worker import SmartAPIRouter, call_llm

router = SmartAPIRouter('ai_config.json')
key, provider = router.get_best_available_key(task_type='extraction')
print(f'Got key for provider: {provider}')
prompt = 'Output ONLY JSON: {"Skill": "PRESENT"}'
try:
    print('Calling LLM...')
    res = call_llm(prompt, key, provider)
    print(res)
except Exception as e:
    print('Error:', e)
