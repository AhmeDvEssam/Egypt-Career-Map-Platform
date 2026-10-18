# tour_insights.py
"""
Dynamic Tour Insights - Fetches real-time analysis from dynamic_insights.py
"""

from agents.dynamic_insights import (
    get_overview_insights,
    get_map_insights,
    get_deep_analysis_insights,
    get_time_analysis_insights,
    get_skills_insights
)

def get_tour_script(page: str, level: str = "detailed"):
    """
    Get dynamic tour narration for a specific page and detail level
    
    Args:
        page: 'overview', 'city_map', 'deep_analysis', 'time_analysis', 'skills'
        level: 'brief' or 'detailed'
    
    Returns:
        str: Dynamically generated narration text based on real data
    """
    try:
        if page == 'overview' or page == '/':
            return get_overview_insights(level)
        elif page == 'city_map':
            return get_map_insights(level)
        elif page == 'deep_analysis':
            return get_deep_analysis_insights(level)
        elif page == 'time_analysis':
            return get_time_analysis_insights(level)
        elif page == 'skills':
            return get_skills_insights(level)
        else:
            return f"I am now on the {page} page."
    except Exception as e:
        print(f"ERROR generating tour script: {e}")
        return "I am having trouble reading the live data at the moment."

def get_market_summary():
    """Get quick market overview (Forwarding for compatibility)"""
    # Simply return a static placeholder or implement dynamic summary if needed elsewhere
    return {}


# Quick summary stats (numbers from actual dataset analysis)
MARKET_SUMMARY = {
    "total_jobs": 7315,
    "top_categories": ["Engineering (1,800)", "Finance (1,200)", "IT (950)"],
    "top_cities": ["Cairo (3,500)", "Giza (1,200)", "Alexandria (900)"],
    "top_skills": ["Python", "Excel", "Communication", "SQL"],
    "work_modes": {"On-site": "65%", "Hybrid": "25%", "Remote": "10%"},
    "employment_types": {"Full-Time": "85%", "Part-Time/Contract": "15%"},
    "career_levels": {"Entry": "40%", "Mid": "35%", "Senior/Manager": "25%"}
}


def get_market_summary():
    """Get quick market overview"""
    return MARKET_SUMMARY
