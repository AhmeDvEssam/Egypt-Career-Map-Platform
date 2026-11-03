import os
import csv
import time
from typing import List, Dict, Any, Optional
from datetime import datetime

from .fetchers import fetch_board_jobs
from .filter import is_egypt_scope
from .normalizer import normalize_job
from .sink import AtsSink

DEFAULT_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "company_boards.csv")

class AtsPipeline:
    def __init__(self, registry_path: str = DEFAULT_REGISTRY_PATH):
        self.registry_path = registry_path
        self.sink = AtsSink()

    def load_boards(self, filter_ats: Optional[str] = None, filter_token: Optional[str] = None) -> List[Dict[str, str]]:
        boards = []
        if not os.path.exists(self.registry_path):
            raise FileNotFoundError(f"Company boards registry not found at {self.registry_path}")

        with open(self.registry_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(line for line in f if not line.lstrip().startswith("#"))
            for r in reader:
                ats = (r.get("ats") or "").strip().lower()
                token = (r.get("token") or "").strip()
                company = (r.get("company") or token).strip()
                country = (r.get("country") or "").strip()
                website = (r.get("website") or "").strip()
                enabled = (r.get("enabled") or "true").strip().lower() == "true"

                if not enabled or not token or not ats:
                    continue
                if filter_ats and ats != filter_ats.lower():
                    continue
                if filter_token and token.lower() != filter_token.lower():
                    continue

                boards.append({
                    "ats": ats,
                    "token": token,
                    "company": company,
                    "country": country,
                    "website": website
                })
        return boards

    def process_board(self, board: Dict[str, str]) -> Dict[str, Any]:
        ats = board["ats"]
        token = board["token"]
        company = board["company"]
        company_country = board["country"]

        start_time = time.time()
        raw_jobs = fetch_board_jobs(ats, token)
        fetch_duration_ms = round((time.time() - start_time) * 1000, 1)

        matched_jobs = []
        for raw in raw_jobs:
            # Extract raw location candidates
            loc_raw = ""
            city = ""
            country = ""
            is_remote = False

            if ats == "lever":
                cat = raw.get("categories") or {}
                loc_raw = cat.get("location") or ""
                country = raw.get("country") or ""
                is_remote = raw.get("workplaceType") == "remote"
            elif ats == "workable":
                city = raw.get("city") or ""
                country = raw.get("country") or ""
                loc_raw = f"{city}, {country}" if city and country else (city or country or "")
                is_remote = bool(raw.get("telecommuting", False))
            elif ats == "greenhouse":
                loc_raw = (raw.get("location") or {}).get("name") or ""
                is_remote = "remote" in loc_raw.lower()
            elif ats == "ashby":
                loc_raw = raw.get("location") or ""
                is_remote = bool(raw.get("isRemote", False))
            elif ats == "smartrecruiters":
                loc = raw.get("location") or {}
                loc_raw = loc.get("fullLocation") or ""
                city = loc.get("city") or ""
                country = loc.get("country") or ""
                is_remote = bool(loc.get("remote", False))

            is_egypt, norm_loc = is_egypt_scope(
                location_raw=loc_raw,
                city=city,
                country=country,
                company_country=company_country,
                is_remote=is_remote
            )

            if is_egypt:
                job_entity = normalize_job(ats, raw, board, norm_loc)
                matched_jobs.append(job_entity)

        # Save to DB & CSV
        ins, upd = self.sink.save_jobs(matched_jobs)

        return {
            "ats": ats,
            "token": token,
            "company": company,
            "fetch_duration_ms": fetch_duration_ms,
            "total_raw": len(raw_jobs),
            "matched_egypt": len(matched_jobs),
            "inserted": ins,
            "updated": upd,
            "jobs": matched_jobs
        }

    def run_all(self, filter_ats: Optional[str] = None, filter_token: Optional[str] = None) -> List[Dict[str, Any]]:
        boards = self.load_boards(filter_ats=filter_ats, filter_token=filter_token)
        results = []
        for b in boards:
            res = self.process_board(b)
            results.append(res)
        return results
