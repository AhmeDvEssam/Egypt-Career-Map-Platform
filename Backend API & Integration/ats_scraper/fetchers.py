import time
import requests
from typing import List, Dict, Any

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8"
}

session = requests.Session()
session.headers.update(HEADERS)

def fetch_lever(token: str, timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Fetches job postings from Lever Public API.
    Handles case variations and US / EU instances.
    """
    urls = [
        f"https://api.lever.co/v0/postings/{token}?mode=json",
        f"https://api.eu.lever.co/v0/postings/{token}?mode=json"
    ]
    for url in urls:
        try:
            r = session.get(url, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list):
                    return data
        except requests.RequestException:
            continue
    return []

def fetch_workable(token: str, timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Fetches job postings from Workable Widget & Account APIs.
    """
    urls = [
        f"https://apply.workable.com/api/v1/widget/accounts/{token}?details=true",
        f"https://www.workable.com/api/accounts/{token}?details=true"
    ]
    for url in urls:
        try:
            r = session.get(url, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, dict):
                    jobs = data.get("jobs", [])
                    company_name = data.get("name")
                    return [{**j, "_company_name": company_name} for j in jobs]
        except requests.RequestException:
            continue
    return []

def fetch_greenhouse(token: str, timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Fetches job postings from Greenhouse Board API (US & EU instances).
    """
    urls = [
        f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true",
        f"https://boards-api.eu.greenhouse.io/v1/boards/{token}/jobs?content=true"
    ]
    for url in urls:
        try:
            r = session.get(url, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, dict):
                    return data.get("jobs", [])
        except requests.RequestException:
            continue
    return []

def fetch_ashby(token: str, timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Fetches job postings from Ashby Posting API.
    """
    url = f"https://api.ashbyhq.com/posting-api/job-board/{token}?includeCompensation=true"
    try:
        r = session.get(url, timeout=timeout)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, dict):
                return [j for j in data.get("jobs", []) if j.get("isListed", True)]
    except requests.RequestException:
        pass
    return []

def fetch_smartrecruiters(token: str, max_pages: int = 3, timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Fetches postings from SmartRecruiters Public API.
    """
    url = f"https://api.smartrecruiters.com/v1/companies/{token}/postings"
    postings = []
    for page in range(max_pages):
        try:
            r = session.get(url, params={"limit": 100, "offset": page * 100}, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                content = data.get("content", [])
                postings.extend(content)
                if len(content) < 100 or len(postings) >= (data.get("totalFound") or 0):
                    break
            else:
                break
        except requests.RequestException:
            break
    return postings

FETCHERS = {
    "lever": fetch_lever,
    "workable": fetch_workable,
    "greenhouse": fetch_greenhouse,
    "ashby": fetch_ashby,
    "smartrecruiters": fetch_smartrecruiters
}

def fetch_board_jobs(ats: str, token: str) -> List[Dict[str, Any]]:
    """
    Dispatches to the appropriate ATS fetcher.
    """
    fetcher = FETCHERS.get(ats.lower())
    if not fetcher:
        raise ValueError(f"Unsupported ATS platform: {ats}")
    return fetcher(token)
