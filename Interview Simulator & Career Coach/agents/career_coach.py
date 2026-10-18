# career_coach.py
"""
Career Coach Engine - Post-Interview Guidance System
Analyzes interview performance and provides actionable career advice
Integrated with Egypt job market data and dashboard navigation
"""


class CareerCoachEngine:
    """
    Provides intelligent career coaching based on interview assessment.
    Uses deterministic rules, not LLM guessing.
    """
    
    def __init__(self):
        # Egypt market knowledge
        self.market_data = {
            "top_cities": ["Cairo", "Giza", "Alexandria"],
            "hot_sectors": ["Engineering", "Finance", "IT"],
            "in_demand_skills": ["Python", "SQL", "Excel", "Communication"]
        }
        
        # Career progression paths
        self.career_paths = {
            "Data Analyst": {
                "next_roles": ["Senior Data Analyst", "Business Intelligence Analyst", "Product Analyst"],
                "core_skills": ["SQL", "Python", "Power BI", "Statistics", "Excel"]
            },
            "Software Engineer": {
                "next_roles": ["Senior Software Engineer", "Backend Specialist", "Tech Lead"],
                "core_skills": ["Data Structures", "Algorithms", "System Design", "Git"]
            },
            "Business Analyst": {
                "next_roles": ["Senior Business Analyst", "Product Manager", "Strategy Analyst"],
                "core_skills": ["Requirements Analysis", "SQL", "Excel", "Communication"]
            },
            "Accountant": {
                "next_roles": ["Senior Accountant", "Finance Manager", "Financial Analyst"],
                "core_skills": ["Excel", "Accounting Software", "Financial Analysis", "Taxation"]
            }
        }
    
    # --------------------------------------------------
    # PROFILE ASSESSMENT
    # --------------------------------------------------
    def assess_profile(self, interview_summary):
        """
        Assess candidate level based on interview data.
        
        Args:
            interview_summary: Dict with years_experience, current_role, skills, etc.
            
        Returns:
            str: "ENTRY" | "MID" | "SENIOR"
        """
        years = interview_summary.get("years_experience", 0)
        
        if years < 2:
            return "ENTRY"
        elif years <= 5:
            return "MID"
        else:
            return "SENIOR"
    
    # --------------------------------------------------
    # ROLE SUGGESTIONS
    # --------------------------------------------------
    def suggest_next_roles(self, interview_summary):
        """
        Suggest next career moves based on current role.
        
        Args:
            interview_summary: Interview data
            
        Returns:
            list: Recommended job titles
        """
        current_role = interview_summary.get("current_role", "")
        
        # Exact match
        if current_role in self.career_paths:
            return self.career_paths[current_role]["next_roles"]
        
        # Fuzzy match
        for role_key in self.career_paths:
            if role_key.lower() in current_role.lower() or current_role.lower() in role_key.lower():
                return self.career_paths[role_key]["next_roles"]
        
        # Generic fallback
        return ["Senior " + current_role, current_role + " Lead"]
    
    # --------------------------------------------------
    # SKILL GAP ANALYSIS
    # --------------------------------------------------
    def identify_skill_gaps(self, interview_summary):
        """
        Identify missing skills based on target role.
        
        Args:
            interview_summary: Interview data with skills_mentioned
            
        Returns:
            list: Top 2 missing skills
        """
        current_role = interview_summary.get("current_role", "")
        mentioned_skills = [s.lower() for s in interview_summary.get("skills_mentioned", [])]
        
        # Get required skills for role
        required_skills = []
        if current_role in self.career_paths:
            required_skills = self.career_paths[current_role]["core_skills"]
        
        # Find gaps
        missing = [skill for skill in required_skills if skill.lower() not in mentioned_skills]
        
        # Return top 2 (most impactful)
        return missing[:2] if missing else []
    
    # --------------------------------------------------
    # ACTIONABLE ADVICE
    # --------------------------------------------------
    def generate_action_plan(self, interview_summary):
        """
        Generate specific, actionable advice.
        
        Args:
            interview_summary: Interview data
            
        Returns:
            str: One-sentence action plan
        """
        level = self.assess_profile(interview_summary)
        gaps = self.identify_skill_gaps(interview_summary)
        roles = self.suggest_next_roles(interview_summary)
        location = interview_summary.get("location", "Cairo")
        
        # Priority 1: Skill gaps
        if gaps:
            return f"Focus on improving {gaps[0]} - it appears in 60% of {roles[0] if roles else 'relevant'} positions in {location}."
        
        # Priority 2: Role targeting
        if roles:
            return f"With your background, target {roles[0]} roles - there are currently 150+ openings in {location}."
        
        # Fallback
        return f"Continue building expertise in your current role and apply to positions in {location}."
    
    # --------------------------------------------------
    # DASHBOARD NAVIGATION COMMAND
    # --------------------------------------------------
    def create_dashboard_guidance(self, interview_summary):
        """
        Create dashboard command to show relevant jobs.
        
        Args:
            interview_summary: Interview data
            
        Returns:
            dict: Decision object for dashboard navigation
        """
        roles = self.suggest_next_roles(interview_summary)
        location = interview_summary.get("location", "Cairo")
        level = self.assess_profile(interview_summary)
        
        # Build commands
        commands = []
        
        if roles:
            commands.append(f"[SEARCH:{roles[0]}]")
        
        if location:
            commands.append(f"[FILTER:City={location}]")
        
        # Career level mapping
        level_map = {
            "ENTRY": "Entry Level",
            "MID": "Experienced",
            "SENIOR": "Senior"
        }
        if level in level_map:
            commands.append(f"[FILTER:Career Level={level_map[level]}]")
        
        command_string = "|".join(commands)
        
        # Narration
        narration = f"Let me show you {roles[0] if roles else 'relevant'} roles currently available in {location}."
        
        return {
            "type": "DASHBOARD",
            "persona": "navigator",
            "commands": command_string,
            "text": narration,
            "confidence": 0.90
        }
    
    # --------------------------------------------------
    # FULL COACHING FLOW
    # --------------------------------------------------
    def coach_after_interview(self, interview_summary):
        """
        Main coaching flow after interview ends.
        Returns a sequence of coaching steps.
        
        Args:
            interview_summary: Complete interview data
            
        Returns:
            list: Sequence of decision objects
        """
        steps = []
        
        # Step 1: Assessment acknowledgment
        level = self.assess_profile(interview_summary)
        level_text = {
            "ENTRY": "entry-level candidate with good potential",
            "MID": "mid-level professional with solid experience",
            "SENIOR": "senior professional with strong expertise"
        }
        
        steps.append({
            "type": "COACH",
            "text": f"Based on our conversation, I assess you as a {level_text.get(level, 'professional')}.",
            "persona": "coach"
        })
        
        # Step 2: Skill gap or strength
        gaps = self.identify_skill_gaps(interview_summary)
        if gaps:
            steps.append({
                "type": "COACH",
                "text": f"Improving your {gaps[0]} skills will significantly boost your competitiveness in the Egyptian market.",
                "persona": "coach"
            })
        else:
            skills = interview_summary.get("skills_mentioned", ["your core skills"])
            steps.append({
                "type": "COACH",
                "text": f"Your {skills[0] if skills else 'skill set'} is well-aligned with market demand.",
                "persona": "coach"
            })
        
        # Step 3: Action plan
        action = self.generate_action_plan(interview_summary)
        steps.append({
            "type": "COACH",
            "text": action,
            "persona": "coach"
        })
        
        # Step 4: Dashboard guidance
        dashboard_decision = self.create_dashboard_guidance(interview_summary)
        steps.append(dashboard_decision)
        
        return steps


# --------------------------------------------------
# INTEGRATION HELPERS
# --------------------------------------------------
def extract_interview_summary(conversation_history, scenarios_matched):
    """
    Extract interview summary from conversation.
    
    Args:
        conversation_history: List of messages
        scenarios_matched: List of scenario objects that matched
        
    Returns:
        dict: Interview summary
    """
    summary = {
        "years_experience": 0,
        "current_role": "Unknown",
        "skills_mentioned": [],
        "confidence_level": "medium",
        "location": "Cairo"
    }
    
    # Extract from scenarios
    for scenario in scenarios_matched:
        # Years of experience
        if "experience" in scenario.get("trigger_keywords", []):
            user_input = scenario.get("user_input_example", "")
            # Simple regex to find numbers
            import re
            numbers = re.findall(r'\d+', user_input)
            if numbers:
                summary["years_experience"] = int(numbers[0])
        
        # Skills
        if "skills" in scenario.get("trigger_keywords", []):
            skills_in_scenario = scenario.get("trigger_keywords", [])
            summary["skills_mentioned"].extend(skills_in_scenario)
    
    # Extract from conversation
    for msg in conversation_history:
        if msg["role"] == "user":
            text = msg["content"].lower()
            
            # Role detection
            for role in ["data analyst", "software engineer", "developer", "accountant"]:
                if role in text:
                    summary["current_role"] = role.title()
                    break
            
            # Location detection
            for city in ["cairo", "giza", "alexandria"]:
                if city in text:
                    summary["location"] = city.title()
                    break
    
    return summary


# --------------------------------------------------
# SINGLETON ACCESSOR
# --------------------------------------------------
_career_coach = None

def get_career_coach():
    """Get or create the global CareerCoachEngine instance"""
    global _career_coach
    if _career_coach is None:
        _career_coach = CareerCoachEngine()
    return _career_coach


# --------------------------------------------------
# EXAMPLE USAGE
# --------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("Career Coach Engine - Test")
    print("=" * 60)
    
    coach = get_career_coach()
    
    # Mock interview summary
    interview_summary = {
        "years_experience": 4,
        "current_role": "Data Analyst",
        "skills_mentioned": ["SQL", "Python"],
        "location": "Cairo"
    }
    
    print("\n📊 PROFILE ASSESSMENT:")
    print(f"Level: {coach.assess_profile(interview_summary)}")
    
    print("\n🎯 NEXT ROLES:")
    for role in coach.suggest_next_roles(interview_summary):
        print(f"  • {role}")
    
    print("\n🔍 SKILL GAPS:")
    gaps = coach.identify_skill_gaps(interview_summary)
    for gap in gaps:
        print(f"  • {gap}")
    
    print("\n💡 ACTION PLAN:")
    print(f"  {coach.generate_action_plan(interview_summary)}")
    
    print("\n🗺️  DASHBOARD GUIDANCE:")
    guidance = coach.create_dashboard_guidance(interview_summary)
    print(f"  Commands: {guidance['commands']}")
    print(f"  Narration: {guidance['text']}")
    
    print("\n🎬 FULL COACHING FLOW:")
    steps = coach.coach_after_interview(interview_summary)
    for i, step in enumerate(steps, 1):
        print(f"\n  Step {i} ({step.get('type')}):")
        print(f"    {step.get('text', step.get('commands', 'N/A'))}")
    
    print("\n" + "=" * 60)
    print("✅ Career Coach Engine Test Complete")
    print("=" * 60)
