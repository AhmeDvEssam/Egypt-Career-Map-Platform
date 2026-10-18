import os
import requests
import json

from agents.experts import ExpertAgents
from agents.market_data import get_market_summary, get_job_recommendations
from agents.ai_logger import log_ai_interaction

class AgentManager:
    def __init__(self, ollama_url="http://localhost:11434/api/generate", local_model="llama3.2:3b"):
        self.ollama_url = ollama_url
        self.local_model = local_model
        # Pass to experts to enable fallback within them
        self.experts = ExpertAgents(ollama_url=ollama_url, local_model=local_model)
        
    def route_query(self, user_query):
        """
        ADVANCED ROUTER V2: Classification + Confidence
        Returns: Tuple (Intent, Confidence)
        """
        # --- KEYWORD OVERRIDE (Safety Layer) ---
        q = user_query.lower()
        # --- KEYWORD OVERRIDE (Safety Layer) ---
        q = user_query.lower()
        if any(w in q for w in ['show me', 'find jobs', 'search for', 'looking for work', 'vacancies', 'hiring', 'market']):
             return "JOB_SEARCH"
             
        # Strict "Interview" intent only if explicit
        if any(w in q for w in ['mock interview', 'start interview', 'quiz me']):
             return "INTERVIEW"
             
        # Strict "Career Coach" intent only if explicit advice requested
        if any(w in q for w in ['career path', 'how to become', 'roadmap', 'cv review']):
             return "CAREER_COACH"
             
        # "Career Level" is a SEARCH FILTER, not Coaching.
        if "career level" in q:
            return "JOB_SEARCH"

        system_prompt = (
            "You are the Router for 'Hire Q' Career System. \n"
            "Classify user input into exactly ONE category:\n"
            "1. **INTERVIEW**: (User discusses experience, answers interview questions, asks for mock interview).\n"
            "2. **CAREER_COACH**: (User asks for advice, learning paths, skills, 'how to become').\n"
            "3. **JOB_SEARCH**: (User asks for jobs, market data, salaries, roles).\n"
            "4. **GREETING**: (Hi, Hello, Thanks).\n"
            "5. **GENERAL**: (Anything else).\n\n"
            "Output JSON ONLY: {\"intent\": \"CATEGORY\", \"confidence\": 0.0-1.0}"
        )
        
        payload = {
            "model": self.local_model,
            "prompt": f"{system_prompt}\n\nUser: {user_query}\nOutput:",
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": 50, "format": "json"} # JSON Mode
        }
        
        try:
            response = requests.post(self.ollama_url, json=payload, timeout=5)
            if response.status_code == 200:
                res_json = json.loads(response.json().get("response", "{}"))
                intent = res_json.get("intent", "GENERAL").upper()
                return intent
        except Exception as e:
            print(f"Router Error: {e}")
            return "GENERAL"
        
        return "GENERAL"

    def chat_with_expert(self, intent, user_input, history, rag_enabled=True, persona='assistant'):
        """
        Calls the specialized Gemini expert based on intent.
        Respects RAG setting and Persona override.
        """
        # 1. Get real-time market trends (Safely)
        try:
            market_summary = get_market_summary()
        except Exception as e:
            print(f"⚠️ Market Data Error: {e}")
            market_summary = ""
        
        # 2. Get specific job recommendations (Safely)
        matching_jobs = []
        try:
            # Only fetch web jobs if RAG is useful? 
            # Actually, get_job_recommendations uses local dataset filtering usually.
            # So we keep it. Check implementations.
            matching_jobs = get_job_recommendations(user_input)
            
            # Format the list for the prompt
            if matching_jobs:
                jobs_context = "\n--- Found Matching Jobs from Hire Q Database ---\n"
                for j in matching_jobs:
                    jobs_context += f"- {j['Title']} at {j['Company']} ({j['City']}) - Link: {j['Link']}\n"
            else:
                jobs_context = "\n(No specific job matches found in database for this query)\n"
        except Exception as e:
            print(f"⚠️ Job Rec Error: {e}")
            jobs_context = ""
        
        # 3. Get dataset context if RAG enabled (NEW!)
        dataset_context = ""
        if rag_enabled:
            try:
                from agents.dataset_rag import get_dataset_rag
                dataset_rag = get_dataset_rag()
                dataset_context = dataset_rag.get_dataset_context(user_input)
                if dataset_context:
                    print(f"✅ Dataset RAG injected: {len(dataset_context)} chars")
            except Exception as e:
                print(f"⚠️ Dataset RAG Error: {e}")
            
        full_context = market_summary + jobs_context + dataset_context
        
        # Determine Target Persona Key based on Router Intent
        # Strategy: Map Router Intent to 'experts.py' persona keys
        target_role = "assistant" # Default
        if intent == "INTERVIEW":
            target_role = "interviewer"
        elif intent == "CAREER_COACH":
            target_role = "coach"
        elif intent == "JOB_SEARCH":
            target_role = "assistant"
        elif intent == "VOICE_INTERVIEW":
            target_role = "interviewer_voice"
        
        # Override if user manually Selected a specific Mode (e.g. they clicked "Interviewer Mode" button)
        # BUT respect the 'Master System' philosophy: Router detects if they are *acting* out of character?
        # No, for now, let's trust the 'persona' arg passed from UI as the "User's Desired Mode".
        # The 'intent' is just to understand *what* they passed.
        
        # ACTUALLY: The ExpertAgents._generate now handles the 'Constraint' logic.
        # So we just pass the user's *Selected Persona* to the expert, and the Expert's Prompt will reject invalid commands.
        
        response = self.experts._generate(full_context + f"\nUser Input: {user_input}", use_rag=rag_enabled, persona=persona)
            
        # Log for future fine-tuning
        log_ai_interaction(user_input, response, intent, full_context)
        return response
            
        # Log for future fine-tuning
        log_ai_interaction(user_input, response, intent, full_context)
        return response

# Example usage (for testing):
if __name__ == "__main__":
    man = AgentManager()
    test_queries = [
        "can you check if my cv matches the data analyst job?",
        "i want to practice an interview for a sales role",
        "find me some new jobs in Maadi from the internet",
        "hi how are you"
    ]
    for q in test_queries:
        print(f"Query: {q} -> Route: {man.route_query(q)}")
