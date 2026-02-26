// NightGuard — Content Script
// Injects blue light filter overlay and/or dark mode CSS into web pages

(function() {
  'use strict';

  // Guard against double-injection (e.g., scripting.executeScript on already-loaded tabs)
  if (window.__nightguard_loaded) return;
  window.__nightguard_loaded = true;

  const OVERLAY_ID = 'nightguard-overlay';
  const DARKMODE_ID = 'nightguard-darkmode';

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
    const invertAmount = Math.round(normalizedIntensity * 90);      // up to 90% invert
    const brightness = 100 + Math.round(normalizedIntensity * 20);  // slight brightness boost
    const contrast = 100 - Math.round(normalizedIntensity * 10);    // slight contrast reduction

    style.textContent = `
      html {
        filter: invert(${invertAmount}%) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) !important;
        transition: filter 10s ease !important;
      }
      /* Don't invert images and videos back — keep them natural */
      html img,
      html video,
      html canvas,
      html svg image,
      html [style*="background-image"],
      html picture,
      html iframe {
        filter: invert(100%) hue-rotate(180deg) !important;
      }
    `;
  }

  function updateFilter(data) {
    const { mode, intensity, enabled } = data;

    if (!enabled || intensity <= 0) {
      applyBlueLight(0);
      applyDarkMode(0);
      return;
    }

    if (mode === 'bluelight') {
      applyBlueLight(intensity);
      applyDarkMode(0);
    } else if (mode === 'darkmode') {
      applyBlueLight(0);
      applyDarkMode(intensity);
    } else if (mode === 'both') {
      applyBlueLight(intensity);
      applyDarkMode(intensity * 0.7); // dark mode slightly less intense when combined
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
