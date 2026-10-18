# integration_example.py
"""
Example of how VoiceOrchestrator + VoiceAssistant + TourInsights work together
This shows the proper flow after refactoring
"""

from agents.voice_orchestrator import get_orchestrator
from agents.voice_assistant import get_voice_assistant
from agents.tour_insights import get_tour_script

# Initialize components
orchestrator = get_orchestrator()
assistant = get_voice_assistant()


def handle_user_speech(user_text: str):
    """
    Proper flow for handling user speech input
    """
    
    # STEP 1: Orchestrator checks if we should process this input
    action = orchestrator.on_user_finished(user_text)
    
    if action is None:
        print("⏭️  Input ignored (duplicate or echo)")
        return None
    
    # STEP 2: Assistant analyzes and returns decision
    decision = assistant.analyze_input(user_text)
    
    print(f"📊 Decision Type: {decision['type']}")
    print(f"🎭 Persona: {decision.get('persona', 'N/A')}")
    print(f"📈 Confidence: {decision.get('confidence', 0)}")
    
    # STEP 3: Execute based on decision type
    if decision["type"] == "SCENARIO":
        # Lock persona for interview/coaching
        orchestrator.set_persona(decision["persona"], lock=True)
        
        # Generate audio
        response_text = decision["text"]
        if orchestrator.before_ai_speaks(response_text):
            print(f"🗣️  AI: {response_text}")
            # generate_audio(response_text)
            # play_audio()
            orchestrator.after_ai_speaks()
        else:
            print("⏭️  Response blocked (duplicate)")
    
    elif decision["type"] == "DASHBOARD":
        # Dashboard command execution
        orchestrator.set_persona("assistant", lock=False)
        
        # Apply commands to dashboard
        commands = decision["commands"]
        print(f"🎛️  Applying commands: {commands}")
        # apply_dashboard_filters(commands)
        
        # Narrate the action
        narration = decision["text"]
        if orchestrator.before_ai_speaks(narration):
            print(f"🗣️  AI: {narration}")
            # generate_audio(narration)
            # play_audio()
            orchestrator.after_ai_speaks()
    
    elif decision["type"] == "ROUTER":
        # Fallback to LLM
        orchestrator.set_persona(decision["persona"], lock=False)
        print("🧠 Routing to LLM for complex query...")
        # llm_response = agent_manager.process(user_text, persona=decision["persona"])
        # if orchestrator.before_ai_speaks(llm_response):
        #     generate_audio(llm_response)
        #     play_audio()
        #     orchestrator.after_ai_speaks()
    
    elif decision["type"] == "NONE":
        print("⏭️  No action needed")
    
    return decision


def handle_tour_request():
    """
    Example of using static tour insights
    """
    print("\n🎬 Starting Tour...")
    
    # Activate tour mode
    orchestrator.start_tour()
    
    # Get pre-written tour script
    pages = ["overview", "city_map", "deep_analysis", "time_analysis", "skills"]
    
    for page in pages:
        print(f"\n📄 Page: {page}")
        
        # Get intro
        intro = get_tour_script(page, "page_intro")
        if orchestrator.before_ai_speaks(intro):
            print(f"🗣️  {intro}")
            # generate_audio(intro)
            # play_audio()
            orchestrator.after_ai_speaks()
        
        # Simulate navigation
        print(f"🔄 Navigating to /{page}")
        # navigate_to_page(f"/{page}")
        
        # Wait for page load (simulated)
        # time.sleep(0.5)
        
        # Get main content
        content_keys = ["top_section", "scroll_transition", "bottom_section", "page_complete"]
        for key in content_keys:
            content = get_tour_script(page, key)
            if content and orchestrator.before_ai_speaks(content):
                print(f"🗣️  {content}")
                # generate_audio(content)
                # play_audio()
                orchestrator.after_ai_speaks()
    
    # End tour
    orchestrator.stop_tour()
    print("\n✅ Tour completed!")


def handle_user_interruption():
    """
    Example of handling interruption
    """
    print("\n🛑 User interrupted!")
    
    # Stop AI immediately
    orchestrator.stop_ai()
    
    # Stop audio playback (client-side also pauses)
    # audio_player.stop()
    
    print("✅ AI stopped, ready for user input")


# --------------------------------------------------
# EXAMPLE USAGE
# --------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("EXAMPLE 1: Dashboard Command")
    print("=" * 60)
    handle_user_speech("Show me data analyst jobs in Cairo")
    
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Interview Scenario")
    print("=" * 60)
    handle_user_speech("I have 5 years of experience in Python development")
    
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Tour Request")
    print("=" * 60)
    handle_tour_request()
    
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Duplicate Input (should be ignored)")
    print("=" * 60)
    handle_user_speech("Show me data analyst jobs in Cairo")  # Same as EXAMPLE 1
    
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Interruption")
    print("=" * 60)
    orchestrator.ai_is_speaking = True  # Simulate AI speaking
    handle_user_interruption()
