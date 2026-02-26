// NightGuard — Background Service Worker
// Handles scheduling, alarms, sunset/sunrise calculations, and messaging

const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'bluelight',        // 'bluelight', 'darkmode', 'both'
  scheduleType: 'manual',   // 'manual' or 'auto'
  startTime: '21:00',       // 9 PM
  endTime: '07:00',         // 7 AM
  latitude: null,
  longitude: null,
  intensity: 80,            // 0-100 percentage
  currentIntensity: 0,      // actual current applied intensity
  isActive: false,
  manualActive: false       // persistent manual override (ignores schedule)
};

// ── Sunset/Sunrise Calculation ──────────────────────────────────
// Simplified solar calculation (good enough for scheduling purposes)
function calculateSunTimes(lat, lng, date) {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  
  // Solar declination
  const declination = -23.45 * Math.cos(rad * (360 / 365) * (dayOfYear + 10));
  
  // Hour angle
  const cosHourAngle = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(declination * rad)) /
    (Math.cos(lat * rad) * Math.cos(declination * rad));
  
  const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngle = Math.acos(clampedCos) / rad;
  
  // Solar noon in minutes from midnight (UTC)
  const solarNoon = 720 - 4 * lng;
  
  const sunriseMinutes = solarNoon - hourAngle * 4;
  const sunsetMinutes = solarNoon + hourAngle * 4;
  
  // Convert to local time offset
  const timezoneOffset = date.getTimezoneOffset();
  
  const sunriseLocal = sunriseMinutes - timezoneOffset;
  const sunsetLocal = sunsetMinutes - timezoneOffset;
  
  const toTimeString = (mins) => {
    const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
    const m = Math.floor(((mins % 1440) + 1440) % 1440 % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  
  return {
    sunrise: toTimeString(sunriseLocal),
    sunset: toTimeString(sunsetLocal)
  };
}

// ── Time Utilities ──────────────────────────────────────────────
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isInActiveWindow(startTime, endTime) {
  const now = getCurrentMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  if (start <= end) {
    return now >= start && now < end;
  } else {
    // Wraps midnight (e.g., 21:00 to 07:00)
    return now >= start || now < end;
  }
}

// ── Intensity Calculation ────────────────────────────────────────
// Binary on/off based on the schedule window.
// The 15-second visual fade-in/out is handled by CSS transitions in content.js.
function calculateCurrentIntensity(settings) {
  const { startTime, endTime, intensity } = settings;
  return isInActiveWindow(startTime, endTime) ? intensity : 0;
}

// ── Apply Filter to All Tabs ────────────────────────────────────
async function applyToAllTabs(settings, currentIntensity) {
  try {
    const tabs = await chrome.tabs.query({});
    const message = {
      type: 'UPDATE_FILTER',
      mode: settings.mode,
      intensity: currentIntensity,
      enabled: settings.enabled && currentIntensity > 0
    };
    
    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch (e) {
          // Tab might not have content script loaded yet
        }
      }
    }
  } catch (e) {
    console.error('Error applying to tabs:', e);
  }
}

// ── Main Update Loop ────────────────────────────────────────────
async function updateFilter() {
  const result = await chrome.storage.local.get('settings');
  const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
  
  if (!settings.enabled) {
    settings.currentIntensity = 0;
    settings.isActive = false;
    await chrome.storage.local.set({ settings });
    await applyToAllTabs(settings, 0);
    return;
  }
  
  let startTime = settings.startTime;
  let endTime = settings.endTime;

  // Auto sunset/sunrise
  if (settings.scheduleType === 'auto' && settings.latitude && settings.longitude) {
    const sunTimes = calculateSunTimes(settings.latitude, settings.longitude, new Date());
    startTime = sunTimes.sunset;
    endTime = sunTimes.sunrise;
    settings.startTime = startTime;
    settings.endTime = endTime;
  }

  const currentIntensity = settings.manualActive
    ? settings.intensity
    : calculateCurrentIntensity(settings);
  settings.currentIntensity = currentIntensity;
  settings.isActive = currentIntensity > 0;
  
  await chrome.storage.local.set({ settings });
  await applyToAllTabs(settings, currentIntensity);
}

// ── Alarms ──────────────────────────────────────────────────────
// Check every minute for gradual transitions.
// Guard against recreating (and thus resetting) the alarm on every service worker wake-up.
chrome.alarms.get('nightguard-tick', (existing) => {
  if (!existing) {
    chrome.alarms.create('nightguard-tick', { periodInMinutes: 1 });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nightguard-tick') {
    updateFilter();
  }
});

// ── Messages from Popup ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get('settings').then((result) => {
      const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };

      // Calculate sun times if auto
      if (settings.scheduleType === 'auto' && settings.latitude && settings.longitude) {
        const sunTimes = calculateSunTimes(settings.latitude, settings.longitude, new Date());
        settings.startTime = sunTimes.sunset;
        settings.endTime = sunTimes.sunrise;
      }

      // Always recalculate so a newly opened tab gets the correct intensity
      // rather than a potentially stale value from storage
      if (!settings.enabled) {
        settings.currentIntensity = 0;
      } else if (settings.manualActive) {
        settings.currentIntensity = settings.intensity;
      } else {
        settings.currentIntensity = calculateCurrentIntensity(settings);
      }
      settings.isActive = settings.currentIntensity > 0;

      sendResponse({ settings });
    });
    return true; // async response
  }
  
  if (message.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }).then(() => {
      updateFilter();
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'TOGGLE') {
    chrome.storage.local.get('settings').then((result) => {
      const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
      settings.enabled = !settings.enabled;
      chrome.storage.local.set({ settings }).then(() => {
        updateFilter();
        sendResponse({ settings });
      });
    });
    return true;
  }
  
  if (message.type === 'FORCE_UPDATE') {
    updateFilter().then(() => sendResponse({ success: true }));
    return true;
  }
});

// ── Tab Events ──────────────────────────────────────────────────
// Apply filter when new tabs load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url &&
      !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    chrome.storage.local.get('settings').then((result) => {
      const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
      if (settings.enabled) {
        const currentIntensity = settings.manualActive
          ? settings.intensity
          : calculateCurrentIntensity(settings);
        if (currentIntensity > 0) {
          chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_FILTER',
            mode: settings.mode,
            intensity: currentIntensity,
            enabled: true
          }).catch(() => {});
        }
      }
    });
  }
});

// ── Initialize ──────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('settings');
  if (!result.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // Inject content script into tabs already open at install/update time —
  // they won't have content.js because it only auto-injects on page load.
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (e) {
        // Tab not injectable (e.g., restricted page) — skip
      }
    }
  }

  updateFilter();
});

// Run on startup
updateFilter();
