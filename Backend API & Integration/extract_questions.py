import sys
import os
import json
import time
from typing import Dict, Any, List
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

try:
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr.encoding != "utf-8":
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

BRAVE_PATH = r"C:\Users\ahmed\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe"
PROFILE_DIR = r"C:\Users\ahmed\.gemini\brave_hireq_profile"
DRIVER_PATH = r"C:\Users\ahmed\.cache\selenium\chromedriver\win64\153.0.8010.52\chromedriver.exe"

def get_fast_driver() -> webdriver.Chrome:
    opts = Options()
    if os.path.exists(BRAVE_PATH):
        opts.binary_location = BRAVE_PATH
    os.makedirs(PROFILE_DIR, exist_ok=True)
    opts.add_argument(f"--user-data-dir={PROFILE_DIR}")
    opts.add_argument("--no-first-run")
    opts.add_argument("--no-default-browser-check")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--headless=new")
    opts.page_load_strategy = "eager"

    if os.path.exists(DRIVER_PATH):
        service = Service(executable_path=DRIVER_PATH)
        driver = webdriver.Chrome(service=service, options=opts)
    else:
        driver = webdriver.Chrome(options=opts)
        
    driver.set_page_load_timeout(25)
    return driver

def categorize_question(q_text: str) -> Dict[str, Any]:
    clean = q_text.lower()
    if any(w in clean for w in ["salary", "expected", "compensation", "مرتب", "راتب"]):
        return {"category": "COMPENSATION", "isGeneral": True, "key": "expected_salary"}
    if any(w in clean for w in ["major", "university", "faculty", "degree", "جامع", "تخصص", "كلية"]):
        return {"category": "EDUCATION", "isGeneral": True, "key": "university_major"}
    if any(w in clean for w in ["notice", "how soon", "start date", "availability"]):
        return {"category": "GENERAL", "isGeneral": True, "key": "notice_period"}
    if any(w in clean for w in ["authorized", "sponsorship", "visa", "legal"]):
        return {"category": "GENERAL", "isGeneral": True, "key": "work_authorization"}
    if any(w in clean for w in ["sql", "python", "power bi", "tableau", "data analysis", "data science", "excel", "experience"]):
        return {"category": "TECHNICAL_EXPERIENCE", "isGeneral": False, "roleCategory": "DATA", "key": "data_experience"}
    return {"category": "ROLE_SPECIFIC", "isGeneral": False, "roleCategory": "GENERAL_TECH", "key": "general_technical"}

def extract_wuzzuf(driver: webdriver.Chrome, job_url: str) -> Dict[str, Any]:
    driver.get(job_url)
    time.sleep(3)

    title = driver.title
    body_text = driver.find_element(By.TAG_NAME, "body").text.lower()
    if "you applied" in body_text or "already applied" in body_text or "تم التقديم" in body_text:
        return {
            "success": True,
            "status": "ALREADY_APPLIED",
            "platform": "WUZZUF",
            "message": "تم التقديم على هذه الوظيفة مسبقاً على موقع WUZZUF.",
            "questions": []
        }

    # Click apply if not already on job-questions
    if "job-questions" not in driver.current_url:
        buttons = driver.find_elements(By.TAG_NAME, "button")
        apply_btn = [b for b in buttons if b.is_displayed() and any(w in b.text.lower() for w in ["apply for job", "complete your application", "complete application", "قدم للوظيفة", "apply now"])]
        if not apply_btn:
            links = driver.find_elements(By.TAG_NAME, "a")
            apply_btn = [a for a in links if a.is_displayed() and any(w in a.text.lower() for w in ["apply for job", "complete your application", "complete application", "قدم للوظيفة", "apply now"])]
        if apply_btn:
            driver.execute_script("arguments[0].click();", apply_btn[0])
            time.sleep(3)

    # Scrape questions
    questions = []
    
    # 1. Textareas
    for t in driver.find_elements(By.TAG_NAME, "textarea"):
        if not t.is_displayed():
            continue
        q_text = ""
        try:
            elem = t.find_element(By.XPATH, "./preceding::*[contains(text(), '?')][1]")
            q_text = elem.text.strip()
        except Exception:
            pass
        if not q_text:
            continue
            
        cat = categorize_question(q_text)
        questions.append({
            "id": f"q_wz_{len(questions) + 1}",
            "text": q_text,
            "type": "textarea",
            "currentValue": t.get_attribute("value") or "",
            "placeholder": t.get_attribute("placeholder") or "",
            "options": [],
            "category": cat["category"],
            "isGeneral": cat["isGeneral"],
            "roleCategory": cat.get("roleCategory"),
            "questionKey": cat["key"]
        })

    # 2. Radios
    radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
    radio_groups = {}
    for r in radios:
        group_name = r.get_attribute("name") or "radio_group"
        q_text = ""
        try:
            elem = r.find_element(By.XPATH, "./preceding::*[contains(text(), '?')][1]")
            q_text = elem.text.strip()
        except Exception:
            pass
        if not q_text:
            continue
            
        opt_lbl = ""
        try:
            opt_lbl = r.find_element(By.XPATH, "..").text.strip()
        except Exception:
            opt_lbl = r.get_attribute("value") or ""
            
        key = q_text
        if key not in radio_groups:
            cat = categorize_question(q_text)
            radio_groups[key] = {
                "id": f"q_wz_{len(questions) + len(radio_groups) + 1}",
                "text": q_text,
                "type": "radio",
                "options": [],
                "currentValue": "",
                "placeholder": "",
                "category": cat["category"],
                "isGeneral": cat["isGeneral"],
                "roleCategory": cat.get("roleCategory"),
                "questionKey": cat["key"]
            }
        if opt_lbl and opt_lbl not in radio_groups[key]["options"]:
            radio_groups[key]["options"].append(opt_lbl)
        if r.is_selected():
            radio_groups[key]["currentValue"] = opt_lbl

    questions.extend(list(radio_groups.values()))

    # Extract Job Title & Company from page
    page_text = driver.find_element(By.TAG_NAME, "body").text
    lines = [l.strip() for l in page_text.split("\n") if l.strip()]
    job_title = "Data Scientist"
    company_name = "Company"
    for idx, l in enumerate(lines):
        if "the hiring team at" in l.lower():
            company_name = l.replace("The hiring team at", "").replace("requires you to answer the below questions.", "").strip()
            if idx > 0 and len(lines[idx-1]) < 40:
                job_title = lines[idx-1]
            break

    return {
        "success": True,
        "status": "QUESTIONS_EXTRACTED",
        "platform": "WUZZUF",
        "jobUrl": job_url,
        "jobTitle": job_title,
        "company": company_name,
        "questions": questions
    }

def extract_linkedin(driver: webdriver.Chrome, job_url: str) -> Dict[str, Any]:
    driver.get(job_url)
    time.sleep(3)

    body_text = driver.find_element(By.TAG_NAME, "body").text.lower()
    if "application submitted" in body_text or "تم تقديم الطلب" in body_text:
        return {
            "success": True,
            "status": "ALREADY_APPLIED",
            "platform": "LINKEDIN",
            "message": "تم تقديم هذا الطلب مسبقاً على LinkedIn.",
            "questions": []
        }

    apply_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label*='Easy Apply'], button[aria-label*='التقديم السهل'], button.jobs-apply-button")
    if not apply_buttons:
        return {
            "success": False,
            "status": "NO_EASY_APPLY",
            "platform": "LINKEDIN",
            "message": "لا يوجد زر Easy Apply في هذه الوظيفة.",
            "questions": []
        }

    driver.execute_script("arguments[0].click();", apply_buttons[0])
    time.sleep(2)

    # Walk modal steps to collect questions
    questions = []
    seen_texts = set()

    for step in range(1, 6):
        time.sleep(1.5)
        
        # Check inputs
        inputs = driver.find_elements(By.CSS_SELECTOR, "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")
        for inp in inputs:
            if not inp.is_displayed():
                continue
            lbl = inp.get_attribute("aria-label") or ""
            if not lbl and inp.get_attribute("id"):
                for l in driver.find_elements(By.CSS_SELECTOR, f"label[for='{inp.get_attribute('id')}']"):
                    if l.text.strip():
                        lbl = l.text.strip()
            if lbl and lbl not in seen_texts:
                seen_texts.add(lbl)
                cat = categorize_question(lbl)
                questions.append({
                    "id": f"q_li_{len(questions) + 1}",
                    "text": lbl,
                    "type": "textarea" if inp.tag_name == "textarea" else "text",
                    "currentValue": inp.get_attribute("value") or "",
                    "placeholder": inp.get_attribute("placeholder") or "",
                    "options": [],
                    "category": cat["category"],
                    "isGeneral": cat["isGeneral"],
                    "roleCategory": cat.get("roleCategory"),
                    "questionKey": cat["key"]
                })

        # Check radios
        radios = driver.find_elements(By.CSS_SELECTOR, "div[role='radio']")
        for r in radios:
            q_text = r.get_attribute("aria-label") or ""
            if not q_text:
                try:
                    q_text = r.find_element(By.XPATH, "./ancestor::fieldset").text.split("\n")[0]
                except Exception:
                    pass
            if q_text and q_text not in seen_texts:
                seen_texts.add(q_text)
                cat = categorize_question(q_text)
                questions.append({
                    "id": f"q_li_{len(questions) + 1}",
                    "text": q_text,
                    "type": "radio",
                    "options": ["Yes", "No"],
                    "currentValue": "",
                    "placeholder": "",
                    "category": cat["category"],
                    "isGeneral": cat["isGeneral"],
                    "roleCategory": cat.get("roleCategory"),
                    "questionKey": cat["key"]
                })

        # Advance to next step
        buttons = driver.find_elements(By.TAG_NAME, "button")
        next_btns = [b for b in buttons if b.is_displayed() and b.text.strip().lower() in ["next", "continue", "review", "التالي", "مراجعة"]]
        if next_btns:
            driver.execute_script("arguments[0].click();", next_btns[0])
        else:
            break

    # Dismiss modal cleanly
    try:
        dismiss_btn = driver.find_elements(By.CSS_SELECTOR, "button[aria-label='Dismiss'], button[data-control-name='overlay.close_padding']")
        if dismiss_btn:
            driver.execute_script("arguments[0].click();", dismiss_btn[0])
            time.sleep(1)
            # Confirm discard
            discard_btn = driver.find_elements(By.CSS_SELECTOR, "button[data-control-name='discard_application_confirm_btn']")
            if discard_btn:
                driver.execute_script("arguments[0].click();", discard_btn[0])
    except Exception:
        pass

    return {
        "success": True,
        "status": "QUESTIONS_EXTRACTED",
        "platform": "LINKEDIN",
        "jobUrl": job_url,
        "questions": questions
    }

def extract_job_questions(job_url: str) -> Dict[str, Any]:
    driver = None
    try:
        driver = get_fast_driver()
        if "wuzzuf.net" in job_url.lower():
            return extract_wuzzuf(driver, job_url)
        else:
            return extract_linkedin(driver, job_url)
    except Exception as e:
        return {
            "success": False,
            "status": "ERROR",
            "message": str(e),
            "questions": []
        }
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://wuzzuf.net/jobs/p/tqzmxkgamxgb-data-scientist-dice-for-ready-made-garments-cairo-egypt"
    res = extract_job_questions(url)
    print("EXTRACTION RESULT:")
    print(json.dumps(res, ensure_ascii=False, indent=2))
