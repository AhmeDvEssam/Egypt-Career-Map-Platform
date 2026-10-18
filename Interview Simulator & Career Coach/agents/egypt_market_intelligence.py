# egypt_market_intelligence.py
"""
Egypt Market Intelligence Module
Provides Egypt-specific job market insights including:
- Salary ranges by role and city
- Demand trends
- Skill premiums
- Location insights
- Voice-friendly narration
"""


class EgyptMarketIntel:
    """
    Egyptian job market intelligence for voice narration.
    All data based on typical market conditions (2024-2026).
    """
    
    def __init__(self):
        # Salary ranges in EGP (monthly)
        self.salary_ranges = {
            "Data Analyst": {
                "Cairo": {"entry": "8000-12000", "mid": "15000-25000", "senior": "30000-45000"},
                "Giza": {"entry": "7000-11000", "mid": "14000-23000", "senior": "28000-42000"},
                "Alexandria": {"entry": "6500-10000", "mid": "12000-20000", "senior": "25000-38000"}
            },
            "Software Engineer": {
                "Cairo": {"entry": "10000-15000", "mid": "20000-35000", "senior": "40000-60000"},
                "Giza": {"entry": "9000-14000", "mid": "18000-32000", "senior": "38000-55000"},
                "Alexandria": {"entry": "8000-12000", "mid": "15000-28000", "senior": "32000-48000"}
            },
            "Business Analyst": {
                "Cairo": {"entry": "7000-11000", "mid": "14000-24000", "senior": "28000-42000"},
                "Giza": {"entry": "6500-10000", "mid": "13000-22000", "senior": "26000-40000"},
                "Alexandria": {"entry": "6000-9000", "mid": "11000-19000", "senior": "22000-35000"}
            },
            "Accountant": {
                "Cairo": {"entry": "6000-10000", "mid": "12000-20000", "senior": "25000-38000"},
                "Giza": {"entry": "5500-9000", "mid": "11000-18000", "senior": "23000-35000"},
                "Alexandria": {"entry": "5000-8000", "mid": "9000-15000", "senior": "20000-30000"}
            }
        }
        
        # Demand indicators (hot/warm/cool)
        self.demand_status = {
            "Engineering": "hot",
            "IT/Software": "hot",
            "Finance": "warm",
            "Sales": "warm",
            "Customer Service": "warm",
            "HR": "cool",
            "Marketing": "cool"
        }
        
        # Skill premiums (% increase in salary)
        self.skill_premiums = {
            "Python": 25,
            "AWS": 30,
            "Machine Learning": 35,
            "SQL": 15,
            "Power BI": 20,
            "React": 25,
            "System Design": 30
        }
        
        # Location insights
        self.location_insights = {
            "Cairo": {
                "hiring_activity": "Extremely high - 48% of all openings",
                "top_sectors": ["Engineering", "Finance", "IT"],
                "avg_commute": "60-90 minutes",
                "remote_ratio": 12
            },
            "Giza": {
                "hiring_activity": "High - 17% of all openings",
                "top_sectors": ["IT", "Engineering", "Education"],
                "avg_commute": "45-75 minutes",
                "remote_ratio": 8
            },
            "Alexandria": {
                "hiring_activity": "Moderate - 12% of all openings",
                "top_sectors": ["Engineering", "Customer Service", "Sales"],
                "avg_commute": "30-60 minutes",
                "remote_ratio": 6
            }
        }
    
    # --------------------------------------------------
    # SALARY NARRATION
    # --------------------------------------------------
    def get_salary_insight(self, role, city="Cairo", level="mid"):
        """
        Get voice-friendly salary insight.
        
        Args:
            role: Job role (e.g., "Data Analyst")
            city: City name
            level: "entry" | "mid" | "senior"
            
        Returns:
            str: Narration sentence
        """
        if role not in self.salary_ranges:
            return f"Salary data for {role} is being updated."
        
        if city not in self.salary_ranges[role]:
            city = "Cairo"  # Fallback
        
        salary_range = self.salary_ranges[role][city].get(level, "8000-15000")
        
        return f"For {role} positions in {city}, {level}-level roles typically offer {salary_range} Egyptian pounds monthly."
    
    # --------------------------------------------------
    # DEMAND INSIGHTS
    # --------------------------------------------------
    def get_demand_insight(self, category):
        """
        Get demand status narration.
        
        Args:
            category: Job category
            
        Returns:
            str: Narration sentence
        """
        status = self.demand_status.get(category, "warm")
        
        status_text = {
            "hot": "experiencing very high demand with frequent new openings",
            "warm": "maintaining steady demand with regular opportunities",
            "cool": "showing moderate demand with selective hiring"
        }
        
        return f"The {category} sector is currently {status_text[status]}."
    
    # --------------------------------------------------
    # SKILL PREMIUM INSIGHTS
    # --------------------------------------------------
    def get_skill_premium_insight(self, skill):
        """
        Get skill premium narration.
        
        Args:
            skill: Skill name
            
        Returns:
            str: Narration sentence
        """
        premium = self.skill_premiums.get(skill, 0)
        
        if premium >= 25:
            return f"Adding {skill} to your skill set can increase your market value by up to {premium} percent."
        elif premium > 0:
            return f"{skill} is valued in the market and adds approximately {premium} percent to salary potential."
        else:
            return f"{skill} is a foundational skill in the Egyptian market."
    
    # --------------------------------------------------
    # LOCATION INSIGHTS
    # --------------------------------------------------
    def get_location_insight(self, city):
        """
        Get city-specific insight.
        
        Args:
            city: City name
            
        Returns:
            str: Narration sentence
        """
        if city not in self.location_insights:
            return f"{city} is an emerging job market in Egypt."
        
        data = self.location_insights[city]
        return f"{city} shows {data['hiring_activity']}, with {data['remote_ratio']} percent of positions offering remote options."
    
    # --------------------------------------------------
    # COMPREHENSIVE MARKET BRIEF
    # --------------------------------------------------
    def get_market_brief(self, role=None, city="Cairo", skills=None):
        """
        Generate comprehensive market brief.
        
        Args:
            role: Optional job role
            city: City name
            skills: Optional list of skills
            
        Returns:
            list: Multiple insight sentences
        """
        insights = []
        
        # Location context
        insights.append(self.get_location_insight(city))
        
        # Salary if role provided
        if role:
            insights.append(self.get_salary_insight(role, city, "mid"))
        
        # Skill premiums
        if skills:
            top_skill = skills[0] if skills else None
            if top_skill and top_skill in self.skill_premiums:
                insights.append(self.get_skill_premium_insight(top_skill))
        
        # General market condition
        insights.append("The Egyptian job market is showing gradual recovery with increasing opportunities in tech and finance sectors.")
        
        return insights
    
    # --------------------------------------------------
    # COMPARATIVE INSIGHTS
    # --------------------------------------------------
    def compare_cities(self, role, level="mid"):
        """
        Compare salary across major cities.
        
        Args:
            role: Job role
            level: Experience level
            
        Returns:
            str: Comparison sentence
        """
        if role not in self.salary_ranges:
            return "Salary comparison data is being updated."
        
        cairo_range = self.salary_ranges[role]["Cairo"].get(level, "N/A")
        alex_range = self.salary_ranges[role]["Alexandria"].get(level, "N/A")
        
        return f"For {role} roles, Cairo offers {cairo_range} EGP while Alexandria typically offers {alex_range} EGP monthly."
    
    # --------------------------------------------------
    # CAREER PROGRESSION INSIGHTS
    # --------------------------------------------------
    def get_progression_insight(self, role):
        """
        Get career progression narration.
        
        Args:
            role: Current role
            
        Returns:
            str: Progression insight
        """
        if role not in self.salary_ranges:
            return "Career progression data is being compiled."
        
        cairo_entry = self.salary_ranges[role]["Cairo"]["entry"]
        cairo_senior = self.salary_ranges[role]["Cairo"]["senior"]
        
        return f"Career progression in {role} can lead from {cairo_entry} EGP at entry level to {cairo_senior} EGP at senior level in Cairo."


# --------------------------------------------------
# SINGLETON ACCESSOR
# --------------------------------------------------
_egypt_intel = None

def get_egypt_intel():
    """Get or create the global EgyptMarketIntel instance"""
    global _egypt_intel
    if _egypt_intel is None:
        _egypt_intel = EgyptMarketIntel()
    return _egypt_intel


# --------------------------------------------------
# EXAMPLE USAGE
# --------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("Egypt Market Intelligence - Test")
    print("=" * 60)
    
    intel = get_egypt_intel()
    
    print("\n💰 SALARY INSIGHTS:")
    print(f"  {intel.get_salary_insight('Data Analyst', 'Cairo', 'mid')}")
    print(f"  {intel.get_salary_insight('Software Engineer', 'Alexandria', 'senior')}")
    
    print("\n📈 DEMAND INSIGHTS:")
    print(f"  {intel.get_demand_insight('IT/Software')}")
    print(f"  {intel.get_demand_insight('Finance')}")
    
    print("\n🎯 SKILL PREMIUM:")
    print(f"  {intel.get_skill_premium_insight('Python')}")
    print(f"  {intel.get_skill_premium_insight('AWS')}")
    
    print("\n🗺️  LOCATION INSIGHTS:")
    print(f"  {intel.get_location_insight('Cairo')}")
    print(f"  {intel.get_location_insight('Giza')}")
    
    print("\n📊 MARKET BRIEF:")
    brief = intel.get_market_brief(role="Data Analyst", city="Cairo", skills=["Python", "SQL"])
    for insight in brief:
        print(f"  • {insight}")
    
    print("\n🔄 CITY COMPARISON:")
    print(f"  {intel.compare_cities('Software Engineer', 'mid')}")
    
    print("\n📈 CAREER PROGRESSION:")
    print(f"  {intel.get_progression_insight('Data Analyst')}")
    
    print("\n" + "=" * 60)
    print("✅ Egypt Market Intelligence Test Complete")
    print("=" * 60)
