// NightGuard — Content Script
// Injects blue light filter overlay and/or dark mode CSS into web pages

(function() {
  'use strict';

  if (window.__nightguard_loaded) return;
  window.__nightguard_loaded = true;

  const OVERLAY_ID    = 'nightguard-overlay';
  const HTMLFILTER_ID = 'nightguard-html-filter'; // single tag owns ALL html { filter } rules

  // ── Scientific CSS Filter Keyframes ──────────────────────────────
  // Values at intensity levels 0, 20, 40, 60, 80, 100%.
  // Sleep Prep:  targets melanopsin peak at ~480nm (Brainard et al. 2001).
  // Eye Strain:  reduces the LED ~450nm phosphor spike (Sheedy et al. 2003).
  // Reader Mode: mimics warm paper reflectance for contrast relief (Legge & Bigelow 2011).
  //
  // All three modes share the same 4-function signature sepia/saturate/brightness/contrast
  // so CSS can smoothly interpolate between any two of them.
  const FILTER_KEYFRAMES = {
    'sleep-prep': {
        0: { sepia: 0,    saturate: 1.00, brightness: 1.00, contrast: 1.00 },
       20: { sepia: 0.30, saturate: 1.50, brightness: 0.98, contrast: 1.00 },
       40: { sepia: 0.55, saturate: 2.00, brightness: 0.95, contrast: 1.00 },
       60: { sepia: 0.75, saturate: 2.50, brightness: 0.92, contrast: 1.00 },
       80: { sepia: 0.90, saturate: 3.00, brightness: 0.90, contrast: 1.00 },
      100: { sepia: 1.00, saturate: 3.50, brightness: 0.88, contrast: 1.00 }
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
    return `sepia(${f(p.sepia)}) saturate(${f(p.saturate)}) brightness(${f(p.brightness)}) contrast(${f(p.contrast)})`;
  }

  // ── Overlay (Blue Light mode) ─────────────────────────────────────
  function createOverlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = OVERLAY_ID;
      el.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none;
        z-index: 2147483647;
        mix-blend-mode: multiply;
        transition: opacity 10s ease;
        opacity: 0;
      `;
      (document.documentElement || document.body).appendChild(el);
    }
    return el;
  }

  function applyBlueLight(intensity) {
    const overlay = createOverlay();
    if (intensity <= 0) { overlay.style.opacity = '0'; return; }
    const n = intensity / 100;
    overlay.style.background = `rgba(255, ${Math.round(180 - n * 40)}, ${Math.round(60 - n * 50)}, ${0.08 + n * 0.22})`;
    overlay.style.opacity = '1';
  }

  // ── Single HTML filter style tag ──────────────────────────────────
  // All modes that set `html { filter }` write through this ONE tag.
  // A single tag prevents cascade conflicts between two !important rules
  // that both target the same element+property.
  function getHtmlFilterStyle() {
    let style = document.getElementById(HTMLFILTER_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = HTMLFILTER_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  // Track which mode is currently displayed so we can detect cross-type switches.
  let _activeHtmlMode  = null;
  let _pendingTimeout  = null;

  // Write the CSS for a given mode directly into the style tag (no transition logic here).
  function _writeHtmlFilter(style, mode, intensity) {
    if (intensity <= 0 || !mode) {
      style.textContent = `
        html { filter: none !important; transition: filter 10s ease !important; }
      `;
      return;
    }

    if (mode === 'darkmode') {
      const preBrightness = Math.round((intensity / 100) * 93);
      // brightness() BEFORE invert() controls darkness:
      //   At 100%: brightness(93%) → white inverts to #121212 (OLED dark grey, no grey tint)
      style.textContent = `
        html {
          filter: brightness(${preBrightness}%) invert(100%) hue-rotate(180deg) !important;
          transition: filter 10s ease !important;
        }
        html img, html video, html canvas, html svg image, html picture {
          filter: invert(100%) hue-rotate(180deg) !important;
        }
      `;
      return;
    }

    if (FILTER_KEYFRAMES[mode]) {
      style.textContent = `
        html {
          filter: ${computeFilterCSS(mode, intensity)} !important;
          transition: filter 10s ease !important;
        }
      `;
      return;
    }

    // Unknown mode fallback
    style.textContent = `
      html { filter: none !important; transition: filter 10s ease !important; }
    `;
  }

  // ── Transition-aware html filter application ──────────────────────
  //
  // CSS transitions only interpolate between IDENTICAL filter function signatures.
  // scientific filters all share: sepia() saturate() brightness() contrast()  → interpolate ✓
  // dark mode uses:               brightness() invert() hue-rotate()           → cannot interpolate with scientific
  //
  // Cross-type switches (scientific ↔ dark) are handled with a 2-step JS fade:
  //   step 1 — fade current filter to none  (CSS handles this, duration varies)
  //   step 2 — apply target filter          (CSS then fades it in from none over 10s)
  //
  // Dark → scientific uses a fast 0.3s step-1 to keep the image-inversion artifact brief.
  // Scientific → dark uses a 2s step-1 so the page eases to white before darkening.
  function applyHtmlFilter(mode, intensity) {
    const style = getHtmlFilterStyle();

    // Cancel any in-flight deferred application.
    if (_pendingTimeout !== null) {
      clearTimeout(_pendingTimeout);
      _pendingTimeout = null;
    }

    const prev          = _activeHtmlMode;
    const isDark        = mode === 'darkmode';
    const wasDark       = prev === 'darkmode';
    const isScientific  = !!FILTER_KEYFRAMES[mode];
    const wasScientific = !!FILTER_KEYFRAMES[prev];
    const isCrossType   = (isDark && wasScientific) || (isScientific && wasDark);

    // ── OFF: fade current filter out ─────────────────────────────────
    if (intensity <= 0) {
      _activeHtmlMode = null;
      // Dark mode off: use a fast fade to minimise the window where images
      // appear inverted (re-inversion rules are removed when style changes).
      const dur = wasDark ? '0.3s' : '10s';
      style.textContent = `
        html { filter: none !important; transition: filter ${dur} ease !important; }
      `;
      return;
    }

    // ── CROSS-TYPE: scientific ↔ dark — CSS cannot interpolate ───────
    // Two-step: dissolve current filter to none first, then fade in the new one.
    if (isCrossType) {
      _activeHtmlMode = null;

      // Dark → scientific: snap off quickly (0.3s) to minimise image inversion artifact.
      // Scientific → dark: ease to white (2s) before the page starts darkening.
      const fadeOutMs = wasDark ? 300 : 2000;
      style.textContent = `
        html { filter: none !important; transition: filter ${fadeOutMs}ms ease !important; }
      `;

      const targetMode      = mode;
      const targetIntensity = intensity;
      _pendingTimeout = setTimeout(() => {
        _pendingTimeout = null;
        _activeHtmlMode = targetMode;
        _writeHtmlFilter(style, targetMode, targetIntensity);
      }, fadeOutMs);
      return;
    }

    // ── SAME TYPE: scientific → scientific, dark → dark, or first load ─
    // CSS handles the transition natively via the transition property already
    // present in the style tag from the previous write.
    _activeHtmlMode = mode;
    _writeHtmlFilter(style, mode, intensity);
  }

  // ── Route to the right filter(s) ─────────────────────────────────
  function updateFilter(data) {
    const { mode, intensity, enabled } = data;

    if (!enabled || intensity <= 0) {
      applyBlueLight(0);
      applyHtmlFilter(null, 0);
      return;
    }

    if (FILTER_KEYFRAMES[mode]) {
      applyBlueLight(0);
      applyHtmlFilter(mode, intensity);
    } else if (mode === 'bluelight') {
      applyHtmlFilter(null, 0);
      applyBlueLight(intensity);
    } else if (mode === 'darkmode') {
      applyBlueLight(0);
      applyHtmlFilter('darkmode', intensity);
    } else if (mode === 'both') {
      applyBlueLight(intensity);
      applyHtmlFilter('darkmode', intensity * 0.7);
    }
  }

  // ── Message listener ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'UPDATE_FILTER') {
      updateFilter(message);
      sendResponse({ success: true });
    }
  });

  // ── Request state on load (retry for MV3 service worker wake-up lag)
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
