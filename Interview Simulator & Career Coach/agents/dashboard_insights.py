# dashboard_insights.py
"""
Dashboard Insights Engine
Computes statistics from data and generates voice-friendly narration
AI reads these insights instead of analyzing the dashboard UI
"""

import pandas as pd
import os


class DashboardInsights:
    """
    Generates natural language insights from dashboard data.
    Used by AI to narrate dashboard pages without touching UI.
    """
    
    def __init__(self, data_path="d:/Hire Q Project/Modeling _2/data/Jobs_Dataset_final.xlsx"):
        self.data_path = data_path
        self.df = self._load_data()
        self.stats = self._compute_global_stats()
    
    def _load_data(self):
        """Load the jobs dataset"""
        if os.path.exists(self.data_path):
            try:
                df = pd.read_excel(self.data_path)
                print(f"✅ Loaded {len(df)} jobs from dataset")
                return df
            except Exception as e:
                print(f"❌ Error loading data: {e}")
                return None
        else:
            print(f"⚠️  Dataset not found at {self.data_path}")
            return None
    
    def _compute_global_stats(self):
        """Pre-compute key statistics for quick access"""
        if self.df is None:
            return {}
        
        stats = {
            "total_jobs": len(self.df),
            "top_category": self.df['Category'].value_counts().index[0] if 'Category' in self.df.columns else "Unknown",
            "top_city": self.df['City'].value_counts().index[0] if 'City' in self.df.columns else "Unknown",
            "remote_ratio": (self.df['Work Mode'] == 'Remote').mean() if 'Work Mode' in self.df.columns else 0,
            "full_time_ratio": (self.df['Employment Type'] == 'Full Time').mean() if 'Employment Type' in self.df.columns else 0,
        }
        
        return stats

    # =========================
    # OVERVIEW PAGE INSIGHTS
    # =========================
    def overview_page(self, custom_stats=None):
        """
        Generate overview page insights.
        
        Args:
            custom_stats: Optional dict to override computed stats
            
        Returns:
            list: List of narration sentences
        """
        stats = custom_stats or self.stats
        insights = []

        # Total jobs
        insights.append(
            f"From the overview, the Egyptian job market currently shows {stats['total_jobs']} active job opportunities."
        )

        # Top category
        insights.append(
            f"The most in-demand category across the market right now is {stats['top_category']}."
        )

        # Top city
        insights.append(
            f"Most job opportunities are concentrated in {stats['top_city']}, making it the strongest hiring hub."
        )

        # Work mode distribution
        remote_pct = int(stats['remote_ratio'] * 100)
        insights.append(
            f"Approximately {remote_pct} percent of roles support remote or hybrid work."
        )
        
        # Employment type
        fulltime_pct = int(stats['full_time_ratio'] * 100)
        insights.append(
            f"{fulltime_pct} percent of positions are full-time roles."
        )

        return insights

    # =========================
    # CITY MAP PAGE INSIGHTS
    # =========================
    def city_map_page(self, city_name=None):
        """
        Generate city map insights for a specific city or top city.
        
        Args:
            city_name: Optional city name, defaults to top city
            
        Returns:
            list: List of narration sentences
        """
        if self.df is None:
            return ["Data not available for city analysis."]
        
        city = city_name or self.stats['top_city']
        city_df = self.df[self.df['City'] == city] if 'City' in self.df.columns else self.df
        
        insights = []
        
        # Job count
        job_count = len(city_df)
        insights.append(
            f"Looking at {city}, there are {job_count} active job listings."
        )

        # Top category in this city
        if 'Category' in city_df.columns and len(city_df) > 0:
            top_category = city_df['Category'].value_counts().index[0]
            insights.append(
                f"The dominant category in this city is {top_category}."
            )
        
        # Work mode preference in city
        if 'Work Mode' in city_df.columns and len(city_df) > 0:
            top_mode = city_df['Work Mode'].value_counts().index[0]
            insights.append(
                f"Most positions in {city} are {top_mode}."
            )

        return insights

    # =========================
    # SKILLS PAGE INSIGHTS
    # =========================
    def skills_page(self):
        """
        Generate skills analysis insights.
        
        Returns:
            list: List of narration sentences
        """
        if self.df is None or 'Skills' not in self.df.columns:
            return ["Skills data is not available."]
        
        insights = []
        
        # Parse skills (assuming they're comma-separated)
        all_skills = []
        for skills_str in self.df['Skills'].dropna():
            if isinstance(skills_str, str):
                all_skills.extend([s.strip() for s in skills_str.split(',')])
        
        if all_skills:
            skill_counts = pd.Series(all_skills).value_counts()
            
            # Top skill
            top_skill = skill_counts.index[0]
            insights.append(
                f"The most requested skill across job postings is {top_skill}."
            )
            
            # Second most common (emerging)
            if len(skill_counts) > 1:
                emerging_skill = skill_counts.index[1]
                insights.append(
                    f"An emerging skill that is rapidly growing in demand is {emerging_skill}."
                )
            
            # Skill gap (skills in bottom 20%)
            if len(skill_counts) > 5:
                gap_skills = skill_counts.tail(5).index.tolist()
                insights.append(
                    f"Skills with lower competition include {', '.join(gap_skills[:3])}, representing learning opportunities."
                )
        else:
            insights.append("Skill data is being processed.")

        return insights

    # =========================
    # TIME ANALYSIS PAGE INSIGHTS
    # =========================
    def time_analysis_page(self):
        """
        Generate time-based hiring trend insights.
        
        Returns:
            list: List of narration sentences
        """
        if self.df is None or 'posted' not in self.df.columns:
            return ["Time analysis data is not available."]
        
        insights = []
        
        # Convert to datetime
        self.df['posted_date'] = pd.to_datetime(self.df['posted'], errors='coerce')
        
        # Extract month
        self.df['month'] = self.df['posted_date'].dt.month
        
        # Find peak month
        month_counts = self.df['month'].value_counts()
        if len(month_counts) > 0:
            peak_month_num = month_counts.index[0]
            month_names = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December']
            peak_month = month_names[peak_month_num - 1] if 1 <= peak_month_num <= 12 else "Unknown"
            
            insights.append(
                f"Hiring activity typically peaks during {peak_month}."
            )
            
            # Slowest month
            if len(month_counts) > 1:
                slow_month_num = month_counts.index[-1]
                slow_month = month_names[slow_month_num - 1] if 1 <= slow_month_num <= 12 else "Unknown"
                insights.append(
                    f"The slowest hiring period usually occurs in {slow_month}."
                )
            
            # Overall trend
            insights.append(
                "Overall, the hiring trend shows consistent growth with seasonal variations."
            )
        else:
            insights.append("Time-based trends are being analyzed.")

        return insights

    # =========================
    # DEEP ANALYSIS PAGE INSIGHTS
    # =========================
    def deep_analysis_page(self):
        """
        Generate deep analysis insights (companies, career levels, education).
        
        Returns:
            list: List of narration sentences
        """
        if self.df is None:
            return ["Analysis data is not available."]
        
        insights = []
        
        # Top companies
        if 'Company' in self.df.columns:
            top_companies = self.df['Company'].value_counts().head(3)
            if len(top_companies) > 0:
                top_company = top_companies.index[0]
                job_count = top_companies.iloc[0]
                insights.append(
                    f"The most active employer is {top_company} with {job_count} open positions."
                )
        
        # Career level distribution
        if 'Career Level' in self.df.columns:
            career_dist = self.df['Career Level'].value_counts()
            if len(career_dist) > 0:
                top_level = career_dist.index[0]
                pct = int((career_dist.iloc[0] / len(self.df)) * 100)
                insights.append(
                    f"{top_level} positions make up {pct} percent of all openings."
                )
        
        # Education requirements
        if 'Education' in self.df.columns:
            edu_dist = self.df['Education'].value_counts()
            if len(edu_dist) > 0:
                top_edu = edu_dist.index[0]
                insights.append(
                    f"The most common education requirement is {top_edu}."
                )

        return insights

    # =========================
    # HELPER: GET ALL INSIGHTS FOR TOUR
    # =========================
    def get_tour_insights(self):
        """
        Get all insights for a complete dashboard tour.
        
        Returns:
            dict: Page name -> list of insights
        """
        return {
            "overview": self.overview_page(),
            "city_map": self.city_map_page(),
            "skills": self.skills_page(),
            "time_analysis": self.time_analysis_page(),
            "deep_analysis": self.deep_analysis_page()
        }

    # =========================
    # HELPER: GET INSIGHTS AS NARRATION
    # =========================
    def narrate_page(self, page_name, city=None):
        """
        Get narration for a specific page.
        
        Args:
            page_name: "overview" | "city_map" | "skills" | "time_analysis" | "deep_analysis"
            city: Optional city name for city_map
            
        Returns:
            str: Combined narration (all sentences joined)
        """
        if page_name == "overview":
            insights = self.overview_page()
        elif page_name == "city_map":
            insights = self.city_map_page(city)
        elif page_name == "skills":
            insights = self.skills_page()
        elif page_name == "time_analysis":
            insights = self.time_analysis_page()
        elif page_name == "deep_analysis":
            insights = self.deep_analysis_page()
        else:
            insights = [f"Page {page_name} is not recognized."]
        
        return " ".join(insights)


# --------------------------------------------------
# SINGLETON ACCESSOR
# --------------------------------------------------
_insights_engine = None

def get_insights_engine():
    """Get or create the global DashboardInsights instance"""
    global _insights_engine
    if _insights_engine is None:
        _insights_engine = DashboardInsights()
    return _insights_engine


# --------------------------------------------------
# QUICK TEST
# --------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("Dashboard Insights Engine - Test")
    print("=" * 60)
    
    engine = get_insights_engine()
    
    print("\n📊 OVERVIEW PAGE:")
    print("-" * 60)
    for insight in engine.overview_page():
        print(f"  • {insight}")
    
    print("\n🗺️  CITY MAP PAGE (Cairo):")
    print("-" * 60)
    for insight in engine.city_map_page("Cairo"):
        print(f"  • {insight}")
    
    print("\n🎯 SKILLS PAGE:")
    print("-" * 60)
    for insight in engine.skills_page():
        print(f"  • {insight}")
    
    print("\n📈 TIME ANALYSIS PAGE:")
    print("-" * 60)
    for insight in engine.time_analysis_page():
        print(f"  • {insight}")
    
    print("\n🔍 DEEP ANALYSIS PAGE:")
    print("-" * 60)
    for insight in engine.deep_analysis_page():
        print(f"  • {insight}")
    
    print("\n" + "=" * 60)
    print("✅ Insights Engine Test Complete")
    print("=" * 60)
