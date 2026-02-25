# 🌙 NightGuard — Blue Light & Dark Mode Scheduler

A Chrome extension that automatically reduces blue light and activates dark mode on a schedule, with smooth gradual transitions for comfortable nighttime browsing.

## Features

- **Blue Light Filter** — warm amber overlay that reduces blue light emission
- **Dark Mode** — inverts page colors with smart image preservation
- **Both Modes** — combine blue light filter + dark mode together
- **Manual Schedule** — set exact start/end times (e.g., 9 PM to 7 AM)
- **Auto Sunset/Sunrise** — detects your location and activates based on actual sun times
- **Gradual Transitions** — smoothly fades in/out over 10-45 minutes (configurable)
- **Adjustable Intensity** — slider from 10% to 100%
- **Preview Mode** — test the filter instantly before your scheduled time
- **Persistent Settings** — remembers your preferences across browser sessions

## Installation (Developer Mode)

1. Download or clone this folder to your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `nightguard` folder
6. The NightGuard icon will appear in your toolbar — click it to configure

## File Structure

```
nightguard/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker — scheduling, alarms, sun calculations
├── content.js          # Injected into pages — applies CSS filters
├── popup.html          # Settings UI
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
4. Content scripts inject either a warm overlay `<div>` (blue light) or CSS `filter: invert()` (dark mode)
5. New tabs automatically receive the current filter state when they load
6. When the scheduled window ends, the filter gradually fades out

## Development Tips

- **Edit in VS Code** — all files are standard HTML/CSS/JS
- **Reload changes** — after editing, go to `chrome://extensions/` and click the refresh icon on NightGuard
- **Debug popup** — right-click the extension icon → "Inspect popup"
- **Debug background** — on the extensions page, click "Service Worker" under NightGuard
- **Debug content script** — open DevTools on any webpage, go to Console, and filter by NightGuard

## Customization Ideas for V2

- Per-site exclusion list (whitelist certain websites)
- Custom color temperature picker for the blue light filter
- Keyboard shortcut to toggle on/off
- Browser notification when filter activates
- Weekly schedule (different times for weekdays vs weekends)
- Sync settings across devices using `chrome.storage.sync`

## Publishing to Chrome Web Store

1. Create a developer account at https://chrome.google.com/webstore/devconsole ($5 one-time fee)
2. Replace the placeholder icons with polished 128x128, 48x48, and 16x16 PNG icons
3. Zip the entire `nightguard` folder
4. Upload the zip to the Developer Dashboard
5. Add screenshots, description, and promotional images
6. Submit for review (typically 1-3 business days)
