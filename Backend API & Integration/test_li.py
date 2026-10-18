import sys
import time
from extract_questions import get_fast_driver, By

driver = get_fast_driver()
urls = [
    "https://www.linkedin.com/jobs/view/4476705719/",
    "https://www.linkedin.com/jobs/view/4479820248/",
    "https://www.linkedin.com/jobs/view/4480530032/"
]
try:
    for u in urls:
        driver.get(u)
        time.sleep(3)
        btns = driver.find_elements(By.CSS_SELECTOR, "button[aria-label*='Easy Apply'], button[aria-label*='التقديم السهل'], button.jobs-apply-button")
        body = driver.find_element(By.TAG_NAME, "body").text.lower()
        applied = "application submitted" in body or "already applied" in body
        print(f"URL: {u}\n  Easy Apply buttons: {len(btns)}, Already applied: {applied}\n  Title: {driver.title}")
finally:
    driver.quit()
