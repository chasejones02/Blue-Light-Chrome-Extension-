// NightGuard — Content Script
// Injects blue light filter overlay and/or dark mode CSS into web pages

(function() {
  'use strict';

  // Guard against double-injection (e.g., scripting.executeScript on already-loaded tabs)
  if (window.__nightguard_loaded) return;
  window.__nightguard_loaded = true;

  const OVERLAY_ID    = 'nightguard-overlay';
  const DARKMODE_ID   = 'nightguard-darkmode';
  const FILTERMODE_ID = 'nightguard-filtermode';

  // ── Scientific CSS Filter Keyframes ──────────────────────────────
  // Values at intensity levels 0, 20, 40, 60, 80, 100%.
  // Sleep Prep: targets melanopsin peak at ~480nm (Brainard et al. 2001).
  // Eye Strain: reduces the LED ~450nm phosphor spike (Sheedy et al. 2003).
  // Reader Mode: mimics warm paper reflectance for contrast relief (Legge & Bigelow 2011).
  const FILTER_KEYFRAMES = {
    'sleep-prep': {
        0: { sepia: 0,    saturate: 1.00, brightness: 1.00 },
       20: { sepia: 0.30, saturate: 1.50, brightness: 0.98 },
       40: { sepia: 0.55, saturate: 2.00, brightness: 0.95 },
       60: { sepia: 0.75, saturate: 2.50, brightness: 0.92 },
       80: { sepia: 0.90, saturate: 3.00, brightness: 0.90 },
      100: { sepia: 1.00, saturate: 3.50, brightness: 0.88 }
    },
    'reduce-eye-strain': {
        0: { sepia: 0,    saturate: 1.00, brightness: 1.00, contrast: 1.00 },
       20: { sepia: 0.08, saturate: 1.05, brightness: 0.99, contrast: 0.99 },
       40: { sepia: 0.15, saturate: 1.10, brightness: 0.98, contrast: 0.98 },
       60: { sepia: 0.22, saturate: 1.15, brightness: 0.97, contrast: 0.97 },
       80: { sepia: 0.28, saturate: 1.20, brightness: 0.97, contrast: 0.97 },
      100: { sepia: 0.35, saturate: 1.30, brightness: 0.96, contrast: 0.96 }
    },
    'reader-mode': {
        0: { sepia: 0,    saturate: 1.00, brightness: 1.00, contrast: 1.00 },
       20: { sepia: 0.15, saturate: 0.95, brightness: 0.97, contrast: 0.97 },
       40: { sepia: 0.30, saturate: 0.90, brightness: 0.94, contrast: 0.93 },
       60: { sepia: 0.45, saturate: 0.85, brightness: 0.90, contrast: 0.90 },
       80: { sepia: 0.55, saturate: 0.82, brightness: 0.87, contrast: 0.87 },
      100: { sepia: 0.65, saturate: 0.80, brightness: 0.85, contrast: 0.85 }
    }
  };

  const FILTER_STOPS = [0, 20, 40, 60, 80, 100];

  function lerpObj(a, b, t) {
    const out = {};
    for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * t;
    return out;
  }

  function computeFilterCSS(mode, intensity) {
    const frames = FILTER_KEYFRAMES[mode];
    if (!frames) return '';
    const clamped = Math.max(0, Math.min(100, intensity));

    let lo = 0, hi = 20;
    for (let i = 0; i < FILTER_STOPS.length - 1; i++) {
      if (clamped >= FILTER_STOPS[i] && clamped <= FILTER_STOPS[i + 1]) {
        lo = FILTER_STOPS[i]; hi = FILTER_STOPS[i + 1]; break;
      }
    }
    const t = hi === lo ? 1 : (clamped - lo) / (hi - lo);
    const p = lerpObj(frames[lo], frames[hi], t);
    const f = (v) => v.toFixed(3);

    if (mode === 'sleep-prep') {
      return `sepia(${f(p.sepia)}) saturate(${f(p.saturate)}) brightness(${f(p.brightness)})`;
    }
    return `sepia(${f(p.sepia)}) saturate(${f(p.saturate)}) brightness(${f(p.brightness)}) contrast(${f(p.contrast)})`;
  }

  function createOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483647;
        mix-blend-mode: multiply;
        transition: opacity 10s ease;
        opacity: 0;
      `;
      (document.documentElement || document.body).appendChild(overlay);
    }
    return overlay;
  }

  function createDarkModeStyle() {
    let style = document.getElementById(DARKMODE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = DARKMODE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function createModeFilterStyle() {
    let style = document.getElementById(FILTERMODE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = FILTERMODE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function applyModeFilter(mode, intensity) {
    const style = createModeFilterStyle();
    if (intensity <= 0 || !FILTER_KEYFRAMES[mode]) {
      style.textContent = '';
      return;
    }
    const filterCSS = computeFilterCSS(mode, intensity);
    style.textContent = `
      html {
        filter: ${filterCSS} !important;
        transition: filter 0.8s ease !important;
      }
    `;
  }

  function applyBlueLight(intensity) {
    const overlay = createOverlay();
    if (intensity <= 0) {
      overlay.style.opacity = '0';
      return;
    }

    // Warm amber color at variable opacity
    const normalizedIntensity = intensity / 100;
    const r = 255;
    const g = Math.round(180 - normalizedIntensity * 40);  // gets warmer
    const b = Math.round(60 - normalizedIntensity * 50);    // removes blue
    const alpha = 0.08 + normalizedIntensity * 0.22;        // 0.08 to 0.30

    overlay.style.background = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    overlay.style.opacity = '1';
  }

  function applyDarkMode(intensity) {
    const style = createDarkModeStyle();
    if (intensity <= 0) {
      style.textContent = '';
      return;
    }

    const normalizedIntensity = intensity / 100;
    // brightness() BEFORE invert() controls how dark backgrounds get after inversion:
    //   white × preBrightness% → then invert → (1 - preBrightness/100) × 255
    //   At 100% intensity: brightness(93%) → white becomes #121212 (OLED dark grey, no grey tint)
    //   At 50% intensity:  brightness(47%) → white becomes #888 (medium dark)
    const preBrightness = Math.round(normalizedIntensity * 93);

    style.textContent = `
      html {
        filter: brightness(${preBrightness}%) invert(100%) hue-rotate(180deg) !important;
        transition: filter 10s ease !important;
      }
      /* Re-invert images/video to restore natural colors; they are dimmed by the pre-brightness */
      html img,
      html video,
      html canvas,
      html svg image,
      html picture {
        filter: invert(100%) hue-rotate(180deg) !important;
      }
      /* iframes are NOT re-inverted — they get dark mode applied like the rest of the page */
    `;
  }

  function updateFilter(data) {
    const { mode, intensity, enabled } = data;

    if (!enabled || intensity <= 0) {
      applyBlueLight(0);
      applyDarkMode(0);
      applyModeFilter(null, 0);
      return;
    }

    if (FILTER_KEYFRAMES[mode]) {
      // Scientific CSS filter modes: sleep-prep, reduce-eye-strain, reader-mode
      applyBlueLight(0);
      applyDarkMode(0);
      applyModeFilter(mode, intensity);
    } else if (mode === 'bluelight') {
      applyModeFilter(null, 0);
      applyDarkMode(0);
      applyBlueLight(intensity);
    } else if (mode === 'darkmode') {
      applyModeFilter(null, 0);
      applyBlueLight(0);
      applyDarkMode(intensity);
    } else if (mode === 'both') {
      applyModeFilter(null, 0);
      applyBlueLight(intensity);
      applyDarkMode(intensity * 0.7);
    }
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'UPDATE_FILTER') {
      updateFilter(message);
      sendResponse({ success: true });
    }
  });

  // Request current state on load, with retry for MV3 service worker wake-up lag
  function requestStatus(retries) {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        if (retries > 0) setTimeout(() => requestStatus(retries - 1), 500);
        return;
      }
      if (response && response.settings) {
        const s = response.settings;
        updateFilter({
          mode: s.mode,
          intensity: s.currentIntensity,
          enabled: s.enabled && s.currentIntensity > 0
        });
      }
    });
  }

  requestStatus(3);
})();
