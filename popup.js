// popup.js - handles the scan button click in the extension popup

// grab the button and status elements from the DOM
const scanBtn = document.getElementById("scan-btn");
const statusMsg = document.getElementById("status-msg");

// when user clicks the scan button
scanBtn.addEventListener("click", async () => {
  // disable button so they dont click twice
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning...";
  statusMsg.textContent = "";
  statusMsg.className = "";

  try {
    // get the current active tab
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let tab = tabs[0];

    if (!tab || !tab.id) {
      throw new Error("Couldn't find the active tab");
    }

    // cant run on chrome:// pages
    if (tab.url && tab.url.startsWith("chrome://")) {
      throw new Error("Can't scan chrome:// pages, try a regular website");
    }

    console.log("Injecting content script into tab:", tab.id);

    // inject the content script into the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    // show success message
    statusMsg.textContent = "Done! Check the page for the audit report.";
    statusMsg.className = "success";

  } catch (err) {
    console.error("Error running audit:", err);
    statusMsg.textContent = "Error: " + err.message;
    statusMsg.className = "error";
  }

  // re-enable the button
  scanBtn.disabled = false;
  scanBtn.textContent = "Run Audit";
});
