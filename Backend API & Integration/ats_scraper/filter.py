import re
from typing import Optional, Tuple

EGYPT_CITIES = {
    "cairo": "Cairo",
    "القاهرة": "Cairo",
    "new cairo": "New Cairo",
    "القاهرة الجديدة": "New Cairo",
    "fifth settlement": "New Cairo",
    "التجمع": "New Cairo",
    "first settlement": "New Cairo",
    "nasr city": "Cairo",
    "مدينة نصر": "Cairo",
    "heliopolis": "Cairo",
    "مصر الجديدة": "Cairo",
    "maadi": "Cairo",
    "المعادي": "Cairo",
    "shorouk": "Cairo",
    "الشروق": "Cairo",
    "badr": "Cairo",
    "مدينة بدر": "Cairo",
    "madinaty": "Cairo",
    "مدينتي": "Cairo",
    "rehab": "Cairo",
    "الرحاب": "Cairo",
    "new capital": "New Administrative Capital",
    "العاصمة الإدارية": "New Administrative Capital",
    "giza": "Giza",
    "الجيزة": "Giza",
    "6th of october": "6th of October",
    "6 of october": "6th of October",
    "october": "6th of October",
    "السادس من أكتوبر": "6th of October",
    "october city": "6th of October",
    "sheikh zayed": "Sheikh Zayed",
    "الشيخ زايد": "Sheikh Zayed",
    "zayed": "Sheikh Zayed",
    "smart village": "Giza",
    "القرية الذكية": "Giza",
    "dokki": "Giza",
    "الدقي": "Giza",
    "mohandessin": "Giza",
    "المهندسين": "Giza",
    "zamalek": "Cairo",
    "الزمالك": "Cairo",
    "haram": "Giza",
    "الهرم": "Giza",
    "alexandria": "Alexandria",
    "الإسكندرية": "Alexandria",
    "alex": "Alexandria",
    "borg el arab": "Alexandria",
    "برج العرب": "Alexandria",
    "mansoura": "Mansoura",
    "المنصورة": "Mansoura",
    "tanta": "Tanta",
    "طنطا": "Tanta",
    "zagazig": "Sharqia",
    "الزقازيق": "Sharqia",
    "sharqia": "Sharqia",
    "الشرقية": "Sharqia",
    "10th of ramadan": "Sharqia",
    "العاشر من رمضان": "Sharqia",
    "assiut": "Assiut",
    "أسيوط": "Assiut",
    "sohag": "Sohag",
    "سوهاج": "Sohag",
    "aswan": "Aswan",
    "أسوان": "Aswan",
    "luxor": "Luxor",
    "الأقصر": "Luxor",
    "port said": "Port Said",
    "بورسعيد": "Port Said",
    "ismailia": "Ismailia",
    "الإسماعيلية": "Ismailia",
    "suez": "Suez",
    "السويس": "Suez",
    "hurghada": "Red Sea",
    "الغردقة": "Red Sea",
    "sharm": "South Sinai",
    "شرم الشيخ": "South Sinai",
    "qalyubia": "Qalyubia",
    "القليوبية": "Qalyubia",
    "banha": "Qalyubia",
    "بنها": "Qalyubia",
    "obour": "Qalyubia",
    "العبور": "Qalyubia",
    "damietta": "Damietta",
    "دمياط": "Damietta",
    "beheira": "Beheira",
    "البحيرة": "Beheira",
    "damanhour": "Beheira",
    "دمنهور": "Beheira",
    "beni suef": "Beni Suef",
    "بني سويف": "Beni Suef",
    "minya": "Minya",
    "المنيا": "Minya",
    "fayoum": "Fayoum",
    "الفيوم": "Fayoum"
}

# Explicit non-Egypt indicators that disqualify a job unless Egypt is also explicitly specified
FOREIGN_LOCATIONS = [
    "saudi arabia", "riyadh", "jeddah", "dammam", "khobar", "السعودية", "الرياض", "جدة",
    "united arab emirates", "uae", "dubai", "abu dhabi", "sharjah", "الإمارات", "دبي", "أبوظبي",
    "qatar", "doha", "قطر", "الدوحة",
    "kuwait", "الكويت",
    "bahrain", "manama", "البحرين",
    "oman", "muscat", "عمان", "مسقط",
    "jordan", "amman", "الأردن", "عمان",
    "united states", "usa", "canada", "united kingdom", "uk", "london",
    "germany", "berlin", "france", "paris", "netherlands", "amsterdam",
    "spain", "barcelona", "madrid", "poland", "india", "pakistan"
]

def is_egypt_scope(
    location_raw: Optional[str] = "",
    city: Optional[str] = "",
    country: Optional[str] = "",
    company_country: Optional[str] = "",
    is_remote: bool = False
) -> Tuple[bool, str]:
    """
    Evaluates whether a job posting falls within Egypt's scope.
    Returns: (is_egypt: bool, normalized_location: str)
    """
    loc_combined = f"{location_raw or ''} {city or ''} {country or ''}".strip().lower()
    
    # 1. Check if there are explicit foreign locations
    has_foreign = any(re.search(rf"\b{re.escape(fl)}\b", loc_combined) for fl in FOREIGN_LOCATIONS)
    
    # 2. Check for Egypt country indicator
    has_egypt_country = bool(
        re.search(r"\b(egypt|eg|مصر)\b", loc_combined) or 
        (country and country.strip().upper() in ("EG", "EGY", "EGYPT"))
    )

    # 3. Check for specific Egypt city / governorate
    matched_city = None
    for token, normalized in EGYPT_CITIES.items():
        if re.search(rf"\b{re.escape(token)}\b", loc_combined):
            matched_city = normalized
            break

    # Decision Matrix:
    # A. If it has a matched Egyptian city:
    if matched_city:
        if has_foreign and not has_egypt_country:
            # Ambiguity guard (e.g. Amman vs Amman Jordan)
            pass
        else:
            return True, f"{matched_city}, Egypt"

    # B. If country explicitly says Egypt:
    if has_egypt_country:
        if matched_city:
            return True, f"{matched_city}, Egypt"
        if is_remote or "remote" in loc_combined:
            return True, "Remote, Egypt"
        return True, "Cairo, Egypt" if "cairo" in loc_combined else "Egypt"

    # C. If the company is based in Egypt and the job is Remote or Location is blank:
    if company_country and company_country.lower() == "egypt":
        if not has_foreign:
            if is_remote or "remote" in loc_combined or "work from home" in loc_combined:
                return True, "Remote, Egypt"
            if not loc_combined or loc_combined in ("hybrid", "on-site", "remote"):
                return True, "Cairo, Egypt"

    return False, location_raw or "Unknown"
