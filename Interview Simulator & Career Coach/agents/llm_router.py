# llm_router.py
"""
LLM Router with Strict Prompt Injection
Controls LLM behavior when used as fallback for complex queries
Ensures LLM respects VoiceOrchestrator and persona rules
"""


class LLMRouter:
    """
    Routes complex queries to LLM with strict behavioral contracts.
    LLM is LAST RESORT only - after scenarios and dashboard commands fail.
    """
    
    def __init__(self):
        self.max_tokens = 120  # Force concise responses
        self.temperature = 0.2  # Low creativity, high consistency
    
    # --------------------------------------------------
    # ROUTING DECISION
    # --------------------------------------------------
    def should_route(self, decision):
        """
        Determine if query should be sent to LLM.
        
        Args:
            decision: Decision object from VoiceAssistant
            
        Returns:
            bool: True if LLM routing needed
        """
        return decision.get("type") == "ROUTER"
    
    # --------------------------------------------------
    # LLM REQUEST BUILDING
    # --------------------------------------------------
    def build_request(self, user_input, persona="assistant", context=None, cv_data=None):
        """
        Build LLM request with injected contracts.
        
        Args:
            user_input: User's query text
            persona: Current locked persona
            context: Optional conversation context
            cv_data: Optional CV data for personalization
            
        Returns:
            dict: LLM request parameters
        """
        return {
            "prompt": self._inject_prompt(user_input, persona, context, cv_data),
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stop": ["\n\n", "USER:", "SYSTEM:"]  # Stop at natural breaks
        }
    
    def _inject_prompt(self, user_input, persona, context, cv_data):
        """
        Inject strict behavioral contracts into prompt.
        This is the CRITICAL layer that prevents LLM chaos.
        """
        base_contract = self._base_contract()
        persona_contract = self._persona_contract(persona)
        context_section = self._format_context(context, cv_data)
        
        return f"""{base_contract}

{persona_contract}

{context_section}

USER INPUT:
{user_input}

RESPONSE (one sentence only):""".strip()
    
    # --------------------------------------------------
    # CONTRACT DEFINITIONS
    # --------------------------------------------------
    def _base_contract(self):
        """
        Base contract that ALWAYS applies, regardless of persona.
        This is the foundation of voice UX control.
        """
        return """You are operating inside a LIVE VOICE SYSTEM.

CRITICAL CONSTRAINTS:
- Respond with ONE sentence only
- Ask at most ONE question
- Stop speaking after your response
- Never rephrase the user's words
- Never repeat previous content
- Never take initiative unless asked
- Never change your role or persona
- Never say "Let me analyze" or similar filler

TURN CONTROL:
- You speak only when allowed by the orchestrator
- If interrupted, you stop immediately
- If the user pauses briefly, you wait
- You do NOT control timing or turn-taking

VOICE RULES:
- No markdown formatting
- No bullet points or lists in speech
- No meta-commentary like "As I mentioned before"
- Natural conversational tone

Any violation of these rules is a system failure."""
    
    def _persona_contract(self, persona):
        """
        Persona-specific behavioral contracts.
        These are ADDED to the base contract.
        """
        contracts = {
            "interviewer": """
ROLE: Senior Technical Interviewer

SPECIFIC RULES:
- Ask ONE structured interview question based on user's answer
- Do not give advice unless explicitly asked "How did I do?"
- Do not introduce yourself (already done)
- If answer is vague, ask ONE clarifying question
- Match questions to demonstrated skill level
- Use actual job data (7315 jobs in dataset) for recommendations

FORBIDDEN:
- Do not say "Here is a better version" unless asked
- Do not ask multiple questions
- Do not switch to coaching mode""",
            
            "coach": """
ROLE: Career Coach

SPECIFIC RULES:
- Give ONE actionable piece of advice
- Be supportive but realistic
- Use Egyptian job market context (Cairo, Giza top cities)
- Reference actual skills demand (Python, Excel, SQL top skills)

FORBIDDEN:
- Do not conduct interviews
- Do not ask technical questions
- Do not be overly formal""",
            
            "assistant": """
ROLE: Job Market Assistant (Egypt Career Map)

SPECIFIC RULES:
- Answer using actual dataset context (7315 jobs)
- Top categories: Engineering, Finance, IT
- Top cities: Cairo, Giza, Alexandria
- Be concise and data-driven

FORBIDDEN:
- Do not invent job numbers
- Do not assume data you don't have
- Do not switch to interviewer mode""",
            
            "navigator": """
ROLE: Dashboard Navigator

SPECIFIC RULES:
- You ONLY narrate provided insights
- You do NOT analyze data yourself
- You do NOT make assumptions
- Stick to the exact insights given

CRITICAL:
- If no insights provided, say "I don't have insights for this view yet"
- Never improvise dashboard explanations"""
        }
        
        return contracts.get(persona, contracts["assistant"])
    
    def _format_context(self, context, cv_data):
        """
        Format context section for LLM prompt.
        Keep it minimal to save tokens.
        """
        sections = []
        
        if context:
            sections.append(f"CONVERSATION CONTEXT:\n{context}")
        
        if cv_data:
            sections.append(f"USER CV DATA:\n{cv_data}")
        
        if not sections:
            sections.append("CONVERSATION CONTEXT:\nThis is the start of the conversation.")
        
        return "\n\n".join(sections)
    
    # --------------------------------------------------
    # ERROR HANDLING
    # --------------------------------------------------
    def handle_error(self, error, user_input=None):
        """
        Handle LLM errors gracefully.
        
        Args:
            error: Exception that occurred
            user_input: Optional user input for logging
            
        Returns:
            str or None: Fallback response, or None for silence
        """
        print(f"⚠️  LLM Router Error: {error}")
        
        # Check error type
        if "Connection" in str(error) or "11434" in str(error):
            print("❌ LLM service unavailable (Ollama not running)")
            return None  # SILENCE is better than bad response
        
        elif "timeout" in str(error).lower():
            print("⏱️  LLM timeout")
            return None
        
        else:
            print(f"❓ Unknown LLM error: {error}")
            return None
    
    # --------------------------------------------------
    # RESPONSE VALIDATION
    # --------------------------------------------------
    def validate_response(self, response_text):
        """
        Validate LLM response meets constraints.
        
        Args:
            response_text: Raw LLM response
            
        Returns:
            tuple: (is_valid, cleaned_text)
        """
        if not response_text or len(response_text.strip()) == 0:
            return False, None
        
        cleaned = response_text.strip()
        
        # Check sentence count (allow up to 2 for flexibility)
        sentences = [s for s in cleaned.split('.') if s.strip()]
        if len(sentences) > 2:
            print(f"⚠️  LLM violated sentence limit: {len(sentences)} sentences")
            # Truncate to first 2 sentences
            cleaned = '. '.join(sentences[:2]) + '.'
        
        # Check for markdown (forbidden in voice)
        if any(char in cleaned for char in ['*', '#', '`', '[', ']']):
            print("⚠️  LLM used markdown (removing)")
            cleaned = cleaned.replace('*', '').replace('#', '').replace('`', '')
            cleaned = cleaned.replace('[', '').replace(']', '')
        
        # Check for meta-commentary
        forbidden_phrases = [
            "let me analyze",
            "as i mentioned",
            "let me think",
            "here's what i think",
            "in my opinion"
        ]
        if any(phrase in cleaned.lower() for phrase in forbidden_phrases):
            print("⚠️  LLM used forbidden meta-commentary")
            # Still allow it but log warning
        
        return True, cleaned


# --------------------------------------------------
# SINGLETON ACCESSOR
# --------------------------------------------------
_llm_router = None

def get_llm_router():
    """Get or create the global LLMRouter instance"""
    global _llm_router
    if _llm_router is None:
        _llm_router = LLMRouter()
    return _llm_router


# --------------------------------------------------
# INTEGRATION EXAMPLE
# --------------------------------------------------
def example_integration():
    """
    Example of how to integrate LLM Router with VoiceOrchestrator
    """
    from agents.voice_orchestrator import get_orchestrator
    from agents.voice_assistant import get_voice_assistant
    
    orchestrator = get_orchestrator()
    assistant = get_voice_assistant()
    router = get_llm_router()
    
    user_input = "What skills should I focus on for data analyst roles?"
    
    # Step 1: Check with orchestrator
    action = orchestrator.on_user_finished(user_input)
    if not action:
        print("Input ignored (duplicate/echo)")
        return
    
    # Step 2: Get decision from assistant
    decision = assistant.analyze_input(user_input)
    
    # Step 3: If router needed, build LLM request
    if router.should_route(decision):
        orchestrator.set_persona(decision["persona"], lock=False)
        
        request = router.build_request(
            user_input=user_input,
            persona=decision["persona"],
            context="User asked about career advice",
            cv_data="User: Data Science graduate"
        )
        
        print("📤 LLM Request:")
        print(request["prompt"])
        print("\n" + "="*60)
        
        # Step 4: Call LLM (pseudo-code)
        try:
            # ai_response = call_llm_api(request)
            ai_response = "Focus on Python and SQL - they appear in 60% of analyst roles in Cairo."
            
            # Step 5: Validate response
            is_valid, cleaned = router.validate_response(ai_response)
            
            if is_valid:
                # Step 6: Orchestrator permission to speak
                if orchestrator.before_ai_speaks(cleaned):
                    print(f"🗣️  AI: {cleaned}")
                    # generate_audio(cleaned)
                    # play_audio()
                    orchestrator.after_ai_speaks()
                else:
                    print("⏭️  Response blocked (duplicate)")
            else:
                print("❌ Invalid LLM response")
                
        except Exception as e:
            fallback = router.handle_error(e, user_input)
            if fallback:
                print(f"🔄 Fallback: {fallback}")
            else:
                print("🔇 Staying silent (error)")


if __name__ == "__main__":
    print("=" * 60)
    print("LLM Router - Integration Example")
    print("=" * 60)
    example_integration()
