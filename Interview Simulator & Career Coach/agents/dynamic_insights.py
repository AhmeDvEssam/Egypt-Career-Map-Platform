import pandas as pd
import numpy as np
from data_loader import df, skills_df

def get_overview_insights(level='detailed'):
    """
    Generate insights for the Overview page (Categories, Work Mode, Employment Type).
    
    Args:
        level (str): 'brief' or 'detailed'
    """
    if df.empty:
        return "I am unable to see the live data right now, but generally, this dashboard covers Job Categories and Work Modes."

    # 1. Top Categories
    top_cats = df['Category'].value_counts().head(3)
    cat_text = ", ".join([f"{idx} ({val} jobs)" for idx, val in top_cats.items()])
    
    # 2. Work Mode
    mode_counts = df['Work Mode'].value_counts(normalize=True) * 100
    # Safe checks
    onsite = mode_counts.get('On-site', 0)
    hybrid = mode_counts.get('Hybrid', 0)
    remote = mode_counts.get('Remote', 0)
    
    # 3. Employment Type
    emp_type = df['Employment Type'].value_counts(normalize=True).head(1)
    top_emp = emp_type.index[0] if not emp_type.empty else "Full Time"
    top_emp_pct = emp_type.values[0] * 100 if not emp_type.empty else 0
    
    if level == 'brief':
        return f"This is the Market Overview. The top category is {top_cats.index[0] if not top_cats.empty else 'Unknown'}, and {onsite:.1f}% of jobs are On-site."
        
    # Detailed
    return (
        f"This is the Market Overview page. Let's look at the key insights from the live data. "
        f"First, the **Category Breakdown** shows that the top sectors are {cat_text}. "
        f"Next, the **Work Mode** chart reveals that {onsite:.1f}% of jobs are On-site, "
        f"while {hybrid:.1f}% are Hybrid and {remote:.1f}% are Remote. "
        f"Finally, **Employment Types** are dominated by {top_emp} roles at {top_emp_pct:.1f}%. "
        f"This confirms the market's preference for {top_emp} and {'On-site' if onsite > 50 else 'Remote'} arrangements."
    )

def get_map_insights(level='detailed'):
    """Generate insights for City Map (Top Cities, Cairo concentration)."""
    if df.empty:
        return "This is the City Map page, visualizing job locations across Egypt."
        
    city_counts = df['City'].value_counts().head(3)
    if city_counts.empty:
        return "I see no clear city data."
        
    top_city = city_counts.index[0]
    top_val = city_counts.values[0]
    total_jobs = len(df)
    top_pct = (top_val / total_jobs) * 100
    
    # Cairo Region check (Cairo + Giza + New Cairo + etc)
    cairo_region = ['Cairo', 'Giza', 'New Cairo', 'Nasr City', 'Maadi', '6th of October', 'Sheikh Zayed']
    cairo_sum = df[df['City'].isin(cairo_region)].shape[0]
    cairo_region_pct = (cairo_sum / total_jobs) * 100
    
    if level == 'brief':
        return f"This is the City Map page. {top_city} is the top hub with {top_pct:.1f}% of all openings."
        
    other_cities_text = ", ".join([f"{city} with {count}" for city, count in city_counts.iloc[1:].items()])
    
    return (
        f"This is the City Map page, showing where jobs are concentrated. "
        f"The **Map Visual** clearly highlights {top_city} as the top hub with {top_val} openings ({top_pct:.1f}% of the market). "
        f"Followed by {other_cities_text}. "
        f"The **Detailed Table** confirms that the Greater Cairo region accounts for nearly {cairo_region_pct:.1f}% of all opportunities."
    )

def get_deep_analysis_insights(level='detailed'):
    """Generate insights for Deep Analysis (Companies, Career Level, Education)."""
    if df.empty:
        return "This is Deep Analysis, breaking down jobs by Company and Career Level."
        
    # Top Companies
    # Filter out 'Confidential' if possible or mention it
    companies = df['Company'].value_counts()
    real_companies = companies[companies.index != 'Confidential']
    if real_companies.empty:
        top_co = "Confidential"
        top_co_val = companies.get('Confidential', 0)
    else:
        top_co = real_companies.index[0]
        top_co_val = real_companies.values[0]
        
    # Career Level
    levels = df['Career Level'].value_counts(normalize=True) * 100
    match_entry = levels.filter(like='Entry').sum()
    match_senior = levels.filter(like='Senior').sum() + levels.filter(like='Manager').sum()
    
    # Education (assuming 'education_level' column exists or similar)
    # Using 'education_level' per data_loader
    if 'education_level' in df.columns:
        edu = df['education_level'].value_counts(normalize=True) * 100
        bach = edu.filter(like='Bachelor').sum()
    else:
        bach = 0
        
    if level == 'brief':
        return f"This is Deep Analysis. {top_co} is hiring aggressively, and {match_entry:.1f}% of roles are Entry Level."
        
    return (
        f"This is the Deep Analysis page. Let's dive into the details. "
        f"The **Top Companies** chart shows {top_co} leading with {top_co_val} openings. "
        f"For **Career Levels**, Entry-level roles make up {match_entry:.1f}%, while Senior/Management roles account for {match_senior:.1f}%. "
        f"The **Education** breakdown indicates that roughly {bach:.1f}% of jobs explicitly request a Bachelor's degree."
    )

def get_time_analysis_insights(level='detailed'):
    """Generate insights for Time Analysis (Trends)."""
    if df.empty or 'posted' not in df.columns:
        return "This is Time Analysis, showing hiring trends over time."
        
    try:
        # Assuming posted is datetime
        valid_dates = df['posted'].dropna()
        if valid_dates.empty:
            return "No date data available."
            
        start_date = valid_dates.min().strftime("%B")
        end_date = valid_dates.max().strftime("%B")
        
        # Peak Month
        monthly = valid_dates.dt.month_name().value_counts()
        peak_month = monthly.index[0]
        
        if level == 'brief':
            return f"This is Time Analysis. Hiring activity was tracked from {start_date} to {end_date}, peaking in {peak_month}."
            
        return (
            f"This is the Time Analysis page. The **Line Chart** shows hiring trends from {start_date} to {end_date}. "
            f"Activity peaked in {peak_month}, indicating strong demand during that period. "
            f"You can observe the fluctuations to identify seasonal hiring patterns."
        )
    except:
        return "This is Time Analysis. (Data processing error in dates)."

def get_skills_insights(level='detailed'):
    """Generate insights for Skills (Top Skills)."""
    if skills_df.empty:
        return "This is Skills Analysis. I don't have skill data loaded right now."
        
    top_skills = skills_df['Skills'].value_counts().head(5)
    skills_text = ", ".join(top_skills.index.tolist())
    
    if level == 'brief':
        return f"This is Skills Analysis. The top requested skills are {skills_text}."
        
    return (
        f"This is the Skills Analysis page. The **Word Cloud** highlights the market's top demands. "
        f"The most critical skills are: {skills_text}. "
        f"Mastering these usually yields the highest employability in the current market."
    )
