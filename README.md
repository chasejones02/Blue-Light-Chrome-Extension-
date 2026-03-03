# ChromeTones — Blue Light & Dark Mode Scheduler

A Chrome extension that automatically reduces blue light and activates dark mode on a schedule, with smooth gradual transitions for comfortable nighttime browsing.

## Features

- **Blue Light Filter** — warm amber overlay that reduces blue light emission
- **Dark Mode** — inverts page colors with smart image preservation
- **Combine Filters** — blend any two filters together with an adjustable ratio slider
- **Scientific Filters** — Sleep Prep, Reader Mode, and Reduce Eye Strain modes with calibrated color temperatures
- **Grayscale Mode** — removes color to reduce distracting design patterns
- **Color Blind Assist** — Daltonization support for Protanopia, Deuteranopia, and Tritanopia
- **Manual Schedule** — set exact start/end times (e.g., 9 PM to 7 AM)
- **Auto Sunset/Sunrise** — detects your location and activates based on actual sun times
- **Gradual Transitions** — smoothly fades in/out over 10-45 minutes (configurable)
- **Adjustable Intensity** — slider from 10% to 100%
- **Preview Mode** — test the filter instantly before your scheduled time
- **Persistent Settings** — remembers your preferences across browser sessions

## Installation (Developer Mode)

1. Download or clone this repository to your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the project folder
6. The ChromeTones icon will appear in your toolbar — click it to configure

## File Structure

```
chrometones/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker — scheduling, alarms, sun calculations
├── content.js          # Injected into pages — applies CSS filters
├── popup.html          # Settings UI (4-page sliding navigation)
├── popup.js            # Settings UI logic
├── icons/
│   ├── icon16.png      # Toolbar icon
│   ├── icon48.png      # Extensions page icon
│   └── icon128.png     # Chrome Web Store icon
└── README.md           # This file
```

## How It Works

1. **Background service worker** runs a 1-minute alarm loop that checks the current time
2. When the scheduled window begins, it calculates a gradual intensity ramp-up
3. It sends messages to **content scripts** running in every open tab
4. Content scripts inject either a warm overlay `<div>` (blue light), CSS `filter: invert()` (dark mode), or calibrated CSS filters (scientific modes)
5. New tabs automatically receive the current filter state when they load
6. When the scheduled window ends, the filter gradually fades out

## Popup Navigation

The popup UI has 4 sliding pages:

- **Page 1 (Main)** — Blue Light / Dark Mode / Combine mode selection, schedule, intensity, activate
- **Page 2 (More Filters)** — Filter cards for Sleep Prep, Reader Mode, Eye Strain, Grayscale, Color Blind Assist
- **Page 3 (Filter Detail)** — Live preview mockup, color temperature readout, intensity slider, activate
- **Page 4 (Combine Filters)** — Pick two filters, adjust blend ratio, activate combined filter

## Development Tips

- **Edit in VS Code** — all files are standard HTML/CSS/JS
- **Reload changes** — after editing, go to `chrome://extensions/` and click the refresh icon on ChromeTones
- **Debug popup** — right-click the extension icon → "Inspect popup"
- **Debug background** — on the extensions page, click "Service Worker" under ChromeTones
- **Debug content script** — open DevTools on any webpage, go to Console, and filter by ChromeTones

## Publishing to Chrome Web Store

1. Create a developer account at https://chrome.google.com/webstore/devconsole ($5 one-time fee)
2. Replace the placeholder icons with polished 128x128, 48x48, and 16x16 PNG icons
3. Zip the entire project folder
4. Upload the zip to the Developer Dashboard
5. Add screenshots, description, and promotional images
6. Submit for review (typically 1-3 business days)
