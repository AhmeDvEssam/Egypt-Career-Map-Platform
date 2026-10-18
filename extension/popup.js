document.addEventListener("DOMContentLoaded", async () => {
  const triggerBtn = document.getElementById("trigger-fill");

  // Fetch status from localhost:3005
  try {
    const res = await fetch("http://localhost:3005/api/profile");
    if (res.ok) {
      const data = await res.json();
      if (data.user?.name) {
        document.getElementById("user-name").innerText = data.user.name;
      }
    }
  } catch (_) {}

  triggerBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const btn = document.getElementById("hireq-fill-btn");
            if (btn) btn.click();
            else alert("HireQ Assistant is loaded. Click the floating '⚡ HireQ Auto-Fill' button on this page.");
          },
        });
      }
    });
  });
});
