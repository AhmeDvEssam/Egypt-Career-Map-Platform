# voice_orchestrator.py
"""
VoiceOrchestrator - Centralized Voice State Management
Handles turn-taking, echo prevention, interruptions, and persona locking
"""
import time
import hashlib
from enum import Enum

class VoiceState(Enum):
    IDLE = "idle"
    USER_SPEAKING = "user_speaking"
    AI_SPEAKING = "ai_speaking"


class VoiceOrchestrator:
    def __init__(self):
        # ===== CORE STATE =====
        self.state = VoiceState.IDLE
        self.active_persona = None          # interviewer | coach | assistant
        self.persona_locked = False

        # ===== TURN CONTROL =====
        self.last_user_utterance_id = None
        self.last_ai_response_id = None
        self.last_user_speech_time = 0
        self.silence_threshold = 2.5  # seconds (increased from 1.1s)

        # ===== SAFETY =====
        self.ai_is_speaking = False
        self.ignore_echo_until = 0
        
        # ===== TOUR MODE =====
        self.tour_active = False

    # --------------------------------------------------
    # UTILITIES
    # --------------------------------------------------
    def _hash_text(self, text: str):
        """Generate unique ID for text to detect duplicates"""
        return hashlib.md5(text.strip().lower().encode()).hexdigest()

    def _now(self):
        return time.time()

    # --------------------------------------------------
    # PERSONA MANAGEMENT
    # --------------------------------------------------
    def set_persona(self, persona: str, lock=True):
        """Set active persona with optional locking"""
        if self.persona_locked and self.active_persona != persona:
            print(f"DEBUG: Persona locked to {self.active_persona}, rejecting {persona}")
            return False

        self.active_persona = persona
        self.persona_locked = lock
        print(f"DEBUG: Persona set to {persona} (locked={lock})")
        return True

    def release_persona(self):
        """Unlock and clear persona"""
        self.active_persona = None
        self.persona_locked = False
        print("DEBUG: Persona released")

    # --------------------------------------------------
    # USER SPEECH HANDLING
    # --------------------------------------------------
    def on_user_speaking(self, partial=False):
        """Called when user starts speaking (partial or final)"""
        self.state = VoiceState.USER_SPEAKING
        self.last_user_speech_time = self._now()

        # 🔥 If user interrupts AI → signal immediate stop
        if self.ai_is_speaking:
            print("DEBUG: User interrupted AI - sending INTERRUPT_AI signal")
            return "INTERRUPT_AI"

        return "LISTENING"

    def on_user_finished(self, text: str):
        """
        Called ONLY after silence threshold is passed
        Returns action: None (ignore), "PROCESS_INPUT" (handle it)
        """
        if not text or len(text.strip()) == 0:
            return None
            
        utterance_id = self._hash_text(text)

        # 🛑 Deduplication - prevent processing same input twice
        if utterance_id == self.last_user_utterance_id:
            print(f"DEBUG: Duplicate user input detected: {text[:30]}...")
            return None

        # 🛑 Echo protection - ignore if within echo window
        if self._now() < self.ignore_echo_until:
            print(f"DEBUG: Input in echo window, ignoring: {text[:30]}...")
            return None

        self.last_user_utterance_id = utterance_id
        self.state = VoiceState.IDLE
        return "PROCESS_INPUT"

    def is_user_done(self):
        """
        Determines if user finished speaking or just paused
        Returns True if silence threshold exceeded
        """
        elapsed = self._now() - self.last_user_speech_time
        return elapsed >= self.silence_threshold

    # --------------------------------------------------
    # AI SPEECH HANDLING
    # --------------------------------------------------
    def before_ai_speaks(self, ai_text: str):
        """
        Called before AI response is played
        Returns True if AI should speak, False if duplicate
        """
        if not ai_text or len(ai_text.strip()) == 0:
            return False
            
        ai_response_id = self._hash_text(ai_text)

        # 🛑 Prevent AI repeating itself
        if ai_response_id == self.last_ai_response_id:
            print(f"DEBUG: AI trying to repeat same response: {ai_text[:30]}...")
            return False

        self.last_ai_response_id = ai_response_id
        self.ai_is_speaking = True
        self.state = VoiceState.AI_SPEAKING

        # 🛑 AGGRESSIVE BLOCK: Ignore STT until after_ai_speaks() + buffer
        # Set to far future temporarily
        self.ignore_echo_until = self._now() + 3600
        
        # ✅ RESET USER DEDUPLICATION on new turn
        # This allows user to say the same thing again (e.g. "Yes" -> AI -> "Yes")
        self.last_user_utterance_id = None
        
        print(f"DEBUG: AI started speaking. Echo blocked until release.")
        return True

    def after_ai_speaks(self):
        """Called when AI finishes speaking"""
        self.ai_is_speaking = False
        self.state = VoiceState.IDLE
        # 🛑 RELEASE BLOCK with 6.0s buffer for last echo (Maximum Safety)
        self.ignore_echo_until = self._now() + 6.0
        print(f"DEBUG: AI finished speaking. Echo window until {self.ignore_echo_until}")

    def stop_ai(self):
        """Force stop AI immediately (interruption)"""
        self.ai_is_speaking = False
        self.state = VoiceState.IDLE
        print("DEBUG: AI force stopped")

    def is_ai_speaking(self):
        """Check if AI is currently speaking"""
        return self.ai_is_speaking

    # --------------------------------------------------
    # TOUR MODE
    # --------------------------------------------------
    def start_tour(self):
        """Activate tour mode"""
        self.tour_active = True
        self.set_persona("assistant", lock=True)
        print("DEBUG: Tour mode activated")

    def stop_tour(self):
        """Deactivate tour mode"""
        self.tour_active = False
        print("DEBUG: Tour mode stopped")

    # --------------------------------------------------
    # STATUS
    # --------------------------------------------------
    def get_status(self):
        """Return current orchestrator status"""
        return {
            "state": self.state.value,
            "persona": self.active_persona,
            "persona_locked": self.persona_locked,
            "ai_speaking": self.ai_is_speaking,
            "tour_active": self.tour_active
        }


# Global singleton instance
_orchestrator = None

def get_orchestrator():
    """Get or create the global VoiceOrchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = VoiceOrchestrator()
    return _orchestrator
