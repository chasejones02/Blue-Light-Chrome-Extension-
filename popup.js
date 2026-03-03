// ChromeTones — Popup Script
// Handles UI interactions and settings management

document.addEventListener('DOMContentLoaded', () => {
  // ── Elements ─────────────────────────────
  const masterToggle = document.getElementById('masterToggle');
  const settingsArea = document.getElementById('settingsArea');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusIntensity = document.getElementById('statusIntensity');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const scheduleOptions = document.querySelectorAll('.schedule-option');
  const manualTimes = document.getElementById('manualTimes');
  const autoSection = document.getElementById('autoSection');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const locationBtn = document.getElementById('locationBtn');
  const sunTimes = document.getElementById('sunTimes');
  const sunsetTime = document.getElementById('sunsetTime');
  const sunriseTime = document.getElementById('sunriseTime');
  const intensitySlider = document.getElementById('intensitySlider');
  const intensityValue = document.getElementById('intensityValue');
  const setTimerBtn = document.getElementById('setTimerBtn');
  const activateBtn = document.getElementById('activateBtn');
  const pagesWrapper = document.getElementById('pagesWrapper');
  const exploreFiltersBtn = document.getElementById('exploreFiltersBtn');
  const backBtn = document.getElementById('backBtn');

  // Filter detail page elements
  const filterCards        = document.querySelectorAll('.filter-card');
  const backToFiltersBtn   = document.getElementById('backToFiltersBtn');
  const filterDetailName   = document.getElementById('filterDetailName');
  const filterMockup       = document.getElementById('filterMockup');
  const filterCCT          = document.getElementById('filterCCT');
  const filterDesc         = document.getElementById('filterDesc');
  const filterIntensitySlider = document.getElementById('filterIntensitySlider');
  const filterIntensityValue  = document.getElementById('filterIntensityValue');
  const filterActivateBtn  = document.getElementById('filterActivateBtn');
  const filterIntensityLabel = document.getElementById('filterIntensityLabel');
  const filterStrengthLabel  = document.getElementById('filterStrengthLabel');

  // Combine page elements
  const backFromCombineBtn  = document.getElementById('backFromCombineBtn');
  const combineFilter1Grid  = document.getElementById('combineFilter1Grid');
  const combineFilter2Grid  = document.getElementById('combineFilter2Grid');
  const combineRatioSlider  = document.getElementById('combineRatioSlider');
  const combineRatioValue   = document.getElementById('combineRatioValue');
  const combineActivateBtn  = document.getElementById('combineActivateBtn');
  const combineRatioLabelA  = document.getElementById('combineRatioLabelA');
  const combineRatioLabelB  = document.getElementById('combineRatioLabelB');

  // Color blindness type selector elements
  const cbTypeSection = document.getElementById('cbTypeSection');
  const cbTypeBtns    = document.querySelectorAll('.cb-type-option');
  const cbTypeDesc    = document.getElementById('cbTypeDesc');

  // Metadata for the three scientific filter modes
  const FILTER_META = {
    'sleep-prep': {
      name: 'Sleep Prep',
      swatchColor: '#FF9A00',
      desc: 'Aggressively blocks melatonin-suppressing blue light (peak 480 nm). Best used 1–3 hours before sleep.',
      cctStops: [[20, '~4500K'], [40, '~3300K'], [60, '~2700K'], [80, '~2200K'], [100, '~1900K']]
    },
    'reduce-eye-strain': {
      name: 'Reduce Eye Strain',
      swatchColor: '#FFF5E0',
      desc: 'Subtly warms the display from 6500K toward 5000K, reducing the harsh LED blue spike without distorting colors.',
      cctStops: [[20, '~6200K'], [40, '~5800K'], [60, '~5400K'], [80, '~5100K'], [100, '~4800K']]
    },
    'reader-mode': {
      name: 'Reader Mode',
      swatchColor: '#F5E6C8',
      desc: 'Low-contrast sepia warmth mimicking warm paper. Reduces glare and contrast fatigue during long reading sessions.',
      cctStops: [[20, '~5800K'], [40, '~4500K'], [60, '~3800K'], [80, '~3400K'], [100, '~3000K']]
    },
    'grayscale': {
      name: 'Grayscale',
      swatchColor: 'linear-gradient(135deg, #6b7280, #d1d5db)',
      desc: 'Removes color from the screen to reduce dopamine-triggering design patterns. 60–80% desaturation is less jarring while still cutting color distraction.',
      cctStops: [[20, 'Subtle'], [40, 'Moderate'], [60, 'Strong'], [80, 'Very Strong'], [100, 'Full Grayscale']]
    },
    'colorblind': {
      name: 'Color Blind Assist',
      swatchColor: 'linear-gradient(135deg, #4ade80, #6c8cff, #f5a623)',
      desc: 'Applies Daltonization correction to shift colors you cannot perceive into channels you can. Based on Viénot, Brettel & Mollon simulation models.',
      cctStops: [[20, 'Subtle'], [40, 'Moderate'], [60, 'Strong'], [80, 'Very Strong'], [100, 'Full Correction']]
    }
  };

  const CB_TYPE_META = {
    protanopia:   { label: 'Protanopia',   desc: 'Red-blind (L-cone deficiency). ~1.3% of males. Difficulty distinguishing red from green.' },
    deuteranopia: { label: 'Deuteranopia', desc: 'Green-blind (M-cone deficiency). ~5% of males. Most common form. Red-green confusion.' },
    tritanopia:   { label: 'Tritanopia',   desc: 'Blue-blind (S-cone deficiency). ~0.01% of population. Blue-yellow confusion.' }
  };

  // ── Filter CSS computation (mirrored from content.js) ──
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

  function updateMockupFilter(mode, intensity) {
    if (!filterMockup) return;
    if (mode === 'grayscale') {
      filterMockup.style.filter = `grayscale(${(intensity / 100).toFixed(3)})`;
    } else if (FILTER_KEYFRAMES[mode]) {
      filterMockup.style.filter = computeFilterCSS(mode, intensity);
    } else {
      filterMockup.style.filter = 'none';
    }
  }

  // ── Color Blindness Ishihara Preview ──────────────────────────
  const CB_SIM = {
    protanopia:   [0.152286,1.052583,-0.204868, 0.114503,0.786281,0.099216, -0.003882,-0.048116,1.051998],
    deuteranopia: [0.367322,0.860646,-0.227968, 0.280085,0.672501,0.047413, -0.011820,0.042940,0.968881],
    tritanopia:   [1.255528,-0.076749,-0.178779, -0.078411,0.930809,0.147602, 0.004733,0.691367,0.303900]
  };
  const CB_ERR_SHIFT = {
    protanopia:   [0,0,0, 0.7,0,0, 0.7,0,0],
    deuteranopia: [0,0.7,0, 0,0,0, 0,0.7,0],
    tritanopia:   [0,0,0.7, 0,0,0.7, 0,0,0]
  };
  const I3 = [1,0,0, 0,1,0, 0,0,1];

  function mul3(A, B) {
    const R = new Array(9);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        R[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return R;
  }

  function computeCBMatrix(type, severity) {
    const sim = CB_SIM[type] || CB_SIM.deuteranopia;
    const es  = CB_ERR_SHIFT[type] || CB_ERR_SHIFT.deuteranopia;
    const diff = I3.map((v, i) => v - sim[i]);
    const corr = mul3(es, diff);
    const M = I3.map((v, i) => v + severity * corr[i]);
    const f = (v) => v.toFixed(6);
    return [
      f(M[0]), f(M[1]), f(M[2]), '0', '0',
      f(M[3]), f(M[4]), f(M[5]), '0', '0',
      f(M[6]), f(M[7]), f(M[8]), '0', '0',
      '0',     '0',     '0',     '1', '0'
    ].join(' ');
  }

  // Ishihara plate colors: background vs number dots, per deficiency type
  const ISHIHARA_COLORS = {
    protanopia: {
      bg:  ['#4CAF50', '#66BB6A', '#388E3C', '#81C784', '#2E7D32', '#A5D6A7'],
      num: ['#F44336', '#E57373', '#D32F2F', '#EF5350', '#C62828', '#FF8A80']
    },
    deuteranopia: {
      bg:  ['#EF5350', '#E57373', '#F44336', '#FF7043', '#D32F2F', '#FF8A65'],
      num: ['#66BB6A', '#4CAF50', '#81C784', '#A5D6A7', '#388E3C', '#C8E6C9']
    },
    tritanopia: {
      bg:  ['#42A5F5', '#64B5F6', '#1E88E5', '#90CAF9', '#1565C0', '#BBDEFB'],
      num: ['#FFEE58', '#FFF176', '#FFD54F', '#FFE082', '#FBC02D', '#FFF9C4']
    }
  };

  // Number shapes on a 5×7 grid (col × row). 1 = number dot.
  const ISHIHARA_NUMBERS = {
    protanopia: { digit: '8', grid: [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ]},
    deuteranopia: { digit: '5', grid: [
      [1,1,1,1,1],
      [1,0,0,0,0],
      [1,1,1,1,0],
      [0,0,0,0,1],
      [0,0,0,0,1],
      [1,0,0,0,1],
      [0,1,1,1,0]
    ]},
    tritanopia: { digit: '2', grid: [
      [0,1,1,1,0],
      [1,0,0,0,1],
      [0,0,0,0,1],
      [0,0,0,1,0],
      [0,0,1,0,0],
      [0,1,0,0,0],
      [1,1,1,1,1]
    ]}
  };

  // Seeded PRNG for deterministic plate generation
  function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  }

  function generateIshiharaPlate(type) {
    const size = 140;
    const cx = size / 2, cy = size / 2, R = size / 2 - 2;
    const grid = ISHIHARA_NUMBERS[type].grid;
    const colors = ISHIHARA_COLORS[type];
    const rand = seededRandom(type === 'protanopia' ? 42 : type === 'deuteranopia' ? 137 : 271);

    // Pack circles inside the main circle
    const dots = [];
    const minR = 3.5, maxR = 6;
    const gap = 1.2;

    for (let attempt = 0; attempt < 1200; attempt++) {
      const r = minR + rand() * (maxR - minR);
      const x = 2 + rand() * (size - 4);
      const y = 2 + rand() * (size - 4);

      // Must be inside the outer circle
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > (R - r) * (R - r)) continue;

      // Check overlap with existing dots
      let overlaps = false;
      for (const d of dots) {
        const ddx = x - d.x, ddy = y - d.y;
        const minDist = r + d.r + gap;
        if (ddx * ddx + ddy * ddy < minDist * minDist) { overlaps = true; break; }
      }
      if (overlaps) continue;

      // Determine if this dot falls on the number shape
      const gridCol = Math.floor(((x - cx) / R + 1) / 2 * 5);
      const gridRow = Math.floor(((y - cy) / R + 1) / 2 * 7);
      const isNumber = gridRow >= 0 && gridRow < 7 && gridCol >= 0 && gridCol < 5 && grid[gridRow][gridCol] === 1;
      const palette = isNumber ? colors.num : colors.bg;
      const color = palette[Math.floor(rand() * palette.length)];

      dots.push({ x, y, r, color });
    }

    // Build SVG
    let circles = '';
    for (const d of dots) {
      circles += `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}" fill="${d.color}"/>`;
    }

    return `<svg class="ishihara-plate" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="ishihara-clip-${type}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="#1a1a1a"/>
      <g clip-path="url(#ishihara-clip-${type})">${circles}</g>
    </svg>`;
  }

  // SVG filter for the popup preview
  const CB_PREVIEW_FILTER_ID = 'chrometones-cb-preview';
  let cbPreviewSvg = null;

  function ensureCBPreviewSvg() {
    if (!cbPreviewSvg) {
      const NS = 'http://www.w3.org/2000/svg';
      cbPreviewSvg = document.createElementNS(NS, 'svg');
      cbPreviewSvg.setAttribute('style', 'position:absolute;width:0;height:0;pointer-events:none');
      const filter = document.createElementNS(NS, 'filter');
      filter.id = CB_PREVIEW_FILTER_ID;
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      const matrix = document.createElementNS(NS, 'feColorMatrix');
      matrix.setAttribute('type', 'matrix');
      matrix.setAttribute('values', computeCBMatrix('deuteranopia', 0));
      filter.appendChild(matrix);
      cbPreviewSvg.appendChild(filter);
      document.body.appendChild(cbPreviewSvg);
    }
    return cbPreviewSvg.querySelector('feColorMatrix');
  }

  const filterIshihara = document.getElementById('filterIshihara');

  function showIshiharaPreview(type, intensity) {
    if (!filterIshihara) return;

    // Generate two plates: uncorrected (left) and corrected (right)
    const plateHtml = generateIshiharaPlate(type);

    filterIshihara.innerHTML =
      `<div style="text-align:center">
        <div style="opacity:0.7">${plateHtml}</div>
        <div class="ishihara-label">Without</div>
      </div>
      <div style="text-align:center">
        <div style="filter:url(#${CB_PREVIEW_FILTER_ID})">${plateHtml}</div>
        <div class="ishihara-label">With correction</div>
      </div>`;

    // Update the SVG filter matrix
    const matrix = ensureCBPreviewSvg();
    matrix.setAttribute('values', computeCBMatrix(type, intensity / 100));
  }

  function updateIshiharaFilter(type, intensity) {
    const matrix = ensureCBPreviewSvg();
    matrix.setAttribute('values', computeCBMatrix(type, intensity / 100));
  }

  function getNearestCCT(mode, intensity) {
    const meta = FILTER_META[mode];
    if (!meta) return '';
    return meta.cctStops.reduce((prev, curr) =>
      Math.abs(curr[0] - intensity) < Math.abs(prev[0] - intensity) ? curr : prev
    )[1];
  }

  let currentDetailMode = null;

  let currentSettings = {};

  // ── Load Settings ────────────────────────
  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (!response || !response.settings) return;
      currentSettings = response.settings;
      updateUI();
    });
  }

  // ── Save Settings ────────────────────────
  function saveSettings() {
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: currentSettings
    });
  }

  // ── Update UI from Settings ──────────────
  function updateUI() {
    // Master toggle
    masterToggle.checked = currentSettings.enabled;
    settingsArea.classList.toggle('disabled-overlay', !currentSettings.enabled);

    // Status
    updateStatus();

    // Mode buttons (main page: bluelight / darkmode / both)
    modeBtns.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mode === currentSettings.mode);
    });

    // Filter cards (filters page: sleep-prep / reduce-eye-strain / reader-mode)
    filterCards.forEach(card => {
      card.classList.toggle('selected', card.dataset.filter === currentSettings.mode);
    });

    // Schedule type
    scheduleOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.type === currentSettings.scheduleType);
    });

    if (currentSettings.scheduleType === 'manual') {
      setTimerBtn.classList.remove('hidden');
      autoSection.classList.add('hidden');
      if (currentSettings.timerEnabled) {
        manualTimes.classList.remove('hidden');
        setTimerBtn.textContent = 'Deactivate Timer';
      } else {
        manualTimes.classList.add('hidden');
        setTimerBtn.textContent = '⏱ Set Timer';
      }
    } else {
      setTimerBtn.classList.add('hidden');
      manualTimes.classList.add('hidden');
      autoSection.classList.remove('hidden');
    }

    // Activate button
    if (currentSettings.manualActive) {
      activateBtn.textContent = '⏹ Deactivate Filter';
      activateBtn.classList.add('active');
    } else {
      activateBtn.textContent = '✦ Activate Filter';
      activateBtn.classList.remove('active');
    }

    // Time inputs
    startTimeInput.value = currentSettings.startTime || '21:00';
    endTimeInput.value = currentSettings.endTime || '07:00';

    // Location
    if (currentSettings.latitude && currentSettings.longitude) {
      locationBtn.textContent = '✅ Location Set';
      locationBtn.classList.add('set');
      sunTimes.classList.remove('hidden');
      sunsetTime.textContent = currentSettings.startTime || '--:--';
      sunriseTime.textContent = currentSettings.endTime || '--:--';
    }

    // Intensity
    intensitySlider.value = currentSettings.intensity || 80;
    intensityValue.textContent = `${currentSettings.intensity || 80}%`;

    // Combine page (sync if open)
    updateCombinePageUI();
  }

  const MODE_NAMES = {
    'bluelight':          'Blue Light',
    'darkmode':           'Dark Mode',
    'both':               'Blue Light + Dark',
    'combine':            'Combined',
    'sleep-prep':         'Sleep Prep',
    'reduce-eye-strain':  'Eye Strain',
    'reader-mode':        'Reader Mode',
    'grayscale':          'Grayscale',
    'colorblind':         'Color Blind Assist'
  };

  function updateStatus() {
    const { enabled, isActive, currentIntensity, manualActive, intensity, timerEnabled, mode } = currentSettings;
    const modeName = MODE_NAMES[mode] || mode;

    if (!enabled) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Disabled';
      statusIntensity.textContent = '';
    } else if (manualActive) {
      statusDot.className = 'status-dot active';
      statusText.textContent = `Active — ${modeName}`;
      statusIntensity.textContent = `${intensity}%`;
    } else if (isActive && currentIntensity > 0) {
      statusDot.className = 'status-dot active';
      statusText.textContent = `Active — ${modeName}`;
      statusIntensity.textContent = `${currentIntensity}%`;
    } else if (timerEnabled) {
      statusDot.className = 'status-dot scheduled';
      statusText.textContent = `Scheduled: ${formatTime(currentSettings.startTime)}`;
      statusIntensity.textContent = '';
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Inactive';
      statusIntensity.textContent = '';
    }
  }

  function formatTime(timeStr) {
    if (!timeStr) return '--:--';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  // ── Event Listeners ──────────────────────

  // ── Page Navigation ───────────────────────
  exploreFiltersBtn.addEventListener('click', () => {
    pagesWrapper.classList.remove('on-detail');
    pagesWrapper.classList.add('on-filters');
  });

  backBtn.addEventListener('click', () => {
    pagesWrapper.classList.remove('on-filters');
    pagesWrapper.classList.remove('on-detail');
    pagesWrapper.classList.remove('on-combine');
  });

  backToFiltersBtn.addEventListener('click', () => {
    pagesWrapper.classList.remove('on-detail');
  });

  // ── Color Blindness Type Selection ──────
  cbTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cbTypeBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentSettings.colorblindType = btn.dataset.cbtype;
      cbTypeDesc.textContent = CB_TYPE_META[btn.dataset.cbtype].desc;
      // Update Ishihara preview with the new deficiency type
      if (currentDetailMode === 'colorblind') {
        const intensity = parseInt(filterIntensitySlider.value);
        showIshiharaPreview(btn.dataset.cbtype, intensity);
      }
      // Apply immediately if this mode is already active
      if (currentSettings.mode === 'colorblind' && currentSettings.manualActive) {
        saveSettings();
      }
    });
  });

  // ── Filter Card → Detail Page ─────────────
  filterCards.forEach(card => {
    card.addEventListener('click', () => {
      currentDetailMode = card.dataset.filter;
      const meta = FILTER_META[currentDetailMode];
      if (!meta) return;

      // Populate detail page
      filterDetailName.textContent = meta.name;
      filterDesc.textContent = meta.desc;

      const intensity = currentSettings.intensity || 80;
      filterIntensitySlider.value = intensity;
      filterIntensityValue.textContent = `${intensity}%`;
      filterCCT.textContent = getNearestCCT(currentDetailMode, intensity);

      // Toggle between webpage mockup and Ishihara preview
      if (currentDetailMode === 'colorblind') {
        filterMockup.classList.add('hidden');
        filterIshihara.classList.remove('hidden');
        const cbType = currentSettings.colorblindType || 'deuteranopia';
        showIshiharaPreview(cbType, intensity);

        cbTypeSection.classList.remove('hidden');
        filterIntensityLabel.textContent = 'Severity';
        filterStrengthLabel.textContent = 'Correction strength';
        cbTypeBtns.forEach(b => b.classList.toggle('selected', b.dataset.cbtype === cbType));
        cbTypeDesc.textContent = CB_TYPE_META[cbType].desc;
      } else {
        filterMockup.classList.remove('hidden');
        filterIshihara.classList.add('hidden');
        updateMockupFilter(currentDetailMode, intensity);

        cbTypeSection.classList.add('hidden');
        filterIntensityLabel.textContent = 'Intensity';
        filterStrengthLabel.textContent = 'Filter strength';
      }

      // Reflect whether this mode is currently active
      const isActive = currentSettings.mode === currentDetailMode && currentSettings.manualActive;
      filterActivateBtn.textContent = isActive ? '⏹ Deactivate Filter' : '✦ Activate Filter';
      filterActivateBtn.classList.toggle('active', isActive);

      pagesWrapper.classList.add('on-detail');
    });
  });

  // ── Detail Page: Intensity Slider ─────────
  filterIntensitySlider.addEventListener('input', () => {
    const val = parseInt(filterIntensitySlider.value);
    filterIntensityValue.textContent = `${val}%`;
    filterCCT.textContent = getNearestCCT(currentDetailMode, val);
    if (currentDetailMode === 'colorblind') {
      const cbType = currentSettings.colorblindType || 'deuteranopia';
      updateIshiharaFilter(cbType, val);
    } else {
      updateMockupFilter(currentDetailMode, val);
    }
  });

  filterIntensitySlider.addEventListener('change', () => {
    currentSettings.intensity = parseInt(filterIntensitySlider.value);
    // Apply immediately if this mode is already the active one
    if (currentSettings.mode === currentDetailMode && currentSettings.manualActive) {
      saveSettings();
    }
  });

  // ── Detail Page: Activate Button ──────────
  filterActivateBtn.addEventListener('click', () => {
    const alreadyActive = currentSettings.mode === currentDetailMode && currentSettings.manualActive;

    if (alreadyActive) {
      currentSettings.manualActive = false;
      filterActivateBtn.textContent = '✦ Activate Filter';
      filterActivateBtn.classList.remove('active');
    } else {
      currentSettings.mode = currentDetailMode;
      currentSettings.intensity = parseInt(filterIntensitySlider.value);
      currentSettings.manualActive = true;
      filterActivateBtn.textContent = '⏹ Deactivate Filter';
      filterActivateBtn.classList.add('active');
      // Deselect main-page mode buttons since a filter-card mode is now active
      modeBtns.forEach(b => b.classList.remove('selected'));
    }

    // Sync filter card selected states
    filterCards.forEach(card => {
      card.classList.toggle('selected', card.dataset.filter === currentSettings.mode && currentSettings.manualActive);
    });

    saveSettings();
    updateStatus();
  });

  // Master toggle
  masterToggle.addEventListener('change', () => {
    currentSettings.enabled = masterToggle.checked;
    settingsArea.classList.toggle('disabled-overlay', !masterToggle.checked);
    saveSettings();
    updateStatus();
  });

  // Mode selection
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentSettings.mode = btn.dataset.mode;

      if (btn.dataset.mode === 'combine') {
        pagesWrapper.classList.remove('on-filters', 'on-detail');
        pagesWrapper.classList.add('on-combine');
        updateCombinePageUI();
      } else {
        saveSettings();
      }
    });
  });

  // Schedule type
  scheduleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      scheduleOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      currentSettings.scheduleType = opt.dataset.type;

      // Reset timer when switching schedule type
      currentSettings.timerEnabled = false;
      setTimerBtn.textContent = '⏱ Set Timer';

      if (opt.dataset.type === 'manual') {
        setTimerBtn.classList.remove('hidden');
        manualTimes.classList.add('hidden');
        autoSection.classList.add('hidden');
      } else {
        setTimerBtn.classList.add('hidden');
        manualTimes.classList.add('hidden');
        autoSection.classList.remove('hidden');
      }
      saveSettings();
    });
  });

  // Set Timer / Deactivate Timer toggle
  setTimerBtn.addEventListener('click', () => {
    currentSettings.timerEnabled = !currentSettings.timerEnabled;
    if (currentSettings.timerEnabled) {
      manualTimes.classList.remove('hidden');
      setTimerBtn.textContent = 'Deactivate Timer';
    } else {
      manualTimes.classList.add('hidden');
      setTimerBtn.textContent = '⏱ Set Timer';
    }
    saveSettings();
    updateStatus();
  });

  // Time inputs
  startTimeInput.addEventListener('change', () => {
    currentSettings.startTime = startTimeInput.value;
    saveSettings();
  });

  endTimeInput.addEventListener('change', () => {
    currentSettings.endTime = endTimeInput.value;
    saveSettings();
  });

  // Location detection
  locationBtn.addEventListener('click', () => {
    locationBtn.textContent = '📍 Detecting...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentSettings.latitude = position.coords.latitude;
        currentSettings.longitude = position.coords.longitude;
        locationBtn.textContent = '✅ Location Set';
        locationBtn.classList.add('set');
        saveSettings();

        // Wait for background to calculate sun times, then refresh
        setTimeout(() => {
          loadSettings();
        }, 500);
      },
      (_error) => {
        locationBtn.textContent = '❌ Location denied — try again';
        setTimeout(() => {
          locationBtn.textContent = '📍 Detect My Location';
        }, 3000);
      },
      { timeout: 10000 }
    );
  });

  // Intensity slider
  intensitySlider.addEventListener('input', () => {
    const val = intensitySlider.value;
    intensityValue.textContent = `${val}%`;
    currentSettings.intensity = parseInt(val);
  });

  intensitySlider.addEventListener('change', () => {
    saveSettings();
  });

  // Activate Filter button
  activateBtn.addEventListener('click', () => {
    currentSettings.manualActive = !currentSettings.manualActive;
    if (currentSettings.manualActive) {
      activateBtn.textContent = '⏹ Deactivate Filter';
      activateBtn.classList.add('active');
    } else {
      activateBtn.textContent = '✦ Activate Filter';
      activateBtn.classList.remove('active');
    }
    // Sync filter card selected states (handles deactivating a filter-card mode from the main page)
    filterCards.forEach(card => {
      card.classList.toggle('selected', card.dataset.filter === currentSettings.mode && currentSettings.manualActive);
    });
    saveSettings();
    updateStatus();
  });

  // ── Combine Filters Page ─────────────────

  const COMBINE_FILTER_NAMES = {
    'bluelight':         'Blue Light',
    'darkmode':          'Dark Mode',
    'sleep-prep':        'Sleep Prep',
    'reduce-eye-strain': 'Eye Strain',
    'reader-mode':       'Reader'
  };

  function updateCombineRatioLabels() {
    const f1Name = COMBINE_FILTER_NAMES[currentSettings.combineFilter1] || 'Filter A';
    const f2Name = COMBINE_FILTER_NAMES[currentSettings.combineFilter2] || 'Filter B';
    combineRatioLabelA.textContent = f1Name;
    combineRatioLabelB.textContent = f2Name;
    const pctA = Math.round((1 - (currentSettings.combineRatio ?? 0.5)) * 100);
    const pctB = 100 - pctA;
    combineRatioValue.textContent = `${pctA} / ${pctB}`;
  }

  function updateCombineDisabledStates() {
    const f1 = currentSettings.combineFilter1;
    const f2 = currentSettings.combineFilter2;
    combineFilter1Grid.querySelectorAll('.combine-option').forEach(opt => {
      opt.classList.toggle('disabled', opt.dataset.combine === f2);
    });
    combineFilter2Grid.querySelectorAll('.combine-option').forEach(opt => {
      opt.classList.toggle('disabled', opt.dataset.combine === f1);
    });
  }

  function updateCombinePageUI() {
    const f1 = currentSettings.combineFilter1 || 'bluelight';
    const f2 = currentSettings.combineFilter2 || 'darkmode';
    const ratio = currentSettings.combineRatio ?? 0.5;

    combineFilter1Grid.querySelectorAll('.combine-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.combine === f1);
    });
    combineFilter2Grid.querySelectorAll('.combine-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.combine === f2);
    });

    combineRatioSlider.value = Math.round(ratio * 100);
    updateCombineDisabledStates();
    updateCombineRatioLabels();

    const isActive = currentSettings.mode === 'combine' && currentSettings.manualActive;
    combineActivateBtn.textContent = isActive ? '⏹ Deactivate Combined Filter' : '✦ Activate Combined Filter';
    combineActivateBtn.classList.toggle('active', isActive);
  }

  function setupCombineGrid(grid, settingsKey) {
    grid.querySelectorAll('.combine-option').forEach(opt => {
      opt.addEventListener('click', () => {
        grid.querySelectorAll('.combine-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        currentSettings[settingsKey] = opt.dataset.combine;
        updateCombineDisabledStates();
        updateCombineRatioLabels();
        if (currentSettings.mode === 'combine' && currentSettings.manualActive) {
          saveSettings();
        }
      });
    });
  }

  setupCombineGrid(combineFilter1Grid, 'combineFilter1');
  setupCombineGrid(combineFilter2Grid, 'combineFilter2');

  combineRatioSlider.addEventListener('input', () => {
    currentSettings.combineRatio = parseInt(combineRatioSlider.value) / 100;
    updateCombineRatioLabels();
  });

  combineRatioSlider.addEventListener('change', () => {
    if (currentSettings.mode === 'combine' && currentSettings.manualActive) {
      saveSettings();
    }
  });

  combineActivateBtn.addEventListener('click', () => {
    const alreadyActive = currentSettings.mode === 'combine' && currentSettings.manualActive;

    if (alreadyActive) {
      currentSettings.manualActive = false;
      combineActivateBtn.textContent = '✦ Activate Combined Filter';
      combineActivateBtn.classList.remove('active');
    } else {
      currentSettings.mode = 'combine';
      currentSettings.manualActive = true;
      combineActivateBtn.textContent = '⏹ Deactivate Combined Filter';
      combineActivateBtn.classList.add('active');
    }

    // Sync main-page mode buttons and filter cards
    modeBtns.forEach(b => b.classList.toggle('selected', b.dataset.mode === currentSettings.mode));
    filterCards.forEach(card => {
      card.classList.toggle('selected', card.dataset.filter === currentSettings.mode && currentSettings.manualActive);
    });

    saveSettings();
    updateStatus();
  });

  backFromCombineBtn.addEventListener('click', () => {
    pagesWrapper.classList.remove('on-combine');
  });

  // ── Initialize ───────────────────────────
  loadSettings();

  // Refresh status every 5 seconds while popup is open
  setInterval(loadSettings, 5000);
});
