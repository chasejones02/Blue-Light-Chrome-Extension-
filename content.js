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
