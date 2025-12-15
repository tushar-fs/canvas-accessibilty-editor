// content.js
// This is the main content script that gets injected into the page.
// It scans the DOM for accessibility issues and then shows a report panel.

(function() {

  // if the panel already exists from a previous scan, remove it first
  var oldPanel = document.getElementById("a11y-panel");
  if (oldPanel) {
    oldPanel.remove();
  }

  // also remove old styles if they exist
  var oldStyle = document.getElementById("a11y-panel-styles");
  if (oldStyle) {
    oldStyle.remove();
  }

  console.log("=== Canvas Accessibility Auditor: Starting scan ===");


  // -------------------------------------------------------
  // SCAN 1: Check for images missing alt text
  // -------------------------------------------------------
  function checkAltText() {
    var results = [];
    // get all img tags on the page
    var images = document.querySelectorAll("img");

    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      var altValue = img.getAttribute("alt");

      // if there is no alt attribute, or if its empty/just spaces
      if (altValue === null || altValue.trim() === "") {
        results.push({
          element: img,
          src: img.src || "(no src)"
        });
      }
    }

    console.log("Alt text issues found:", results.length);
    return results;
  }


  // -------------------------------------------------------
  // SCAN 2: Check heading hierarchy (h1 -> h2 -> h3 etc)
  // Skipping a level like h1 -> h3 is a WCAG violation
  // -------------------------------------------------------
  function checkHeadings() {
    var results = [];
    var headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    var lastLevel = 0;

    for (var i = 0; i < headings.length; i++) {
      // get the heading level number from tag name (e.g. "H3" -> 3)
      var level = parseInt(headings[i].tagName.charAt(1));

      // if we skipped a level (like going from h1 to h3)
      if (lastLevel !== 0 && level > lastLevel + 1) {
        results.push({
          element: headings[i],
          current: headings[i].tagName,
          previous: "H" + lastLevel
        });
      }

      lastLevel = level;
    }

    console.log("Heading issues found:", results.length);
    return results;
  }


  // -------------------------------------------------------
  // SCAN 3: Basic contrast check
  // This is a simplified version - just checks if text color
  // is too light on a light background. Not a full WCAG
  // contrast ratio calculation but good enough for a demo.
  // -------------------------------------------------------
  function checkContrast() {
    var results = [];
    // check common text elements
    var elements = document.querySelectorAll("p, span, a, li, td, th, label, div, h1, h2, h3, h4, h5, h6");

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      // skip hidden elements and empty ones
      if (el.offsetParent === null) continue;
      if (el.textContent.trim() === "") continue;

      var styles = window.getComputedStyle(el);
      var textColor = styles.color;
      var bgColor = getBackgroundColor(el);

      // calculate luminance for both colors
      var textLuminance = getLuminance(textColor);
      var bgLuminance = getLuminance(bgColor);

      // if text is very light (luminance > 0.7) and background is also very light (> 0.9),
      // thats probably a contrast issue
      if (textLuminance > 0.7 && bgLuminance > 0.9) {
        results.push({
          element: el,
          color: textColor,
          bg: bgColor
        });
      }
    }

    console.log("Contrast issues found:", results.length);
    return results;
  }


  // --- helper: parse rgb string into [r, g, b] values between 0 and 1 ---
  function parseRgb(colorStr) {
    var match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!match) {
      return [1, 1, 1]; // default to white if we cant parse it
    }
    return [
      parseInt(match[1]) / 255,
      parseInt(match[2]) / 255,
      parseInt(match[3]) / 255
    ];
  }

  // --- helper: calculate relative luminance (from WCAG formula) ---
  function getLuminance(colorStr) {
    var rgb = parseRgb(colorStr);
    // apply the sRGB transfer function
    var adjusted = rgb.map(function(val) {
      if (val <= 0.03928) {
        return val / 12.92;
      } else {
        return Math.pow((val + 0.055) / 1.055, 2.4);
      }
    });
    // weighted sum
    return 0.2126 * adjusted[0] + 0.7152 * adjusted[1] + 0.0722 * adjusted[2];
  }

  // --- helper: walk up the DOM tree to find the actual background color ---
  // sometimes elements have transparent backgrounds so we need to check parents
  function getBackgroundColor(el) {
    var current = el;
    while (current && current !== document.documentElement) {
      var bg = window.getComputedStyle(current).backgroundColor;
      // check if its not transparent
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        return bg;
      }
      current = current.parentElement;
    }
    // if nothing found, assume white
    return "rgb(255, 255, 255)";
  }


  // -------------------------------------------------------
  // RUN ALL THE SCANS
  // -------------------------------------------------------
  var altIssues = checkAltText();
  var headingIssues = checkHeadings();
  var contrastIssues = checkContrast();
  var totalIssues = altIssues.length + headingIssues.length + contrastIssues.length;

  console.log("Total issues found:", totalIssues);


  // -------------------------------------------------------
  // HELPER: highlight an element on the page when user
  // clicks on an issue in the report
  // -------------------------------------------------------
  function highlightElement(el) {
    // save the old styles so we can restore them
    var oldOutline = el.style.outline;
    var oldBg = el.style.backgroundColor;

    // add a red highlight
    el.style.outline = "3px solid red";
    el.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // remove the highlight after 2 seconds
    setTimeout(function() {
      el.style.outline = oldOutline;
      el.style.backgroundColor = oldBg;
    }, 2000);
  }

  // helper to shorten long strings
  function truncate(str, maxLen) {
    if (!maxLen) maxLen = 60;
    if (str.length > maxLen) {
      return str.substring(0, maxLen) + "...";
    }
    return str;
  }


  // -------------------------------------------------------
  // BUILD THE REPORT PANEL
  // -------------------------------------------------------

  // first inject the CSS styles for our panel
  var styleEl = document.createElement("style");
  styleEl.id = "a11y-panel-styles";
  styleEl.textContent = `
    #a11y-panel {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 999999;
      width: 380px;
      max-height: 90vh;
      overflow-y: auto;
      background: white;
      color: #333;
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }

    #a11y-panel * {
      box-sizing: border-box;
    }

    #a11y-panel .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      background: #f9f9f9;
      border-radius: 8px 8px 0 0;
    }

    #a11y-panel .panel-title {
      font-weight: bold;
      font-size: 14px;
    }

    #a11y-panel .issue-count {
      background: ${totalIssues > 0 ? '#e74c3c' : '#27ae60'};
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 8px;
    }

    #a11y-panel .close-btn {
      background: none;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      padding: 2px 8px;
      color: #666;
    }

    #a11y-panel .close-btn:hover {
      background: #eee;
    }

    #a11y-panel .panel-body {
      padding: 12px 16px;
    }

    #a11y-panel .section {
      margin-bottom: 16px;
    }

    #a11y-panel .section:last-child {
      margin-bottom: 0;
    }

    #a11y-panel .section-title {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }

    #a11y-panel .section-count {
      color: ${totalIssues > 0 ? '#e74c3c' : '#27ae60'};
      font-weight: bold;
    }

    #a11y-panel .issue-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    #a11y-panel .issue-list li {
      padding: 6px 8px;
      margin-bottom: 3px;
      background: #f8f8f8;
      border-left: 3px solid #e74c3c;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }

    #a11y-panel .issue-list li:hover {
      background: #f0f0f0;
    }

    #a11y-panel .advice-box {
      margin-top: 6px;
      padding: 8px 10px;
      background: #fff8e1;
      border-left: 3px solid #f39c12;
      border-radius: 3px;
      font-size: 12px;
    }

    #a11y-panel .pass-message {
      color: #27ae60;
      font-weight: bold;
      padding: 6px 0;
    }

    #a11y-panel .panel-footer {
      padding: 8px 16px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #999;
      text-align: center;
    }
  `;
  document.head.appendChild(styleEl);


  // now create the actual panel element
  var panel = document.createElement("div");
  panel.id = "a11y-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Accessibility Audit Report");
  panel.setAttribute("tabindex", "-1");


  // -- panel header --
  var header = document.createElement("div");
  header.className = "panel-header";

  var titleSpan = document.createElement("span");
  titleSpan.className = "panel-title";
  titleSpan.textContent = "Audit Report";

  var countBadge = document.createElement("span");
  countBadge.className = "issue-count";
  countBadge.textContent = totalIssues;

  titleSpan.appendChild(countBadge);

  var closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "Close audit report");
  closeBtn.addEventListener("click", function() {
    panel.remove();
  });

  header.appendChild(titleSpan);
  header.appendChild(closeBtn);
  panel.appendChild(header);


  // -- panel body --
  var body = document.createElement("div");
  body.className = "panel-body";


  // --- helper to create a section for each scan type ---
  function createSection(title, issues, formatIssueFn, adviceText) {
    var section = document.createElement("div");
    section.className = "section";
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", title);

    // section header with title and count
    var sectionTitle = document.createElement("div");
    sectionTitle.className = "section-title";

    var titleText = document.createElement("span");
    titleText.textContent = title;

    var countText = document.createElement("span");
    countText.className = "section-count";
    if (issues.length === 0) {
      countText.textContent = "Pass";
      countText.style.color = "#27ae60";
    } else {
      countText.textContent = issues.length + (issues.length === 1 ? " issue" : " issues");
    }

    sectionTitle.appendChild(titleText);
    sectionTitle.appendChild(countText);
    section.appendChild(sectionTitle);

    if (issues.length === 0) {
      // no issues - show a pass message
      var passMsg = document.createElement("div");
      passMsg.className = "pass-message";
      passMsg.textContent = "No issues found!";
      section.appendChild(passMsg);
    } else {
      // create a list of all the issues
      var list = document.createElement("ul");
      list.className = "issue-list";
      list.setAttribute("role", "list");

      for (var i = 0; i < issues.length; i++) {
        var li = document.createElement("li");
        li.setAttribute("tabindex", "0");
        li.setAttribute("role", "button");
        li.textContent = formatIssueFn(issues[i]);

        // use a closure so the click handler gets the right element
        // (I kept getting the wrong one without this lol)
        (function(issueElement) {
          li.addEventListener("click", function() {
            highlightElement(issueElement);
          });
          li.addEventListener("keydown", function(e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              highlightElement(issueElement);
            }
          });
        })(issues[i].element);

        list.appendChild(li);
      }

      section.appendChild(list);

      // add the advice/remediation text
      var advice = document.createElement("div");
      advice.className = "advice-box";
      advice.textContent = adviceText;
      section.appendChild(advice);
    }

    return section;
  }


  // -- build each section --

  // section 1: alt text
  body.appendChild(createSection(
    "Missing Alt Text",
    altIssues,
    function(issue) {
      return "Image missing alt: " + truncate(issue.src);
    },
    "Add descriptive alt text to " + altIssues.length + " image(s). Use alt=\"\" only for decorative images."
  ));

  // section 2: headings
  body.appendChild(createSection(
    "Heading Hierarchy",
    headingIssues,
    function(issue) {
      return "Skipped: " + issue.previous + " -> " + issue.current;
    },
    "Fix " + headingIssues.length + " skipped heading level(s). Headings should go in order (H1, H2, H3, etc)."
  ));

  // section 3: contrast
  body.appendChild(createSection(
    "Contrast Warnings",
    contrastIssues,
    function(issue) {
      return "Low contrast: \"" + truncate(issue.element.textContent, 40) + "\"";
    },
    "Check " + contrastIssues.length + " element(s) with low contrast. WCAG requires at least 4.5:1 for normal text."
  ));

  panel.appendChild(body);


  // -- panel footer --
  var footer = document.createElement("div");
  footer.className = "panel-footer";
  footer.textContent = "Canvas Accessibility Auditor - WCAG 2.1 Scan";
  panel.appendChild(footer);


  // add the panel to the page
  document.body.appendChild(panel);

  // let the user close it with Escape key
  document.addEventListener("keydown", function handleEsc(e) {
    if (e.key === "Escape") {
      var p = document.getElementById("a11y-panel");
      if (p) {
        p.remove();
        document.removeEventListener("keydown", handleEsc);
      }
    }
  });

  // focus the panel so screen readers will announce it
  panel.focus();

  console.log("=== Canvas Accessibility Auditor: Scan complete ===");

})();
