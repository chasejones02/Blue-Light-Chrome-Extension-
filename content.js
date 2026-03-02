// NightGuard — Content Script
// Injects blue light filter overlay and/or dark mode CSS into web pages

(function() {
  'use strict';

  if (window.__nightguard_loaded) return;
  window.__nightguard_loaded = true;

  const OVERLAY_ID    = 'nightguard-overlay';
  const HTMLFILTER_ID = 'nightguard-html-filter'; // single tag owns ALL html { filter } rules
  const CB_SVG_ID     = 'nightguard-cb-svg';
  const CB_FILTER_ID  = 'nightguard-cb-filter';

  // ── Color Blindness Daltonization ──────────────────────────────
  // Simulation matrices from Viénot, Brettel & Mollon (1999).
  // Each is a 3×3 that maps original RGB → what the deficient eye perceives.
  const CB_SIM = {
    protanopia: [
      0.152286,  1.052583, -0.204868,
      0.114503,  0.786281,  0.099216,
     -0.003882, -0.048116,  1.051998
    ],
    deuteranopia: [
      0.367322,  0.860646, -0.227968,
      0.280085,  0.672501,  0.047413,
     -0.011820,  0.042940,  0.968881
    ],
    tritanopia: [
      1.255528, -0.076749, -0.178779,
     -0.078411,  0.930809,  0.147602,
      0.004733,  0.691367,  0.303900
    ]
  };

  // Error redistribution matrices (Daltonize algorithm).
  // Shifts the "error" (colors the user can't see) into channels they CAN perceive.
  const CB_ERR_SHIFT = {
    protanopia: [
      0,   0, 0,
      0.7, 0, 0,
      0.7, 0, 0
    ],
    deuteranopia: [
      0, 0.7, 0,
      0, 0,   0,
      0, 0.7, 0
    ],
    tritanopia: [
      0, 0, 0.7,
      0, 0, 0.7,
      0, 0, 0
    ]
  };

  // Identity 3×3
  const I3 = [1,0,0, 0,1,0, 0,0,1];

  // 3×3 matrix multiply
  function mul3(A, B) {
    const R = new Array(9);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        R[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return R;
  }

  // Compute the feColorMatrix "values" string for a given type and severity (0–1).
  // Algorithm: result = original + severity * errShift * (original - simulated)
  // Collapsed: M = I + severity * errShift * (I - sim)
  function computeCBMatrix(type, severity) {
    const sim  = CB_SIM[type]  || CB_SIM.deuteranopia;
    const es   = CB_ERR_SHIFT[type] || CB_ERR_SHIFT.deuteranopia;

    // diff = I - sim
    const diff = I3.map((v, i) => v - sim[i]);
    // correction = errShift × diff
    const corr = mul3(es, diff);
    // combined = I + severity × correction
    const M = I3.map((v, i) => v + severity * corr[i]);

    // Expand 3×3 to 5×4 feColorMatrix (row-major, last row is alpha pass-through)
    const f = (v) => v.toFixed(6);
    return [
      f(M[0]), f(M[1]), f(M[2]), '0', '0',
      f(M[3]), f(M[4]), f(M[5]), '0', '0',
      f(M[6]), f(M[7]), f(M[8]), '0', '0',
      '0',     '0',     '0',     '1', '0'
    ].join(' ');
  }

  // Inject or retrieve the inline SVG that hosts the feColorMatrix filter.
  function ensureCBSvg() {
    let svg = document.getElementById(CB_SVG_ID);
    if (!svg) {
      const NS = 'http://www.w3.org/2000/svg';
      svg = document.createElementNS(NS, 'svg');
      svg.id = CB_SVG_ID;
      svg.setAttribute('style', 'position:absolute;width:0;height:0;pointer-events:none');

      const filter = document.createElementNS(NS, 'filter');
      filter.id = CB_FILTER_ID;
      filter.setAttribute('color-interpolation-filters', 'sRGB');

      const matrix = document.createElementNS(NS, 'feColorMatrix');
      matrix.setAttribute('type', 'matrix');
      matrix.setAttribute('values', computeCBMatrix('deuteranopia', 0));

      filter.appendChild(matrix);
      svg.appendChild(filter);
      (document.documentElement || document.body).appendChild(svg);
    }
    return svg.querySelector('feColorMatrix');
  }

  function removeCBSvg() {
    const svg = document.getElementById(CB_SVG_ID);
    if (svg) svg.remove();
  }

  let _cbType = 'deuteranopia';

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

  // Darkmode-compatible keyframes for combine mode.
  // Approximates darkmode's visual effect (heavy dimming + slight warmth) using the same
  // 4-function signature so it can be mathematically merged with scientific filters.
  // Standalone darkmode (invert+hue-rotate) is unchanged; this is only used in combine mode.
  const DARKMODE_COMPAT_KEYFRAMES = {
      0: { sepia: 0,    saturate: 1.00, brightness: 1.00, contrast: 1.00 },
     20: { sepia: 0.02, saturate: 0.95, brightness: 0.80, contrast: 1.05 },
     40: { sepia: 0.05, saturate: 0.90, brightness: 0.60, contrast: 1.10 },
     60: { sepia: 0.08, saturate: 0.85, brightness: 0.45, contrast: 1.15 },
     80: { sepia: 0.10, saturate: 0.80, brightness: 0.30, contrast: 1.20 },
    100: { sepia: 0.12, saturate: 0.75, brightness: 0.20, contrast: 1.25 }
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

  // Return raw {sepia, saturate, brightness, contrast} values for a mode at a given intensity.
  // Uses DARKMODE_COMPAT_KEYFRAMES when mode === 'darkmode' so it can merge with scientific filters.
  function computeFilterValues(mode, intensity) {
    const frames = (mode === 'darkmode') ? DARKMODE_COMPAT_KEYFRAMES : FILTER_KEYFRAMES[mode];
    if (!frames) return null;
    const clamped = Math.max(0, Math.min(100, intensity));
    let lo = 0, hi = 20;
    for (let i = 0; i < FILTER_STOPS.length - 1; i++) {
      if (clamped >= FILTER_STOPS[i] && clamped <= FILTER_STOPS[i + 1]) {
        lo = FILTER_STOPS[i]; hi = FILTER_STOPS[i + 1]; break;
      }
    }
    const t = hi === lo ? 1 : (clamped - lo) / (hi - lo);
    return lerpObj(frames[lo], frames[hi], t);
  }

  // ── Combined filter application ──────────────────────────────────
  // Applies two filters simultaneously based on a blend ratio.
  // intensityA = overall intensity * (1 - ratio), intensityB = overall intensity * ratio.
  function applyCombinedFilter(data) {
    const { intensity, combineFilter1, combineFilter2, combineRatio } = data;
    const ratio = combineRatio ?? 0.5;
    const intensityA = intensity * (1 - ratio);
    const intensityB = intensity * ratio;

    const f1 = combineFilter1 || 'bluelight';
    const f2 = combineFilter2 || 'darkmode';
    const isBluelightA = (f1 === 'bluelight');
    const isBluelightB = (f2 === 'bluelight');

    // Case 1: bluelight + html-filter — overlay div + style tag coexist naturally
    if (isBluelightA && !isBluelightB) {
      applyBlueLight(intensityA);
      applyHtmlFilter(f2, intensityB);
      return;
    }
    if (isBluelightB && !isBluelightA) {
      applyBlueLight(intensityB);
      applyHtmlFilter(f1, intensityA);
      return;
    }

    // Case 2: bluelight + bluelight (shouldn't happen, but handle gracefully)
    if (isBluelightA && isBluelightB) {
      applyBlueLight(intensity);
      applyHtmlFilter(null, 0);
      return;
    }

    // Case 3: Two html-filter modes — mathematically merge into a single CSS chain.
    // Both filters produce {sepia, saturate, brightness, contrast} values.
    // Darkmode uses DARKMODE_COMPAT_KEYFRAMES for mergeability.
    applyBlueLight(0);

    const valsA = computeFilterValues(f1, intensityA);
    const valsB = computeFilterValues(f2, intensityB);

    if (!valsA && !valsB) { applyHtmlFilter(null, 0); return; }
    if (!valsA) { applyHtmlFilter(f2, intensityB); return; }
    if (!valsB) { applyHtmlFilter(f1, intensityA); return; }

    // Merge: sepia is additive (neutral=0), brightness/saturate/contrast are multiplicative (neutral=1)
    const merged = {};
    for (const k of Object.keys(valsA)) {
      if (k === 'sepia') {
        merged[k] = Math.min(1, valsA[k] + valsB[k]);
      } else {
        merged[k] = valsA[k] * valsB[k];
      }
    }

    const style = getHtmlFilterStyle();
    if (_pendingTimeout !== null) { clearTimeout(_pendingTimeout); _pendingTimeout = null; }
    _activeHtmlMode = 'combine';
    removeCBSvg();
    const f = (v) => v.toFixed(3);
    style.textContent = `
      html {
        filter: sepia(${f(merged.sepia)}) saturate(${f(merged.saturate)}) brightness(${f(merged.brightness)}) contrast(${f(merged.contrast)}) !important;
        transition: filter 0.8s ease !important;
      }
    `;
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
      removeCBSvg();
      style.textContent = `
        html { filter: none !important; transition: filter 10s ease !important; }
      `;
      return;
    }

    if (mode === 'darkmode') {
      removeCBSvg();
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
      removeCBSvg();
      style.textContent = `
        html {
          filter: ${computeFilterCSS(mode, intensity)} !important;
          transition: filter 10s ease !important;
        }
      `;
      return;
    }

    if (mode === 'grayscale') {
      removeCBSvg();
      const amount = (intensity / 100).toFixed(3);
      style.textContent = `
        html {
          filter: grayscale(${amount}) !important;
          transition: filter 0.8s ease !important;
        }
      `;
      return;
    }

    if (mode === 'colorblind') {
      const matrix = ensureCBSvg();
      matrix.setAttribute('values', computeCBMatrix(_cbType, intensity / 100));
      style.textContent = `
        html {
          filter: url(#${CB_FILTER_ID}) !important;
          transition: filter 0.8s ease !important;
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
    const isGrayscale   = mode === 'grayscale';
    const wasGrayscale  = prev === 'grayscale';
    const isColorblind  = mode === 'colorblind';
    const wasColorblind = prev === 'colorblind';
    const wasCombine    = prev === 'combine';
    const isCrossType   = (isDark && wasScientific) || (isScientific && wasDark) ||
                          (isGrayscale && (wasDark || wasScientific)) ||
                          ((isDark || isScientific) && wasGrayscale) ||
                          (isColorblind && prev !== null && prev !== 'colorblind') ||
                          (wasColorblind && mode !== 'colorblind' && mode !== null) ||
                          (wasCombine && mode !== 'combine' && mode !== null) ||
                          (!wasCombine && prev !== null && mode === 'combine');

    // ── OFF: fade current filter out ─────────────────────────────────
    if (intensity <= 0) {
      _activeHtmlMode = null;
      // Dark mode off: use a moderate fade to gently reduce brightness;
      // longer feels gentler but the image-inversion artifact (no counter-inversion
      // rules) lasts for the full duration, so keep it under ~1–2s.
      const dur = wasDark ? '3s' : '10s';
      style.textContent = `
        html { filter: none !important; transition: filter ${dur} ease !important; }
      `;
      return;
    }

    // ── CROSS-TYPE: scientific ↔ dark — CSS cannot interpolate ───────
    // Two-step: dissolve current filter to none first, then fade in the new one.
    if (isCrossType) {
      _activeHtmlMode = null;
      if (wasColorblind) removeCBSvg();

      const fadeOutMs = wasDark ? 2000 : 2000;
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
    } else if (mode === 'grayscale') {
      applyBlueLight(0);
      applyHtmlFilter('grayscale', intensity);
    } else if (mode === 'colorblind') {
      applyBlueLight(0);
      _cbType = data.colorblindType || 'deuteranopia';
      applyHtmlFilter('colorblind', intensity);
    } else if (mode === 'combine') {
      applyCombinedFilter(data);
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
          enabled: s.enabled && s.currentIntensity > 0,
          colorblindType: s.colorblindType,
          combineFilter1: s.combineFilter1,
          combineFilter2: s.combineFilter2,
          combineRatio: s.combineRatio
        });
      }
    });
  }

  requestStatus(3);
})();
