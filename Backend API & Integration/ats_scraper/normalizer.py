import re
import html
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional

def clean_html(raw_html: Optional[str]) -> str:
    """Removes HTML tags and normalizes whitespace."""
    if not raw_html:
        return ""
    text = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", raw_html, flags=re.IGNORECASE)
    text = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>|</p>|</div>|</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()

def infer_career_level(title: str, description: str) -> str:
    combined = f"{title} {description}".lower()
    lower_title = title.lower()
    
    if re.search(r"\b(senior|sr\.?|lead|principal|رئيسي|أول|خبير)\b", lower_title):
        return "Senior"
    if re.search(r"\b(junior|jr\.?|entry\s*level|fresh|trainee|مبتدئ|حديث)\b", lower_title):
        return "Junior/Entry"
    if re.search(r"\b(intern|internship|تدريب)\b", lower_title):
        return "Internship"
    if re.search(r"\b(director|head|manager|مدير|رئيس)\b", lower_title):
        return "Manager"
    if re.search(r"\b(vp|vice president|chief|c-level|executive|تنفيذي)\b", lower_title):
        return "Executive"
    
    if "senior" in combined:
        return "Senior"
    if "junior" in combined or "fresh graduate" in combined:
        return "Junior/Entry"
    return "Mid-Level"

def infer_work_type(location_raw: str, workplace_type: Optional[str] = None, is_remote: bool = False, text: str = "") -> str:
    combined = f"{location_raw} {workplace_type or ''} {text}".lower()
    if is_remote or workplace_type == "remote" or "remote" in combined or "عن بعد" in combined or "work from home" in combined:
        return "Remote"
    if workplace_type == "hybrid" or "hybrid" in combined or "هجين" in combined:
        return "Hybrid"
    return "On-site"

def infer_experience(title: str, description: str):
    combined = f"{title} {description}"
    # Range: 3-5 years or 3 to 5 years
    m_range = re.search(r"\b(\d{1,2})\s*(?:-|to|إلى|الي)\s*(\d{1,2})\s*(?:years?|yrs?|سنوات?)\b", combined, re.IGNORECASE)
    if m_range:
        mn, mx = int(m_range.group(1)), int(m_range.group(2))
        return mn, mx, (mn + mx) / 2.0
    # Single: 3+ years or 3 years
    m_single = re.search(r"\b(\d{1,2})\+?\s*(?:years?|yrs?|سنوات?)\b", combined, re.IGNORECASE)
    if m_single:
        val = int(m_single.group(1))
        if val <= 15:
            return val, val, float(val)
    return None, None, None

def generate_dedup_hash(company: str, title: str, location: str) -> str:
    key = f"{company.strip().lower()}:{title.strip().lower()}:{location.strip().lower()}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def normalize_lever_job(raw: Dict[str, Any], company_meta: Dict[str, str], norm_loc: str) -> Dict[str, Any]:
    categories = raw.get("categories") or {}
    job_id = raw.get("id")
    title = raw.get("text", "").strip()
    company = company_meta.get("company", "Bosta")
    
    desc_raw = raw.get("descriptionPlain") or raw.get("descriptionBodyPlain") or raw.get("description", "")
    description = clean_html(desc_raw)
    
    workplace = raw.get("workplaceType")
    work_type = infer_work_type(norm_loc, workplace, text=title)
    career_level = infer_career_level(title, description)
    min_exp, max_exp, avg_exp = infer_experience(title, description)
    
    created_at = raw.get("createdAt")
    posted_date = datetime.utcfromtimestamp(created_at / 1000.0).isoformat() if created_at else datetime.utcnow().isoformat()
    
    return {
        "source": "lever",
        "source_job_id": str(job_id),
        "title_raw": title,
        "title_normalized": title,
        "company_name": company,
        "company_url": company_meta.get("website", ""),
        "location_raw": categories.get("location") or norm_loc,
        "location_normalized": norm_loc,
        "job_type": categories.get("commitment") or "Full-time",
        "work_type": work_type,
        "career_level": career_level,
        "min_experience": min_exp,
        "max_experience": max_exp,
        "avg_experience": avg_exp,
        "education_level": None,
        "job_category": categories.get("department") or categories.get("team") or "Other / Uncategorized",
        "salary_min": None,
        "salary_max": None,
        "currency": None,
        "job_url": raw.get("hostedUrl") or raw.get("applyUrl"),
        "posted_date": posted_date,
        "description": description,
        "dedup_hash": generate_dedup_hash(company, title, norm_loc)
    }

def normalize_workable_job(raw: Dict[str, Any], company_meta: Dict[str, str], norm_loc: str) -> Dict[str, Any]:
    job_id = raw.get("shortcode") or raw.get("id") or raw.get("code")
    title = raw.get("title", "").strip()
    company = company_meta.get("company") or raw.get("_company_name", "Robusta Studio")
    
    description = clean_html(raw.get("description", ""))
    telecommuting = bool(raw.get("telecommuting", False))
    work_type = infer_work_type(norm_loc, is_remote=telecommuting, text=title)
    career_level = infer_career_level(title, description)
    min_exp, max_exp, avg_exp = infer_experience(title, description)
    
    pub = raw.get("published_on") or raw.get("created_at")
    posted_date = str(pub) if pub else datetime.utcnow().isoformat()
    
    loc_parts = [raw.get("city"), raw.get("state"), raw.get("country")]
    location_raw = ", ".join(p for p in loc_parts if p) or norm_loc
    
    return {
        "source": "workable",
        "source_job_id": str(job_id),
        "title_raw": title,
        "title_normalized": title,
        "company_name": company,
        "company_url": company_meta.get("website", ""),
        "location_raw": location_raw,
        "location_normalized": norm_loc,
        "job_type": raw.get("employment_type") or "Full-time",
        "work_type": work_type,
        "career_level": career_level,
        "min_experience": min_exp,
        "max_experience": max_exp,
        "avg_experience": avg_exp,
        "education_level": raw.get("education"),
        "job_category": raw.get("department") or raw.get("function") or "Other / Uncategorized",
        "salary_min": None,
        "salary_max": None,
        "currency": None,
        "job_url": raw.get("url") or raw.get("shortlink"),
        "posted_date": posted_date,
        "description": description,
        "dedup_hash": generate_dedup_hash(company, title, norm_loc)
    }

def normalize_greenhouse_job(raw: Dict[str, Any], company_meta: Dict[str, str], norm_loc: str) -> Dict[str, Any]:
    job_id = raw.get("id")
    title = raw.get("title", "").strip()
    company = company_meta.get("company", "Careem")
    
    description = clean_html(raw.get("content", ""))
    loc_name = (raw.get("location") or {}).get("name") or norm_loc
    work_type = infer_work_type(loc_name, text=title)
    career_level = infer_career_level(title, description)
    min_exp, max_exp, avg_exp = infer_experience(title, description)
    
    posted_date = raw.get("updated_at") or raw.get("first_published") or datetime.utcnow().isoformat()
    
    departments = raw.get("departments") or []
    dept_name = departments[0].get("name") if departments else "Other / Uncategorized"
    
    return {
        "source": "greenhouse",
        "source_job_id": str(job_id),
        "title_raw": title,
        "title_normalized": title,
        "company_name": company,
        "company_url": company_meta.get("website", ""),
        "location_raw": loc_name,
        "location_normalized": norm_loc,
        "job_type": "Full-time",
        "work_type": work_type,
        "career_level": career_level,
        "min_experience": min_exp,
        "max_experience": max_exp,
        "avg_experience": avg_exp,
        "education_level": None,
        "job_category": dept_name,
        "salary_min": None,
        "salary_max": None,
        "currency": None,
        "job_url": raw.get("absolute_url"),
        "posted_date": str(posted_date),
        "description": description,
        "dedup_hash": generate_dedup_hash(company, title, norm_loc)
    }

def normalize_ashby_job(raw: Dict[str, Any], company_meta: Dict[str, str], norm_loc: str) -> Dict[str, Any]:
    job_id = raw.get("id")
    title = raw.get("title", "").strip()
    company = company_meta.get("company", "Thndr")
    
    desc_raw = raw.get("descriptionPlain") or raw.get("descriptionHtml") or ""
    description = clean_html(desc_raw)
    
    is_remote = bool(raw.get("isRemote", False))
    work_type = infer_work_type(norm_loc, is_remote=is_remote, text=title)
    career_level = infer_career_level(title, description)
    min_exp, max_exp, avg_exp = infer_experience(title, description)
    
    sal_min, sal_max, currency = None, None, None
    comp = raw.get("compensation") or {}
    tiers = comp.get("compensationTiers") or []
    if tiers:
        for comp_item in tiers[0].get("components", []):
            if comp_item.get("compensationType") == "Salary":
                sal_min = comp_item.get("minValue")
                sal_max = comp_item.get("maxValue")
                currency = comp_item.get("currencyCode") or "EGP"
                break

    return {
        "source": "ashby",
        "source_job_id": str(job_id),
        "title_raw": title,
        "title_normalized": title,
        "company_name": company,
        "company_url": company_meta.get("website", ""),
        "location_raw": raw.get("location") or norm_loc,
        "location_normalized": norm_loc,
        "job_type": raw.get("employmentType") or "Full-time",
        "work_type": work_type,
        "career_level": career_level,
        "min_experience": min_exp,
        "max_experience": max_exp,
        "avg_experience": avg_exp,
        "education_level": None,
        "job_category": raw.get("department") or raw.get("team") or "Other / Uncategorized",
        "salary_min": sal_min,
        "salary_max": sal_max,
        "currency": currency,
        "job_url": raw.get("jobUrl") or raw.get("applyUrl"),
        "posted_date": str(raw.get("publishedAt") or datetime.utcnow().isoformat()),
        "description": description,
        "dedup_hash": generate_dedup_hash(company, title, norm_loc)
    }

def normalize_smartrecruiters_job(raw: Dict[str, Any], company_meta: Dict[str, str], norm_loc: str) -> Dict[str, Any]:
    job_id = raw.get("id")
    title = raw.get("name", "").strip()
    company = company_meta.get("company", "Delivery Hero")
    
    loc = raw.get("location") or {}
    loc_name = loc.get("fullLocation") or norm_loc
    is_remote = bool(loc.get("remote", False))
    work_type = infer_work_type(norm_loc, is_remote=is_remote, text=title)
    
    emp_type = (raw.get("typeOfEmployment") or {}).get("label") or "Full-time"
    career_level = infer_career_level(title, "")
    
    token = company_meta.get("token", "DeliveryHero")
    job_url = f"https://jobs.smartrecruiters.com/{token}/{job_id}"
    
    return {
        "source": "smartrecruiters",
        "source_job_id": str(job_id),
        "title_raw": title,
        "title_normalized": title,
        "company_name": company,
        "company_url": company_meta.get("website", ""),
        "location_raw": loc_name,
        "location_normalized": norm_loc,
        "job_type": emp_type,
        "work_type": work_type,
        "career_level": career_level,
        "min_experience": None,
        "max_experience": None,
        "avg_experience": None,
        "education_level": None,
        "job_category": raw.get("department") or raw.get("industry") or "Other / Uncategorized",
        "salary_min": None,
        "salary_max": None,
        "currency": None,
        "job_url": job_url,
        "posted_date": str(raw.get("releasedDate") or datetime.utcnow().isoformat()),
        "description": "",
        "dedup_hash": generate_dedup_hash(company, title, norm_loc)
    }

NORMALIZERS = {
    "lever": normalize_lever_job,
    "workable": normalize_workable_job,
    "greenhouse": normalize_greenhouse_job,
    "ashby": normalize_ashby_job,
    "smartrecruiters": normalize_smartrecruiters_job
}

def normalize_job(ats: str, raw_job: Dict[str, Any], company_meta: Dict[str, str], norm_loc: str) -> Dict[str, Any]:
    norm_fn = NORMALIZERS.get(ats.lower())
    if not norm_fn:
        raise ValueError(f"No normalizer for ATS {ats}")
    return norm_fn(raw_job, company_meta, norm_loc)
