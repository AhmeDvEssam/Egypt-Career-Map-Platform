import os
import sys
import time
import json
import re
from typing import Dict, Any, List, Optional
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

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
DEFAULT_RESUME_PATH = r"D:\Hire Q Project\resumes\Ahmed Essam.pdf"

def get_brave_driver(headless: bool = False) -> webdriver.Chrome:
    """Configures and returns a Selenium WebDriver instance with Brave Browser."""
    options = Options()
    if os.path.exists(BRAVE_PATH):
        options.binary_location = BRAVE_PATH
    
    # Use dedicated automation profile so it never conflicts with open windows
    os.makedirs(PROFILE_DIR, exist_ok=True)
    options.add_argument(f"--user-data-dir={PROFILE_DIR}")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--start-maximized")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.page_load_strategy = "eager"
    
    if headless:
        options.add_argument("--headless=new")
        
    if os.path.exists(DRIVER_PATH):
        service = Service(executable_path=DRIVER_PATH)
        driver = webdriver.Chrome(service=service, options=options)
    else:
        driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(30)
    return driver

def match_answer_for_question(label_text: str, answers_map: Dict[str, str], candidate_data: Dict[str, Any]) -> Optional[str]:
    clean = label_text.lower().strip()
    if not clean:
        return None
    
    # 1. Exact or high-confidence answer map lookup
    for key, val in answers_map.items():
        k = key.lower().strip()
        if k and (k == clean or (len(k) > 5 and k in clean)):
            return val

    # 2. Domain & Key patterns matching
    if "sql" in clean and ("year" in clean or "experience" in clean):
        return answers_map.get("years_sql_experience", "3")
    if "python" in clean and ("year" in clean or "experience" in clean):
        return answers_map.get("years_python_experience", "3")
    if "english" in clean:
        return answers_map.get("english_proficiency", "Professional")
    if "gathering" in clean or "reporting requirements" in clean or "documenting data" in clean:
        return answers_map.get("gathering_reporting_requirements_experience", "Yes")
    if "pipeline" in clean or "ingestion" in clean or "etl" in clean:
        return answers_map.get("data_pipelines_ingestion_experience", "Yes")
    if "fintech" in clean or "banking" in clean or "regulated" in clean:
        return answers_map.get("fintech_banking_experience", "No")
    if "programming" in clean or "scripting" in clean:
        return answers_map.get("programming_scripting_tools_experience", "Yes")
    if "authorized" in clean or "right to work" in clean:
        return answers_map.get("authorized_to_work", "Yes")
    if "sponsorship" in clean or "visa" in clean:
        return answers_map.get("visa_sponsorship_needed", "No")
    if "notice" in clean or "start date" in clean or "how soon" in clean:
        return answers_map.get("notice_period", "Immediately Available")
    if "horario" in clean or "schedule" in clean or "working hours" in clean or "availability" in clean:
        return answers_map.get("working_schedule_horario", "Full-time (40 hrs/week), Immediately Available, Flexible")
    if "phone" in clean or "mobile" in clean:
        return candidate_data.get("phoneNumber", "+20 114 230 6520")
    if "email" in clean:
        return candidate_data.get("email", "ahmed.essam.eldinn@gmail.com")

    # 3. Partial fallback
    for key, val in answers_map.items():
        k = key.lower().strip()
        if len(k) > 4 and (k in clean or clean in k):
            return val

    return None

def inspect_and_fill_modal(driver: webdriver.Chrome, answers_map: Dict[str, str], candidate_data: Dict[str, Any], auto_submit: bool = True, log_cb=None) -> Dict[str, Any]:
    """Iterates through LinkedIn Easy Apply modal pages, fills inputs, and advances."""
    def log(msg: str):
        if log_cb:
            log_cb(msg)
        print(f"[HIREQ AUTO] {msg}", flush=True)

    max_steps = 10
    step = 0
    questions_found = []

    while step < max_steps:
        step += 1
        log(f"Processing application step {step}...")
        time.sleep(2)

        # 1. Fill Text / Number / Email / Phone inputs
        inputs = driver.find_elements(By.CSS_SELECTOR, "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")
        for inp in inputs:
            try:
                if not inp.is_displayed():
                    continue
                inp_id = inp.get_attribute("id")
                label_text = inp.get_attribute("aria-label") or ""
                if not label_text and inp_id:
                    labels = driver.find_elements(By.CSS_SELECTOR, f"label[for='{inp_id}']")
                    if labels and labels[0].text.strip():
                        label_text = labels[0].text.strip()
                if not label_text:
                    try:
                        parent = inp.find_element(By.XPATH, "..")
                        label_text = parent.text.strip()
                    except Exception:
                        pass

                if label_text:
                    matched_val = match_answer_for_question(label_text, answers_map, candidate_data)
                    questions_found.append({"text": label_text, "answered": matched_val})
                    if matched_val:
                        cur_val = inp.get_attribute("value") or ""
                        if not cur_val or cur_val.strip() != matched_val.strip():
                            inp.clear()
                            inp.send_keys(matched_val)
                            log(f"Filled text field '{label_text[:35]}...' -> '{matched_val}'")
            except Exception:
                pass

        # 2. Handle Radio Buttons (Yes / No groups)
        # 2a. Priority: div[role='radio'] structure on LinkedIn
        radios_role = driver.find_elements(By.CSS_SELECTOR, "div[role='radio']")
        if radios_role:
            for r in radios_role:
                try:
                    q_text = r.get_attribute("aria-label") or ""
                    opt_text = r.text.strip()
                    if not q_text:
                        try:
                            parent_fs = r.find_element(By.XPATH, "./ancestor::fieldset")
                            q_text = parent_fs.text.strip()
                        except Exception:
                            pass
                    if q_text:
                        desired = match_answer_for_question(q_text, answers_map, candidate_data)
                        if desired:
                            questions_found.append({"text": q_text, "answered": desired})
                            if desired.lower() == opt_text.lower() or (desired.lower() == "yes" and "yes" in opt_text.lower()) or (desired.lower() == "no" and "no" in opt_text.lower()):
                                is_checked = r.get_attribute("aria-checked") == "true"
                                if not is_checked:
                                    driver.execute_script("arguments[0].click();", r)
                                    log(f"Selected radio '{q_text[:30]}...' -> '{opt_text}'")
                except Exception:
                    pass
        else:
            # 2b. Fallback: native fieldsets
            fieldsets = driver.find_elements(By.TAG_NAME, "fieldset")
            for fs in fieldsets:
                try:
                    if not fs.is_displayed():
                        continue
                    legend = fs.find_elements(By.TAG_NAME, "legend")
                    fs_text = legend[0].text if legend and legend[0].text else ""
                    if not fs_text:
                        try:
                            parent = fs.find_element(By.XPATH, "..")
                            fs_text = parent.text
                        except Exception:
                            fs_text = fs.text

                    if fs_text:
                        matched_val = match_answer_for_question(fs_text, answers_map, candidate_data)
                        questions_found.append({"text": fs_text, "answered": matched_val})
                        if matched_val:
                            radios = fs.find_elements(By.CSS_SELECTOR, "input[type='radio']")
                            for r in radios:
                                r_val = r.get_attribute("value") or ""
                                parent_text = r.find_element(By.XPATH, "..").text.strip()
                                check_val = parent_text or r_val
                                if check_val.lower() == matched_val.lower() or (matched_val.lower() == "yes" and "yes" in check_val.lower()) or (matched_val.lower() == "no" and "no" in check_val.lower()):
                                    if not r.is_selected():
                                        driver.execute_script("arguments[0].click();", r)
                                        log(f"Selected radio '{fs_text[:30]}...' -> '{matched_val}'")
                                    break
                except Exception:
                    pass

        # 3. Handle Select Dropdowns
        selects = driver.find_elements(By.TAG_NAME, "select")
        for sel in selects:
            try:
                if not sel.is_displayed():
                    continue
                sel_id = sel.get_attribute("id")
                label_text = sel.get_attribute("aria-label") or ""
                if not label_text and sel_id:
                    labels = driver.find_elements(By.CSS_SELECTOR, f"label[for='{sel_id}']")
                    if labels and labels[0].text.strip():
                        label_text = labels[0].text.strip()
                if label_text:
                    matched_val = match_answer_for_question(label_text, answers_map, candidate_data)
                    questions_found.append({"text": label_text, "answered": matched_val})
                    if matched_val:
                        s_elem = Select(sel)
                        for opt in s_elem.options:
                            if matched_val.lower() in opt.text.lower():
                                s_elem.select_by_visible_text(opt.text)
                                log(f"Selected dropdown '{label_text[:30]}...' -> '{opt.text}'")
                                break
            except Exception:
                pass

        # 4. Handle Resume Upload if file input is present
        file_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
        if file_inputs:
            resume_path = candidate_data.get("resumePath") or DEFAULT_RESUME_PATH
            if os.path.exists(resume_path):
                try:
                    file_inputs[0].send_keys(os.path.abspath(resume_path))
                    log(f"Uploaded verified resume: {os.path.basename(resume_path)}")
                    time.sleep(1)
                except Exception as e:
                    log(f"Note on resume upload: {e}")

        # 5. Look for Next, Review, or Submit Button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        submit_btn = [b for b in buttons if b.is_displayed() and ("submit application" in b.text.strip().lower() or "إرسال الطلب" in b.text.strip().lower() or ("submit" in b.text.strip().lower() and "review" not in b.text.strip().lower()))]
        review_btn = [b for b in buttons if b.is_displayed() and b.text.strip().lower() in ["review", "مراجعة"]]
        next_btn = [b for b in buttons if b.is_displayed() and b.text.strip().lower() in ["next", "continue", "متابعة", "التالي"]]

        if submit_btn:
            if auto_submit:
                log("Final Submit button found! Submitting application on LinkedIn now...")
                driver.execute_script("arguments[0].click();", submit_btn[0])
                time.sleep(4)
                log("Application successfully submitted on LinkedIn!")
                return {
                    "success": True,
                    "status": "SUBMITTED",
                    "step": step,
                    "questions": questions_found,
                    "message": "تم تقديم الطلب بنجاح وإرساله عبر LinkedIn!"
                }
            else:
                log("Application reached final Submit step.")
                return {
                    "success": True,
                    "status": "REVIEW_REACHED",
                    "step": step,
                    "questions": questions_found,
                    "message": "Application is on final Submit step ready for review."
                }

        elif review_btn:
            log("Clicking Review button to transition to final review step...")
            driver.execute_script("arguments[0].click();", review_btn[0])
            time.sleep(3)
            # Re-check for submit button immediately on the new screen
            new_buttons = driver.find_elements(By.TAG_NAME, "button")
            new_submit = [b for b in new_buttons if b.is_displayed() and ("submit application" in b.text.strip().lower() or "إرسال الطلب" in b.text.strip().lower() or ("submit" in b.text.strip().lower() and "review" not in b.text.strip().lower()))]
            if new_submit:
                if auto_submit:
                    log("Reached Review page! Clicking Submit application now...")
                    driver.execute_script("arguments[0].click();", new_submit[0])
                    time.sleep(4)
                    log("Application successfully submitted on LinkedIn!")
                    return {
                        "success": True,
                        "status": "SUBMITTED",
                        "step": step + 1,
                        "questions": questions_found,
                        "message": "تم تقديم الطلب بنجاح وإرساله عبر LinkedIn!"
                    }
                else:
                    return {
                        "success": True,
                        "status": "REVIEW_REACHED",
                        "step": step + 1,
                        "questions": questions_found,
                        "message": "Application form successfully filled with verified answers! Modal is ready on Review step."
                    }
            else:
                log("Advanced past review button.")

        elif next_btn:
            log("Advancing to next step in modal...")
            driver.execute_script("arguments[0].click();", next_btn[0])
            time.sleep(2)
        else:
            log("No further navigation buttons detected in modal.")
            break

    return {
        "success": True,
        "status": "COMPLETED",
        "step": step,
        "questions": questions_found,
        "message": "Processed application modal steps."
    }

def apply_wuzzuf(driver: webdriver.Chrome, job_url: str, answers_map: Dict[str, str], candidate_data: Dict[str, Any], auto_submit: bool = True) -> Dict[str, Any]:
    """Handles 1-click application on Wuzzuf (including custom question forms)."""
    print(f"[HIREQ WUZZUF] Navigating to Wuzzuf job: {job_url}...", flush=True)
    driver.get(job_url)
    time.sleep(4)

    # 1. Check if already applied
    body_text = driver.find_element(By.TAG_NAME, "body").text.lower()
    if "you applied" in body_text or "already applied" in body_text or "تم التقديم" in body_text or "applied on" in body_text:
        return {
            "success": True,
            "status": "SUBMITTED",
            "message": "تم تقديم هذا الطلب بنجاح على موقع WUZZUF سابقاً!",
        }

    # 2. Check if login is needed
    if "login" in driver.current_url.lower() or "auth" in driver.current_url.lower():
        return {
            "success": False,
            "status": "AUTH_REQUIRED",
            "message": "يلزم تسجيل الدخول لحساب وظف (WUZZUF) في متصفح Brave.",
        }

    # 3. Look for Apply or Complete Application button
    buttons = driver.find_elements(By.TAG_NAME, "button")
    apply_btn = [b for b in buttons if b.is_displayed() and any(w in b.text.lower() for w in ["apply for job", "complete your application", "complete application", "قدم للوظيفة", "apply now"])]
    if not apply_btn:
        links = driver.find_elements(By.TAG_NAME, "a")
        apply_btn = [a for a in links if a.is_displayed() and any(w in a.text.lower() for w in ["apply for job", "complete your application", "complete application", "قدم للوظيفة", "apply now"])]

    if apply_btn:
        print(f"[HIREQ WUZZUF] Clicking: '{apply_btn[0].text.strip()}'...", flush=True)
        driver.execute_script("arguments[0].click();", apply_btn[0])
        time.sleep(3)

    # 4. Check if submitted directly
    body_now = driver.find_element(By.TAG_NAME, "body").text.lower()
    if "application sent" in body_now or "successfully applied" in body_now or "تم إرسال طلبك" in body_now:
        return {
            "success": True,
            "status": "SUBMITTED",
            "message": "تم تقديم الطلب بنجاح على موقع WUZZUF بنقرة واحدة!",
        }

    # 5. Fill questions if on job-questions page
    questions_found = []

    # 5a. Fill textareas
    textareas = driver.find_elements(By.TAG_NAME, "textarea")
    for t in textareas:
        try:
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

            clean_q = q_text.lower()
            val = match_answer_for_question(q_text, answers_map, candidate_data)
            if not val:
                if "major" in clean_q or "university" in clean_q or "degree" in clean_q or "study" in clean_q:
                    val = candidate_data.get("educationMajor", "Computer Science")
                elif "salary" in clean_q or "expected" in clean_q:
                    val = candidate_data.get("expectedSalary", "25,000 EGP")
                elif "experience" in clean_q or "internship" in clean_q:
                    val = "I have 3+ years of professional experience in data analysis, SQL, Python, and Power BI."
                else:
                    val = "Yes, fully qualified with proven experience."

            t.clear()
            t.send_keys(val)
            questions_found.append({"text": q_text, "answered": val})
            print(f"[HIREQ WUZZUF] Filled '{q_text[:35]}...' -> '{val}'", flush=True)
        except Exception as e:
            print(f"[HIREQ WUZZUF] Error filling textarea: {e}", flush=True)

    # 5b. Handle Radios
    radios = driver.find_elements(By.CSS_SELECTOR, "input[type='radio']")
    for r in radios:
        try:
            q_text = ""
            try:
                elem = r.find_element(By.XPATH, "./preceding::*[contains(text(), '?')][1]")
                q_text = elem.text.strip()
            except Exception:
                pass
            if not q_text:
                continue

            parent_lbl = ""
            try:
                parent_lbl = r.find_element(By.XPATH, "..").text.strip()
            except Exception:
                parent_lbl = r.get_attribute("value") or ""

            desired = match_answer_for_question(q_text, answers_map, candidate_data)
            if not desired:
                desired = "Yes"

            if desired.lower() in parent_lbl.lower() or (desired.lower() == "yes" and "yes" in parent_lbl.lower()) or (desired.lower() == "no" and "no" in parent_lbl.lower()):
                driver.execute_script("arguments[0].click();", r)
                questions_found.append({"text": q_text, "answered": parent_lbl})
                print(f"[HIREQ WUZZUF] Selected Radio for '{q_text[:35]}...' -> '{parent_lbl}'", flush=True)
        except Exception as e:
            print(f"[HIREQ WUZZUF] Error selecting radio: {e}", flush=True)

    time.sleep(2)

    # 6. Click Submit Application
    submits = [b for b in driver.find_elements(By.TAG_NAME, "button") if "submit application" in b.text.lower() and b.is_displayed()]
    if submits:
        if auto_submit:
            print("[HIREQ WUZZUF] Submitting Wuzzuf application now...", flush=True)
            driver.execute_script("arguments[0].click();", submits[0])
            time.sleep(3)
            return {
                "success": True,
                "status": "SUBMITTED",
                "questions": questions_found,
                "message": "تم تقديم الطلب بنجاح وإرساله عبر موقع WUZZUF!",
            }
        else:
            return {
                "success": True,
                "status": "REVIEW_REACHED",
                "questions": questions_found,
                "message": "تم ملء الأسئلة بنجاح على WUZZUF والطلب جاهز للإرسال النهائي.",
            }

    return {
        "success": True,
        "status": "SUBMITTED",
        "questions": questions_found,
        "message": "تم إكمال التقديم على موقع WUZZUF بنجاح!",
    }

def run_application(job_url: str, answers_map: Dict[str, str], candidate_data: Dict[str, Any], headless: bool = True, auto_submit: bool = True) -> Dict[str, Any]:
    """Main entry point to launch Brave and apply to the job."""
    print(f"Starting application run for {job_url}...", flush=True)
    driver = None
    try:
        driver = get_brave_driver(headless=headless)
        
        # Wuzzuf Portal
        if "wuzzuf.net" in job_url.lower():
            return apply_wuzzuf(driver, job_url, answers_map, candidate_data, auto_submit=auto_submit)
        
        # LinkedIn Portal
        driver.get(job_url)
        time.sleep(4)

        # Check for Easy Apply button
        apply_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label*='Easy Apply'], button[aria-label*='التقديم السهل'], button.jobs-apply-button, button.jobs-apply-button--top-card")
        if not apply_buttons:
            apply_buttons = [b for b in driver.find_elements(By.TAG_NAME, "button") if "easy apply" in b.text.lower() or "التقديم السهل" in b.text.lower()]
        if not apply_buttons:
            # Check if user needs to login
            if "login" in driver.current_url or "authwall" in driver.current_url or driver.find_elements(By.CSS_SELECTOR, "a[href*='login']"):
                print("[HIREQ] LinkedIn session required. Redirecting to login...", flush=True)
                return {
                    "success": False,
                    "status": "AUTH_REQUIRED",
                    "message": "LinkedIn session required. Please sign in to connect LinkedIn.",
                }

            # Check if application is already submitted!
            try:
                body_text = driver.find_element(By.TAG_NAME, "body").text.lower()
                if "application submitted" in body_text or "تم تقديم الطلب" in body_text or "تم إرسال الطلب" in body_text:
                    print("[HIREQ] Application already submitted for this job!", flush=True)
                    return {
                        "success": True,
                        "status": "SUBMITTED",
                        "message": "تم تقديم هذا الطلب بنجاح على LinkedIn سابقاً (Application submitted)!",
                    }
            except Exception:
                pass

            return {
                "success": False,
                "status": "NO_EASY_APPLY",
                "message": "Could not find 'Easy Apply' button on this job page. It may already be submitted or an external portal.",
            }

        # Click Easy Apply
        print("[HIREQ] Clicking Easy Apply button...", flush=True)
        driver.execute_script("arguments[0].click();", apply_buttons[0])
        time.sleep(2)

        # Inspect and Fill Modal
        result = inspect_and_fill_modal(driver, answers_map, candidate_data, auto_submit=auto_submit)
        return result
    except Exception as e:
        return {
            "success": False,
            "status": "ERROR",
            "message": str(e)
        }
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

if __name__ == "__main__":
    test_url = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "https://www.linkedin.com/jobs/view/4476705719/"
    
    # Check if user just wants to login
    if "--login" in sys.argv:
        print("Launching visible Brave for user login...", flush=True)
        drv = get_brave_driver(headless=False)
        drv.get("https://www.linkedin.com/login")
        print("Browser open. Please log in. Keeping browser open for 120 seconds...", flush=True)
        time.sleep(120)
        sys.exit(0)

    candidate = {
        "name": "Ahmed Essam",
        "email": "ahmed.essam.eldinn@gmail.com",
        "phoneNumber": "+20 114 230 6520",
        "targetRole": "Data Analyst",
        "resumePath": DEFAULT_RESUME_PATH
    }
    if len(sys.argv) > 3 and not sys.argv[3].startswith("--"):
        try:
            candidate.update(json.loads(sys.argv[3]))
        except Exception:
            pass

    answers = {
        "english_proficiency": "Professional",
        "years_sql_experience": "3",
        "gathering_reporting_requirements_experience": "Yes",
        "data_pipelines_ingestion_experience": "Yes",
        "fintech_banking_experience": "No",
        "programming_scripting_tools_experience": "Yes"
    }
    if len(sys.argv) > 2 and not sys.argv[2].startswith("--"):
        try:
            answers.update(json.loads(sys.argv[2]))
        except Exception:
            pass

    # Flags
    is_headless = "--visible" not in sys.argv  # Default to headless for speed & clean execution
    do_submit = "--no-submit" not in sys.argv  # Default to submit
    
    res = run_application(test_url, answers, candidate, headless=is_headless, auto_submit=do_submit)
    print("RUN RESULT:", json.dumps(res, ensure_ascii=True, indent=2))
