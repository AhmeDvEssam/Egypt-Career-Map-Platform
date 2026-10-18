import pandas as pd
import re
from data_loader import df, skills_df

def get_market_summary():
    """
    Returns a string summary of the current job market based on loaded data.
    """
    if df.empty:
        return "Market data currently unavailable."
        
    try:
        # 1. Top Categories
        if 'Category' in df.columns:
            top_cats = df['Category'].dropna().value_counts().head(5).to_dict()
        else:
            top_cats = {}
        
        # 2. Top Cities
        if 'City' in df.columns:
            top_cities = df['City'].dropna().value_counts().head(5).to_dict()
        else:
            top_cities = {}
        
        # 3. Top Skills
        top_skills = []
        if not skills_df.empty and 'Skills' in skills_df.columns:
            try:
                top_skills = skills_df['Skills'].dropna().value_counts().head(10).index.tolist()
            except Exception as e:
                print(f"DEBUG: Error processing skills_df: {e}")
            
        # 4. Experience Trends
        avg_exp = "Variable"
        if 'Year Of Exp_Avg' in df.columns:
            try:
                avg_exp = pd.to_numeric(df['Year Of Exp_Avg'], errors='coerce').mean()
            except Exception:
                pass
        
        summary_lines = [
            f"Market Context (Egypt Career Map):",
            f"- Total Jobs Analyzed: {len(df)}"
        ]
        
        if top_cats:
            summary_lines.append(f"- Top Categories: {', '.join([f'{k} ({v} jobs)' for k, v in top_cats.items()])}")
        
        if top_cities:
            summary_lines.append(f"- Top Hiring Cities: {', '.join([f'{k} ({v} jobs)' for k, v in top_cities.items()])}")
            
        if top_skills:
            summary_lines.append(f"- Most Demanded Skills: {', '.join(map(str, top_skills))}")
            
        summary_lines.append(f"- Average Years of Experience Required: {f'{avg_exp:.1f}' if isinstance(avg_exp, (int, float)) and not pd.isna(avg_exp) else 'Variable'}")
        
        return "\n".join(summary_lines)
        
    except Exception as e:
        import traceback
        print(f"CRITICAL Error generating market summary: {e}")
        traceback.print_exc()
        return "Market data is currently being processed."

def get_category_insight(category_name):
    """Specific insights for a category."""
    cat_df = df[df['Category'] == category_name]
    if cat_df.empty:
        return f"No specific data for {category_name}."
    
    cities = cat_df['City'].value_counts().head(3).index.tolist()
    return f"In {category_name}, top hiring cities are {', '.join(cities)}."

def get_job_recommendations(user_text, limit=5):
    """
    Finds matching jobs using vectorized matching and experience correlation.
    Sharpened to distinguish between Analyst and Scientist roles.
    """
    if df.empty:
        return []
        
    try:
        user_text = str(user_text).lower()
        
        # 1. Extract Experience Level from CV
        cv_years = 0
        exp_match = re.search(r'(\d+)\s*(?:years|yrs|yrs\.|year)\b', user_text)
        if exp_match:
            cv_years = int(exp_match.group(1))
            
        # 2. Determine Career Level based on extracted years
        cv_career_level = 'Entry Level'
        if cv_years >= 7:
            cv_career_level = 'Senior Management'
        elif cv_years >= 5:
            cv_career_level = 'Manager'
        elif cv_years >= 2:
            cv_career_level = 'Experienced'
        
        # 3. Detect Target Role Bias (Analyst vs Scientist vs Engineer etc.)
        target_bias = []
        if "analyst" in user_text: target_bias.append("analyst")
        if "scientist" in user_text: target_bias.append("scientist")
        if "architect" in user_text: target_bias.append("architect")
        if "developer" in user_text: target_bias.append("developer")
        
        # 4. Extract Keywords (Focusing on technical terms)
        if len(user_text) > 500:
            # Focus on words that look like skills or titles (longer, specific)
            all_words = re.findall(r'\b(?!(?:experience|knowledge|professional|management|university))(\w{5,})\b', user_text)
            search_keywords = list(set(all_words))[:25]
        else:
            search_keywords = [w.strip() for w in user_text.replace(',', ' ').split() if len(w) > 3]

        if not search_keywords:
            return []

        # 5. Vectorized Keyword Matching
        pattern = '|'.join([re.escape(w) for w in search_keywords])
        
        # Title Score (Base weight 6)
        title_matches = df['Job Title'].str.lower().str.contains(pattern, na=False, regex=True).astype(int) * 6
        
        # Skill Score (Weight 2)
        skill_matches = df['Skills'].str.lower().str.contains(pattern, na=False, regex=True).astype(int) * 2
        
        # 6. Sharp Title Penalty/Boost (The "Analyst vs Scientist" Fix)
        title_series = df['Job Title'].str.lower()
        for role in ["analyst", "scientist", "architect", "developer"]:
            if role in target_bias:
                # If the CV has this role but the Job Title DOES NOT, apply a penalty
                # If the Job Title HAS it, apply a boost
                title_matches += title_series.str.contains(role).astype(int) * 4
            elif any(r in target_bias for r in ["analyst", "scientist", "developer"]):
                 # Cross-contamination penalty: If user is an 'Analyst' and job is 'Scientist', penalize
                 if role == "scientist" and "analyst" in target_bias:
                     title_matches -= title_series.str.contains(role).astype(int) * 3
                 if role == "analyst" and "scientist" in target_bias:
                     title_matches -= title_series.str.contains(role).astype(int) * 3

        # 7. Experience Boost
        experience_boost = (df['Career Level'] == cv_career_level).astype(int) * 4
        
        total_score = title_matches + skill_matches + experience_boost
        
        # 8. Filter and Return
        top_indices = total_score.nlargest(limit).index
        matches = []
        for idx in top_indices:
            if total_score[idx] > 5: # Raised threshold for better precision
                row = df.loc[idx]
                matches.append({
                    'Title': row.get('Job Title'),
                    'Company': row.get('Company'),
                    'City': row.get('City'),
                    'Link': row.get('Link'),
                    'score': total_score[idx]
                })
        
        return matches
    except Exception as e:
        print(f"Error finding recommendations: {e}")
        return []
