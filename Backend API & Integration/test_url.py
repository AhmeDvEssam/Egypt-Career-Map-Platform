import re

content = open(r'C:\Users\ahmed\.gemini\antigravity\brain\18256508-82e7-440b-b872-96072dfac726\.system_generated\steps\2337\content.md', encoding='utf-8', errors='replace').read()

# Find API base URLs
for line in content.split('\n'):
    if any(x in line.lower() for x in ['base_url', 'api.', '/v1', 'opencode', 'zen', 'sk-ajh', 'freellm']):
        print(line.strip())
