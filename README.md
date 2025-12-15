# Canvas Accessibility Auditor

Chrome extension that scans web pages (like Canvas LMS) for common accessibility issues based on WCAG 2.1 / ADA guidelines.

## What it does

- **Missing Alt Text** - Finds images that don't have alt attributes (or have empty ones)
- **Heading Hierarchy** - Checks if heading levels are skipped (like going from h1 straight to h3)
- **Contrast Warnings** - Flags text that looks like it might have bad contrast (light gray on white, etc)
- **Report Panel** - Shows a panel on the page with all the issues and suggestions on how to fix them

## How to install

1. Go to `chrome://extensions/` in Chrome
2. Turn on Developer mode (top right corner)
3. Click "Load unpacked" and pick this folder
4. You should see the extension icon in the toolbar

## How to use

1. Go to any webpage
2. Click the extension icon
3. Hit "Run Audit"
4. A report panel will show up on the page with any issues it found
5. Click on any issue to highlight it on the page
6. Press Escape or click the X to close the panel

## Files

- `manifest.json` - extension config
- `popup.html` / `popup.css` / `popup.js` - the popup UI
- `content.js` - the scanning logic and report panel
- `icons/` - extension icons

## Notes

- The contrast checker is pretty basic - it just checks luminance values, not the full WCAG contrast ratio formula
- Doesn't work on chrome:// pages (Chrome blocks extensions there)
- Won't scan inside iframes
