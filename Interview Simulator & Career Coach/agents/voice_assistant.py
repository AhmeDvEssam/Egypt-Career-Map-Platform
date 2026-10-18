# voice_assistant.py - REFACTORED AS DECISION ENGINE
"""
VoiceAssistant - Pure Decision Engine
Returns decision objects, does NOT execute actions
All timing and execution control is delegated to VoiceOrchestrator
"""
import json
import os
import re


class VoiceAssistant:
    """
    Decision Engine for voice interactions.
    Analyzes user input and returns decision objects.
    Does NOT control timing, persona locking, or audio playback.
    """
    
    def __init__(self, scenarios_path="d:/Hire Q Project/Modeling _2/assets/scenarios.json"):
        self.scenarios = self._load_scenarios(scenarios_path)

    # --------------------------------------------------
    # LOAD SCENARIOS
    # --------------------------------------------------
    def _load_scenarios(self, path):
        """Load interview/coaching scenarios from JSON"""
        if not os.path.exists(path):
            print(f"WARNING: Scenarios file not found at {path}")
            return []
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                scenarios = json.load(f)
            print(f"DEBUG: Loaded {len(scenarios)} scenarios")
            return scenarios
        except Exception as e:
            print(f"ERROR loading scenarios: {e}")
            return []

    # --------------------------------------------------
    # MAIN DECISION ENTRY POINT
    # --------------------------------------------------
    def analyze_input(self, user_input: str):
        """
        Analyze user input and return a decision object.
        
        Decision Object Format:
        {
            "type": "SCENARIO" | "DASHBOARD" | "ROUTER" | "NONE",
            "text": "response text",
            "persona": "interviewer" | "coach" | "assistant",
            "commands": "dashboard commands string",
            "confidence": 0.0-1.0
        }
        
        Args:
            user_input: Raw user speech text
            
        Returns:
            dict: Decision object
        """
        if not user_input or len(user_input.strip()) < 2:
            return {"type": "NONE", "confidence": 0.0}

        user_input = user_input.strip()
        
        # 1️⃣ SCENARIO MATCHING (Highest Priority)
        # Mock Interview / Coaching scenarios
        scenario = self._match_scenario(user_input)
        if scenario:
            print(f"DEBUG: Scenario matched: {scenario.get('category', 'Unknown')}")
            return {
                "type": "SCENARIO",
                "persona": scenario.get("persona", "interviewer"),
                "text": self._build_scenario_response(scenario),
                "confidence": 0.95
            }

        # 2️⃣ DASHBOARD COMMANDS (Natural Language)
        dashboard_cmds = self._detect_dashboard_commands(user_input)
        if dashboard_cmds:
            print(f"DEBUG: Dashboard commands detected: {dashboard_cmds}")
            return {
                "type": "DASHBOARD",
                "persona": "assistant",  # Navigator persona
                "text": self._build_dashboard_narration(user_input, dashboard_cmds),
                "commands": dashboard_cmds,
                "confidence": 0.85
            }

        # 3️⃣ FALLBACK TO ROUTER (LLM)
        print("DEBUG: No scenario/command match, routing to LLM")
        return {
            "type": "ROUTER",
            "persona": "assistant",  # Default to assistant
            "confidence": 0.6
        }

    # --------------------------------------------------
    # SCENARIO MATCHING
    # --------------------------------------------------
    def _match_scenario(self, user_input):
        """
        Find best matching scenario based on keyword overlap.
        
        Returns:
            dict or None: Best matching scenario
        """
        user_words = set(re.findall(r'\w+', user_input.lower()))
        best_match = None
        max_overlap = 0

        for scenario in self.scenarios:
            keywords = set(scenario.get("trigger_keywords", []))
            overlap = len(user_words.intersection(keywords))

            # Boost if example phrase is substring
            example = scenario.get("user_input_example", "").lower()
            if example and example in user_input.lower():
                overlap += 5

            if overlap > max_overlap:
                max_overlap = overlap
                best_match = scenario

        # Require minimum overlap of 1 keyword
        return best_match if max_overlap > 0 else None

    def _build_scenario_response(self, scenario):
        """
        Build concise response from scenario.
        CRITICAL: Keep responses SHORT for voice (1-2 sentences max)
        """
        parts = []
        
        # Acknowledgment
        if scenario.get("improved_answer"):
            parts.append(f"I understood: {scenario['user_input_example']}.")
        
        # Improved version (shortened)
        if scenario.get("improved_answer"):
            improved = scenario["improved_answer"]
            # Take first sentence only
            first_sentence = improved.split('.')[0] + '.'
            parts.append(f"Here is a better version: {first_sentence}")
        
        # Coaching advice (shortened)
        if scenario.get("coaching_advice"):
            advice = scenario["coaching_advice"]
            # Take first sentence only
            first_advice = advice.split('.')[0] + '.'
            parts.append(f"Advice: {first_advice}")
        
        # Next question
        if scenario.get("next_question"):
            parts.append(f"Next Question: {scenario['next_question']}")
        
        return " ".join(parts).strip()

    # --------------------------------------------------
    # BACKWARD COMPATIBILITY WRAPPER
    # --------------------------------------------------
    def get_response(self, user_input, language="en"):
        """
        BACKWARD COMPATIBILITY METHOD
        Old callback code calls this, new code uses analyze_input()
        
        Returns: (response_text, audio_settings_dict)
        """
        decision = self.analyze_input(user_input)
        
        # Convert decision to old format
        # CRITICAL: Return None if no text, not generic message
        response_text = decision.get("text", None)
        audio_settings = {
            "persona": decision.get("persona", "assistant"),
            "confidence": decision.get("confidence", 0.5),
            "commands": decision.get("commands", "")
        }
        
        return response_text, audio_settings

    # --------------------------------------------------
    # SCENARIO MATCHING (OLD METHOD NAME)
    # --------------------------------------------------
    def match_scenario(self, user_input):
        """BACKWARD COMPATIBILITY: Old name for _match_scenario"""
        return self._match_scenario(user_input)


    # --------------------------------------------------
    # DASHBOARD NARRATION
    # --------------------------------------------------
    def _build_dashboard_narration(self, user_input, commands):
        """
        Generate natural narration for dashboard actions.
        Keep it SHORT and conversational.
        """
        user_lower = user_input.lower()
        
        # City filtering
        if "city=" in commands or "FILTER:City=" in commands:
            city_match = re.search(r'city=([^|\]]+)', commands, re.IGNORECASE)
            if city_match:
                city = city_match.group(1)
                return f"Filtering jobs in {city}."
        
        # Career level
        if "career_level=" in commands.lower() or "Career Level=" in commands:
            if "entry" in user_lower or "junior" in user_lower:
                return "Showing entry-level opportunities for fresh graduates."
            elif "senior" in user_lower:
                return "Filtering senior positions."
        
        # Work mode
        if "work_mode=" in commands.lower() or "Remote" in commands:
            if "remote" in user_lower:
                return "Looking for remote positions."
            elif "hybrid" in user_lower:
                return "Filtering hybrid roles."
        
        # Education
        if "education=" in commands.lower():
            if "master" in user_lower:
                return "Showing roles requiring a master's degree."
            elif "bachelor" in user_lower:
                return "Filtering positions for bachelor's holders."
        
        # Search
        if "SEARCH:" in commands:
            search_match = re.search(r'SEARCH:([^|\]]+)', commands)
            if search_match:
                term = search_match.group(1).strip()
                return f"Searching for {term} roles."
        
        # Clear
        if "CLEAR" in commands:
            return "Clearing all filters."
        
        # Generic fallback
        return "Updating the dashboard based on your request."

    # --------------------------------------------------
    # DASHBOARD COMMAND DETECTION
    # --------------------------------------------------
    def _detect_dashboard_commands(self, user_input):
        """
        Extract dashboard commands from natural language.
        Returns command string or None.
        """
        user_input_lower = user_input.lower()
        commands = []

        # CITIES
        cities = {
            'cairo': 'Cairo',
            'giza': 'Giza',
            'alexandria': 'Alexandria',
            'maadi': 'Maadi',
            'nasr city': 'Nasr City',
            '6th of october': '6th Of October',
            'mansoura': 'Mansoura',
            'tanta': 'Tanta',
            'assiut': 'Assiut'
        }
        for key, val in cities.items():
            if key in user_input_lower:
                commands.append(f"[FILTER:City={val}]")
                break  # Only one city at a time

        # JOB TITLES (for search)
        roles = {
            'data analyst': 'Data Analyst',
            'business analyst': 'Business Analyst',
            'software engineer': 'Software Engineer',
            'python developer': 'Python Developer',
            'accountant': 'Accountant',
            'sales': 'Sales',
            'marketing': 'Marketing'
        }
        for key, val in roles.items():
            if key in user_input_lower:
                commands.append(f"[SEARCH:{val}]")
                break

        # WORK MODE
        if 'remote' in user_input_lower:
            commands.append("[FILTER:Work Mode=Remote]")
        elif 'hybrid' in user_input_lower:
            commands.append("[FILTER:Work Mode=Hybrid]")
        elif 'on-site' in user_input_lower or 'onsite' in user_input_lower:
            commands.append("[FILTER:Work Mode=On-site]")

        # CAREER LEVEL
        if 'entry' in user_input_lower or 'junior' in user_input_lower:
            commands.append("[FILTER:Career Level=Entry Level]")
        elif 'senior' in user_input_lower:
            commands.append("[FILTER:Career Level=Senior]")
        elif 'manager' in user_input_lower:
            commands.append("[FILTER:Career Level=Manager]")

        # EDUCATION
        if 'master' in user_input_lower:
            commands.append("[FILTER:Education=Master's Degree]")
        elif 'bachelor' in user_input_lower:
            commands.append("[FILTER:Education=Bachelor's Degree]")

        # EMPLOYMENT TYPE
        if 'full-time' in user_input_lower or 'full time' in user_input_lower:
            commands.append("[FILTER:Employment Type=Full Time]")
        elif 'part-time' in user_input_lower or 'part time' in user_input_lower:
            commands.append("[FILTER:Employment Type=Part Time]")

        # CLEAR FILTERS
        if 'clear' in user_input_lower and ('filter' in user_input_lower or 'all' in user_input_lower):
            return "[CLEAR_FILTERS]"

        # JOIN COMMANDS
        return "|".join(commands) if commands else None


# --------------------------------------------------
# SINGLETON ACCESSOR
# --------------------------------------------------
_voice_assistant_instance = None

def get_voice_assistant():
    """Get or create the global VoiceAssistant instance"""
    global _voice_assistant_instance
    if _voice_assistant_instance is None:
        _voice_assistant_instance = VoiceAssistant()
    return _voice_assistant_instance
