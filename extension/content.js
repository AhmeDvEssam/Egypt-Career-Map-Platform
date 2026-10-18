/**
 * HireQ Universal ATS & LinkedIn Live Application Mirror (v3.0.0)
 * 100% Dynamic Question Detection • 2-Way Sync with HireQ Vault • 0 Hardcoding
 */

(function () {
  console.log("HireQ Universal Application Mirror initialized on page:", window.location.href);

  // 1. Inject Floating Mirror Control & Modal Container
  const container = document.createElement("div");
  container.id = "hireq-mirror-container";
  container.innerHTML = `
    <!-- Floating Mirror Button -->
    <div id="hireq-mirror-pill" style="
      position: fixed;
      bottom: 85px;
      right: 28px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <button id="hireq-mirror-toggle-btn" style="
        background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
        color: #ffffff;
        border: 2px solid rgba(255,255,255,0.2);
        padding: 12px 20px;
        border-radius: 9999px;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(2, 132, 199, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: transform 0.2s, box-shadow 0.2s;
      ">
        <span style="font-size: 18px;">⚡</span>
        <span id="hireq-btn-label">HireQ Live Mirror</span>
        <span id="hireq-q-count-badge" style="
          background: rgba(255,255,255,0.25);
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 11px;
        ">Ready</span>
      </button>

      <!-- Toast Notification -->
      <div id="hireq-toast" style="
        display: none;
        margin-top: 10px;
        background: #0f172a;
        color: #38bdf8;
        border: 1px solid #0284c7;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        max-width: 320px;
        line-height: 1.4;
      "></div>
    </div>

    <!-- Live Application Mirror Inspection Panel -->
    <div id="hireq-mirror-panel" style="
      display: none;
      position: fixed;
      bottom: 145px;
      right: 28px;
      width: 420px;
      max-height: 75vh;
      background: #0b1120;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(14, 165, 233, 0.2);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    ">
      <!-- Panel Header -->
      <div style="
        padding: 14px 18px;
        background: linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(13, 148, 136, 0.15) 100%);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🪞</span>
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #38bdf8;">Live Application Mirror</div>
            <div id="hireq-panel-subtitle" style="font-size: 11px; color: #94a3b8;">Scanning application form...</div>
          </div>
        </div>
        <button id="hireq-panel-close-btn" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        ">✕</button>
      </div>

      <!-- Panel Questions List -->
      <div id="hireq-panel-body" style="
        padding: 16px;
        overflow-y: auto;
        flex: 1;
        max-height: 50vh;
        display: flex;
        flex-direction: column;
        gap: 12px;
      ">
        <div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 20px;">
          Open an application form or click Easy Apply to inspect live questions.
        </div>
      </div>

      <!-- Panel Footer Actions -->
      <div style="
        padding: 12px 16px;
        background: #070d17;
        border-top: 1px solid rgba(255,255,255,0.08);
        display: flex;
        gap: 10px;
      ">
        <button id="hireq-scan-btn" style="
          flex: 1;
          padding: 9px;
          background: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        ">🔍 Rescan Form</button>

        <button id="hireq-autofill-btn" style="
          flex: 2;
          padding: 9px;
          background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
          border: none;
          color: white;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
        ">⚡ Auto-Fill into Form</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // Initial state: hide panel
  const panel = document.getElementById("hireq-mirror-panel");
  panel.style.display = "none";

  const toggleBtn = document.getElementById("hireq-mirror-toggle-btn");
  const closeBtn = document.getElementById("hireq-panel-close-btn");
  const scanBtn = document.getElementById("hireq-scan-btn");
  const autofillBtn = document.getElementById("hireq-autofill-btn");
  const toast = document.getElementById("hireq-toast");
  const countBadge = document.getElementById("hireq-q-count-badge");
  const panelSubtitle = document.getElementById("hireq-panel-subtitle");
  const panelBody = document.getElementById("hireq-panel-body");

  function showToast(msg, isSuccess = true, duration = 4000) {
    if (!toast) return;
    toast.style.display = "block";
    toast.style.color = isSuccess ? "#34d399" : "#f87171";
    toast.innerHTML = msg;
    setTimeout(() => {
      toast.style.display = "none";
    }, duration);
  }

  toggleBtn?.addEventListener("click", () => {
    if (panel.style.display === "none") {
      panel.style.display = "flex";
      scanAndSyncQuestions();
    } else {
      panel.style.display = "none";
    }
  });

  closeBtn?.addEventListener("click", () => {
    panel.style.display = "none";
  });

  scanBtn?.addEventListener("click", () => {
    scanAndSyncQuestions();
  });

  autofillBtn?.addEventListener("click", async () => {
    await applyAnswersToPage();
  });

  // Watch for Easy Apply modal popping up
  const observer = new MutationObserver(() => {
    const modal = document.querySelector(".jobs-easy-apply-modal, div[data-test-modal], .jobs-easy-apply-content");
    if (modal && !modal.dataset.hireqDetected) {
      modal.dataset.hireqDetected = "true";
      countBadge.innerText = "Modal Active";
      countBadge.style.background = "#059669";
      showToast("⚡ Application Form Detected!<br>Opening Live Mirror...", true, 3000);
      panel.style.display = "flex";
      setTimeout(scanAndSyncQuestions, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Store scanned question metadata
  let currentScannedQuestions = [];

  /**
   * 1. Dynamic DOM Question Scraper (Extracts real questions from ANY portal)
   */
  function scrapePageQuestions() {
    const questions = [];
    const modal = document.querySelector(".jobs-easy-apply-modal, div[data-test-modal], .jobs-easy-apply-content, form") || document.body;

    // A. Fieldsets & Question groupings
    const blocks = modal.querySelectorAll("fieldset, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element, .jobs-easy-apply-form-element, .form-group");

    blocks.forEach((block, idx) => {
      const legend = block.querySelector("legend, label, .fb-dash-form-element__label, .artdeco-text-input--label");
      let text = (legend ? legend.innerText : block.innerText || "").trim();
      text = text.replace(/\*/g, "").replace(/\s+/g, " ").trim();
      if (!text || text.length < 3 || text.length > 250) return;

      // Dropdown
      const select = block.querySelector("select");
      if (select) {
        const options = Array.from(select.options).map((o) => o.text.trim()).filter(Boolean);
        questions.push({
          id: select.id || `select_${idx}`,
          domSelector: select.id ? `#${select.id}` : null,
          text: text,
          type: "select",
          options: options,
          currentValue: select.options[select.selectedIndex]?.text || "",
          element: select,
        });
        return;
      }

      // Radios
      const radios = block.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) {
        const options = [];
        let checkedVal = "";
        radios.forEach((r) => {
          const rLabel = (r.closest("label")?.innerText || r.value || "").trim();
          if (rLabel) options.push(rLabel);
          if (r.checked) checkedVal = rLabel;
        });

        questions.push({
          id: radios[0].name || `radio_${idx}`,
          text: text,
          type: "radio",
          options: options.length > 0 ? options : ["Yes", "No"],
          currentValue: checkedVal,
          elements: Array.from(radios),
        });
        return;
      }

      // Text / Number Input
      const input = block.querySelector('input[type="text"], input[type="number"], textarea');
      if (input) {
        const isNum = input.type === "number" || text.toLowerCase().includes("how many") || text.toLowerCase().includes("years");
        questions.push({
          id: input.id || input.name || `input_${idx}`,
          text: text,
          type: isNum ? "number" : "text",
          options: [],
          currentValue: input.value || "",
          element: input,
        });
      }
    });

    return questions;
  }

  /**
   * 2. Scan and Sync with HireQ Backend (/api/profile/mirror)
   */
  async function scanAndSyncQuestions() {
    panelSubtitle.innerText = "Extracting live questions...";
    const rawQuestions = scrapePageQuestions();

    if (rawQuestions.length === 0) {
      panelBody.innerHTML = `
        <div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 25px;">
          No screening questions detected on this current step.<br><br>
          If on LinkedIn, click <strong>Easy Apply</strong> first!
        </div>
      `;
      countBadge.innerText = "0 Found";
      panelSubtitle.innerText = "No active application form found";
      return;
    }

    currentScannedQuestions = rawQuestions;
    countBadge.innerText = `${rawQuestions.length} Found`;
    panelSubtitle.innerText = `Analyzing ${rawQuestions.length} questions against your CV...`;

    try {
      // Send extracted questions to HireQ backend for smart matching
      const res = await fetch("http://localhost:3005/api/profile/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUrl: window.location.href,
          jobTitle: document.title || "Target Job Opening",
          source: window.location.hostname.includes("linkedin") ? "LinkedIn" : "ATS",
          questions: rawQuestions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.options,
            currentValue: q.currentValue,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to analyze questions");

      const sessionQuestions = data.session?.questions || [];
      renderMirrorPanelQuestions(sessionQuestions);
      panelSubtitle.innerText = `Live Mirror: ${data.stats.answered}/${data.stats.total} Answered`;
    } catch (err) {
      console.error("Mirror sync error:", err);
      // Fallback: render without backend
      renderMirrorPanelQuestions(rawQuestions.map((q) => ({
        ...q,
        suggestedAnswer: q.currentValue || (q.type === "radio" ? "Yes" : q.type === "number" ? "3" : ""),
        status: q.currentValue ? "ANSWERED" : "NEEDS_INPUT",
      })));
      panelSubtitle.innerText = `${rawQuestions.length} questions detected (Offline mode)`;
    }
  }

  /**
   * 3. Render Questions inside In-Page Mirror Panel
   */
  function renderMirrorPanelQuestions(annotated) {
    panelBody.innerHTML = "";

    annotated.forEach((q, idx) => {
      const card = document.createElement("div");
      card.style.cssText = `
        background: #131d31;
        border: 1px solid ${q.status === "ANSWERED" ? "rgba(52, 211, 153, 0.3)" : "rgba(245, 158, 11, 0.4)"};
        border-radius: 12px;
        padding: 12px;
      `;

      const statusBadge = q.status === "ANSWERED"
        ? `<span style="background: rgba(52, 211, 153, 0.15); color: #34d399; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">✓ Matched</span>`
        : `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">⚠️ Needs Answer</span>`;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
          <div style="font-size: 12px; font-weight: 700; color: #f1f5f9; line-height: 1.3;">${q.text}</div>
          ${statusBadge}
        </div>
        <div class="hireq-input-wrap"></div>
      `;

      const inputWrap = card.querySelector(".hireq-input-wrap");

      // Dynamic control depending on question type
      if (q.type === "select" && q.options?.length > 0) {
        const select = document.createElement("select");
        select.style.cssText = "width: 100%; background: #0b1120; border: 1px solid #334155; color: #38bdf8; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; outline: none;";
        q.options.forEach((opt) => {
          const optEl = document.createElement("option");
          optEl.value = opt;
          optEl.innerText = opt;
          if (q.suggestedAnswer?.toLowerCase() === opt.toLowerCase()) optEl.selected = true;
          select.appendChild(optEl);
        });
        select.addEventListener("change", (e) => saveAnswerToVault(q.text, e.target.value));
        inputWrap.appendChild(select);
      } else if (q.type === "radio" && q.options?.length > 0) {
        const radioGroup = document.createElement("div");
        radioGroup.style.cssText = "display: flex; gap: 8px;";
        q.options.forEach((opt) => {
          const btn = document.createElement("button");
          const isSelected = q.suggestedAnswer?.toLowerCase() === opt.toLowerCase();
          btn.innerText = opt;
          btn.style.cssText = `
            flex: 1; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;
            background: ${isSelected ? "#0284c7" : "#0b1120"};
            color: ${isSelected ? "#ffffff" : "#94a3b8"};
            border: 1px solid ${isSelected ? "#38bdf8" : "#334155"};
          `;
          btn.addEventListener("click", () => {
            q.suggestedAnswer = opt;
            saveAnswerToVault(q.text, opt);
            renderMirrorPanelQuestions(annotated);
          });
          radioGroup.appendChild(btn);
        });
        inputWrap.appendChild(radioGroup);
      } else {
        const input = document.createElement("input");
        input.type = q.type === "number" ? "number" : "text";
        input.value = q.suggestedAnswer || "";
        input.placeholder = "Type answer here...";
        input.style.cssText = "width: 100%; background: #0b1120; border: 1px solid #334155; color: #38bdf8; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; outline: none; box-sizing: border-box;";
        input.addEventListener("change", (e) => saveAnswerToVault(q.text, e.target.value));
        inputWrap.appendChild(input);
      }

      panelBody.appendChild(card);
    });
  }

  /**
   * 4. Save question answer to HireQ Question Bank in DB
   */
  async function saveAnswerToVault(questionText, answerVal) {
    try {
      await fetch("http://localhost:3005/api/profile/mirror", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: questionText,
          answerValue: answerVal,
        }),
      });
      showToast(`✓ Saved "${answerVal}" to Question Bank!`, true, 2000);
    } catch (_) {}
  }

  /**
   * 5. Fill Answers into the Real Page Elements & Advance Safely
   */
  async function applyAnswersToPage() {
    autofillBtn.innerText = "⏳ Filling Form...";
    let filled = 0;

    const modal = document.querySelector(".jobs-easy-apply-modal, div[data-test-modal], .jobs-easy-apply-content") || document.body;

    // A. Auto-pick resume if present
    const resumeRadios = modal.querySelectorAll('input[type="radio"][name*="resume" i], .jobs-resume-picker__resume-list input[type="radio"]');
    if (resumeRadios.length > 0) {
      let isAnyChecked = Array.from(resumeRadios).some((r) => r.checked);
      if (!isAnyChecked) {
        resumeRadios[0].checked = true;
        resumeRadios[0].click();
        resumeRadios[0].dispatchEvent(new Event("change", { bubbles: true }));
        filled++;
      }
    }

    // B. Fetch updated session questions
    let sessionQuestions = [];
    try {
      const res = await fetch("http://localhost:3005/api/profile/mirror");
      const data = await res.json();
      sessionQuestions = data.session?.questions || [];
    } catch (_) {}

    // C. Fill inputs
    currentScannedQuestions.forEach((item) => {
      const matched = sessionQuestions.find((sq) => sq.text.toLowerCase().trim() === item.text.toLowerCase().trim());
      const valToSet = matched?.suggestedAnswer || item.currentValue;
      if (!valToSet) return;

      if (item.type === "select" && item.element) {
        const sel = item.element;
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.toLowerCase().includes(valToSet.toLowerCase())) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            sel.style.border = "2px solid #34d399";
            filled++;
            break;
          }
        }
      } else if (item.type === "radio" && item.elements) {
        item.elements.forEach((r) => {
          const rLabel = (r.closest("label")?.innerText || r.value || "").toLowerCase();
          if (rLabel.includes(valToSet.toLowerCase())) {
            r.checked = true;
            r.click();
            r.dispatchEvent(new Event("change", { bubbles: true }));
            filled++;
          }
        });
      } else if (item.element) {
        item.element.value = valToSet;
        item.element.dispatchEvent(new Event("input", { bubbles: true }));
        item.element.dispatchEvent(new Event("change", { bubbles: true }));
        item.element.style.border = "2px solid #34d399";
        filled++;
      }
    });

    showToast(`✓ Successfully filled ${filled} fields!`, true, 3000);
    autofillBtn.innerHTML = `<span>⚡</span><span>Auto-Fill into Form</span>`;

    // D. Safe Step Navigation
    const footerButtons = Array.from(modal.querySelectorAll("footer button, .jobs-easy-apply-modal__footer button, button[aria-label]"));
    const nextBtn = footerButtons.find((b) => {
      const txt = (b.innerText || b.getAttribute("aria-label") || "").toLowerCase();
      return txt.includes("next") || txt.includes("continue");
    });
    const reviewBtn = footerButtons.find((b) => {
      const txt = (b.innerText || b.getAttribute("aria-label") || "").toLowerCase();
      return txt.includes("review");
    });
    const submitBtn = footerButtons.find((b) => {
      const txt = (b.innerText || b.getAttribute("aria-label") || "").toLowerCase();
      return txt.includes("submit application") || txt.includes("submit");
    });

    if (submitBtn) {
      submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      submitBtn.style.outline = "4px solid #34d399";
      submitBtn.style.boxShadow = "0 0 25px rgba(52, 211, 153, 0.7)";
      showToast("🎉 <strong>All Questions Complete!</strong><br>Review the answers and click <em>Submit Application</em> to finish.", true, 10000);
      return;
    }

    if (reviewBtn) {
      showToast("Advancing to Review screen...", true, 2000);
      setTimeout(() => {
        reviewBtn.click();
        setTimeout(scanAndSyncQuestions, 1000);
      }, 700);
      return;
    }

    if (nextBtn) {
      showToast("Advancing to Next step...", true, 2000);
      setTimeout(() => {
        nextBtn.click();
        setTimeout(scanAndSyncQuestions, 1000);
      }, 700);
      return;
    }
  }
})();
