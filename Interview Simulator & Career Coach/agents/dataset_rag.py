"""
Dataset RAG Module - Query Local Excel Files for Job and Skills Data

This module loads the user's dataset files (Jobs.xlsx, Skills_Cleaned_UnPivot.xlsx)
and provides intelligent querying capabilities to inject relevant data into AI context.
"""

import pandas as pd
import os
import re

class DatasetRAG:
    def __init__(self):
        # Define dataset paths
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Check for files in root OR data subdirectory
        # Jobs Data
        root_jobs = os.path.join(base_path, "Jobs.xlsx")
        data_jobs = os.path.join(base_path, "data", "Jobs.xlsx")
        self.jobs_path = root_jobs if os.path.exists(root_jobs) else data_jobs
        
        # Skills Data
        root_skills = os.path.join(base_path, "Skills_Cleaned_UnPivot.xlsx")
        data_skills = os.path.join(base_path, "data", "Skills_Cleaned_UnPivot.xlsx")
        self.skills_path = root_skills if os.path.exists(root_skills) else data_skills
        
        self.jobs_df = None
        self.skills_df = None
        self._load_data()
    
    def _load_data(self):
        """Load Excel files into pandas DataFrames with error handling"""
        try:
            if os.path.exists(self.jobs_path):
                self.jobs_df = pd.read_excel(self.jobs_path)
                print(f"✅ Loaded {len(self.jobs_df)} jobs from dataset")
            else:
                print(f"⚠️ Jobs file not found: {self.jobs_path}")
        except Exception as e:
            print(f"⚠️ Error loading Jobs.xlsx: {e}")
        
        try:
            if os.path.exists(self.skills_path):
                self.skills_df = pd.read_excel(self.skills_path)
                print(f"✅ Loaded {len(self.skills_df)} skills from dataset")
            else:
                print(f"⚠️ Skills file not found: {self.skills_path}")
        except Exception as e:
            print(f"⚠️ Error loading Skills file: {e}")
    
    def query_jobs(self, city=None, category=None, company=None, work_mode=None, limit=10):
        """
        Filter jobs based on criteria
        
        Args:
            city: City name (e.g., 'Cairo', 'Alexandria')
            category: Job category (e.g., 'Engineering', 'IT')
            company: Company name
            work_mode: Work mode (e.g., 'Remote', 'On-site', 'Hybrid')
            limit: Maximum number of results
            
        Returns:
            List of matching jobs as dictionaries
        """
        if self.jobs_df is None:
            return []
        
        df = self.jobs_df.copy()
        
        # Apply filters (case-insensitive)
        if city:
            df = df[df['City'].str.contains(city, case=False, na=False)]
        if category:
            df = df[df['Category'].str.contains(category, case=False, na=False)]
        if company:
            df = df[df['Company'].str.contains(company, case=False, na=False)]
        if work_mode:
            if 'Work_Mode' in df.columns:
                df = df[df['Work_Mode'].str.contains(work_mode, case=False, na=False)]
        
        # Return limited results
        return df.head(limit).to_dict('records')
    
    def query_skills(self, job_title=None, category=None, limit=10):
        """
        Get top skills for a job title or category
        
        Args:
            job_title: Job title to match (e.g., 'Data Analyst', 'Software Engineer')
            category: Job category
            limit: Maximum number of results
            
        Returns:
            List of skills as strings
        """
        if self.skills_df is None:
            return []
        
        df = self.skills_df.copy()
        
        # Filter by job title or category
        if job_title:
            # Assuming column name is 'Job_Title' or similar
            title_column = next((col for col in df.columns if 'title' in col.lower()), None)
            if title_column:
                df = df[df[title_column].str.contains(job_title, case=False, na=False)]
        
        if category:
            cat_column = next((col for col in df.columns if 'category' in col.lower()), None)
            if cat_column:
                df = df[df[cat_column].str.contains(category, case=False, na=False)]
        
        # Extract skills column
        skill_column = next((col for col in df.columns if 'skill' in col.lower()), None)
        if skill_column:
            skills = df[skill_column].dropna().unique().tolist()
            return skills[:limit]
        
        return []
    
    def get_dataset_context(self, user_query):
        """
        Parse user query and return relevant data from dataset.
        This is the main method called by the AI agent manager.
        
        Args:
            user_query: User's question/message
            
        Returns:
            Formatted string with relevant dataset context
        """
        context = ""
        
        # Extract city names (common Egyptian cities)
        cities = ['Cairo', 'Alexandria', 'Giza', 'Maadi', 'Nasr City', 'Heliopolis', 
                  'Zamalek', 'New Cairo', '6th October', 'Mansoura', 'Aswan', 'Luxor']
        detected_city = next((city for city in cities if city.lower() in user_query.lower()), None)
        
        # Extract job categories (common keywords)
        categories_keywords = {
            'software': 'Software Development',
            'data': 'Data Science',
            'engineer': 'Engineering',
            'sales': 'Sales',
            'marketing': 'Marketing',
            'finance': 'Finance',
            'account': 'Accounting',
            'hr': 'Human Resources'
        }
        detected_category = next((v for k, v in categories_keywords.items() if k in user_query.lower()), None)
        
        # Query jobs if location or category detected
        if detected_city or detected_category:
            jobs = self.query_jobs(city=detected_city, category=detected_category, limit=5)
            if jobs:
                context += "\n--- RELEVANT JOBS FROM YOUR DATASET ---\n"
                for i, job in enumerate(jobs, 1):
                    title = job.get('Job Title', job.get('Title', 'Unknown'))
                    company = job.get('Company', 'Unknown')
                    city = job.get('City', 'Unknown')
                    work_mode = job.get('Work Mode', job.get('Work_Mode', 'Not Specified'))
                    skills = str(job.get('Skills', ''))[:100] + "..." if job.get('Skills') else "Not listed"
                    link = job.get('Link', '')
                    
                    context += f"{i}. JOB: {title} | COMPANY: {company} | LOC: {city} | MODE: {work_mode} | SKILLS: {skills}"
                    if link:
                        # Pre-format as markdown for the AI to copy-paste easily
                        context += f" | LINK_MD: [Apply for {title} at {company}]({link})"
                    context += "\n"
        
        # Query skills if asking about requirements/skills
        if any(word in user_query.lower() for word in ['skill', 'require', 'need', 'quali']):
            # Try to extract job title from query
            job_keywords = ['software engineer', 'data analyst', 'developer', 'manager', 'designer']
            detected_job = next((job for job in job_keywords if job in user_query.lower()), None)
            
            if detected_job:
                skills = self.query_skills(job_title=detected_job, limit=8)
                if skills:
                    context += f"\n--- TOP SKILLS FOR '{detected_job.upper()}' (FROM YOUR DATASET) ---\n"
                    for skill in skills:
                        context += f"• {skill}\n"
        
        # If no specific data found, add general dataset stats
        if not context and self.jobs_df is not None:
            total_jobs = len(self.jobs_df)
            context += f"\n--- YOUR DATASET STATS ---\n"
            context += f"Total Jobs Available: {total_jobs}\n"
            if 'City' in self.jobs_df.columns:
                top_cities = self.jobs_df['City'].value_counts().head(3)
                context += f"Top Cities: {', '.join(top_cities.index.tolist())}\n"
        
        return context.strip()

# Singleton instance (loaded once for performance)
_dataset_rag_instance = None

def get_dataset_rag():
    """Get or create singleton DatasetRAG instance"""
    global _dataset_rag_instance
    if _dataset_rag_instance is None:
        _dataset_rag_instance = DatasetRAG()
    return _dataset_rag_instance
