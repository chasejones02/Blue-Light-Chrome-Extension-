// NightGuard — Popup Script
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

    // Mode buttons
    modeBtns.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mode === currentSettings.mode);
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
  }

  function updateStatus() {
    const { enabled, isActive, currentIntensity, manualActive, intensity, timerEnabled } = currentSettings;

    if (!enabled) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Disabled';
      statusIntensity.textContent = '';
    } else if (manualActive) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Active — manual override';
      statusIntensity.textContent = `${intensity}%`;
    } else if (isActive && currentIntensity > 0) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Active — filtering';
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
      saveSettings();
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
    saveSettings();
    updateStatus();
  });

  // ── Initialize ───────────────────────────
  loadSettings();

  // Refresh status every 5 seconds while popup is open
  setInterval(loadSettings, 5000);
});
