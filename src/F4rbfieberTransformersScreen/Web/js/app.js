import { subscribe, subscribeSettings, getSettings, format, isNativeTelemetry, isNativeHost } from './telemetry.js';
import { PROFILES, getProfile, getProfileAppearance, getProfileAsset, getEnabledProfileIds } from './profiles.js';

const $ = selector => document.querySelector(selector);
const app = $('#app');
const profileSelect = $('#profileSelect');
const history = {
  cpu: Array(80).fill(12),
  gpu: Array(80).fill(28),
  ram: Array(80).fill(45),
  network: Array(80).fill(10)
};
let activeProfile = PROFILES.optimus;
let activeForm = 'robot';
let lastSample = 0;
let nextFormSwitch = Number.POSITIVE_INFINITY;
let nextProfileSwitch = Number.POSITIVE_INFINITY;
let lastLog = 0;
let profileTransitionToken = 0;
let randomEventTimer = 0;
let isEventActive = false;
let alertCloseTimer = 0;
let alertProgressAnimation = null;
let alertAnimationToken = 0;
let alertDecodeTimers = [];
let uptimeEasterEggTimer = 0;
let uptimeReadableTimer = 0;
const ALERT_PROGRESS_DURATION_MS = 4200;
const ALERT_ENCRYPTED_HOLD_MS = 450;
const ALERT_DECODE_DURATION_MS = 760;
const ALERT_COMPLETE_HOLD_MS = 500;
const UPTIME_EASTER_EGG_MIN_DELAY_MS = 8 * 60 * 1000;
const UPTIME_EASTER_EGG_MAX_DELAY_MS = 20 * 60 * 1000;
const UPTIME_READABLE_MIN_DURATION_MS = 2000;
const UPTIME_READABLE_MAX_DURATION_MS = 3000;
const DECODE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#?/<>'.split('');

for (const profile of Object.values(PROFILES)) {
  const option = document.createElement('option');
  option.value = profile.id;
  option.textContent = `${profile.name} // ${profile.faction}`;
  profileSelect.append(option);
}

function setProfile(profileId, animate = true, targetForm = activeForm) {
  const nextProfile = getProfile(profileId);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reducedMotion || nextProfile.id === activeProfile.id) {
    profileTransitionToken += 1;
    app.classList.remove('profile-switch-out', 'profile-switch-in');
    commitProfile(nextProfile, targetForm);
    return;
  }

  const transitionToken = ++profileTransitionToken;
  nextProfileSwitch = Number.POSITIVE_INFINITY;
  app.classList.remove('profile-switch-in');
  app.classList.add('profile-switch-out');

  window.setTimeout(() => {
    if (transitionToken !== profileTransitionToken) return;
    commitProfile(nextProfile, targetForm);
    app.classList.remove('profile-switch-out');
    app.classList.add('profile-switch-in');
    window.setTimeout(() => {
      if (transitionToken === profileTransitionToken) app.classList.remove('profile-switch-in');
    }, 620);
  }, 340);
}

function commitProfile(profile, targetForm = activeForm) {
  activeProfile = profile;
  app.dataset.profile = activeProfile.id;
  applyPalette();
  profileSelect.value = activeProfile.id;
  $('#hologramTitle').textContent = activeProfile.name;
  $('#profileFaction').textContent = `${activeProfile.faction} // HOLOGRAMM`;
  $('#profileRole').textContent = activeProfile.role;
  $('#altModeLabel').textContent = getProfileAppearance(activeProfile).altLabel;
  setFactionLogo($('#headerFactionLogo'), activeProfile.factionLogo);
  setFactionLogo($('#factionWatermark'), activeProfile.factionLogo);
  setForm(targetForm === 'alt' ? 'alt' : 'robot', false);
  scheduleFormSwitch();
  scheduleProfileSwitch();
}

function scheduleFormSwitch() {
  const interval = Number(getSettings().transformationIntervalSeconds);
  nextFormSwitch = Number.isFinite(interval) && interval > 0
    ? performance.now() + interval * 1000
    : Number.POSITIVE_INFINITY;
}

function scheduleProfileSwitch() {
  const settings = getSettings();
  const enabledProfileIds = getEnabledProfileIds(settings, activeProfile.id);
  nextProfileSwitch = settings.profileMode === 'cycle' && enabledProfileIds.length > 1
    ? performance.now() + Math.max(30, Number(getSettings().profileCycleIntervalSeconds) || 60) * 1000
    : Number.POSITIVE_INFINITY;
}

function setFactionLogo(image, source) {
  const hasLogo = Boolean(source);
  image.hidden = !hasLogo;
  image.style.display = hasLogo ? '' : 'none';
  if (hasLogo) image.src = source;
  else image.removeAttribute('src');
}

function applyPalette() {
  const appearance = getProfileAppearance(activeProfile);
  app.style.setProperty('--primary', appearance.primary);
  app.style.setProperty('--secondary', appearance.secondary);
  app.style.setProperty('--accent', appearance.accent);
  app.style.setProperty('--ink', appearance.ink);
}

function setForm(form, animate = true) {
  activeForm = form === 'alt' ? 'alt' : 'robot';
  const frame = $('#hologramFrame');
  const image = $('#hologramImage');
  const echo = $('#hologramEcho');
  if (animate) {
    frame.classList.remove('transforming');
    void frame.offsetWidth;
    frame.classList.add('transforming');
  }
  const source = getProfileAsset(activeProfile, activeForm);
  image.src = source;
  const altLabel = getProfileAppearance(activeProfile).altLabel;
  image.alt = activeForm === 'robot'
    ? `${activeProfile.name} als Comic-Roboter`
    : `${activeProfile.name} im Comic-Alt-Mode ${altLabel}`;
  echo.src = source;
  app.dataset.form = activeForm;
  $('#robotMode').classList.toggle('active', activeForm === 'robot');
  $('#altMode').classList.toggle('active', activeForm === 'alt');
}

profileSelect.addEventListener('change', () => {
  setProfile(profileSelect.value);
  window.chrome?.webview?.postMessage({ command: 'setTransformerProfile', value: profileSelect.value });
});
$('#robotMode').addEventListener('click', () => { setForm('robot'); scheduleFormSwitch(); });
$('#altMode').addEventListener('click', () => { setForm('alt'); scheduleFormSwitch(); });

$('#settingsButton').addEventListener('click', () => triggerRandomEvent(true));

class Sparkline {
  constructor(canvas, key, fill = true) { this.canvas = canvas; this.key = key; this.fill = fill; this.ctx = canvas.getContext('2d'); }
  draw() {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(2, Math.round(box.width * dpr));
    const height = Math.max(2, Math.round(box.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const values = history[this.key];
    const ctx = this.ctx;
    const color = getComputedStyle(app).getPropertyValue('--accent').trim() || '#65d9ff';
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(92, 166, 201, .13)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += width / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = index / (values.length - 1) * width;
      const y = height - Math.max(1, Math.min(99, value)) / 100 * height * .86 - height * .06;
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    if (this.fill) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, color + '45');
      gradient.addColorStop(1, color + '04');
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath();
      values.forEach((value, index) => { const x = index / (values.length - 1) * width; const y = height - Math.max(1, Math.min(99, value)) / 100 * height * .86 - height * .06; index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    }
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, dpr); ctx.shadowColor = color; ctx.shadowBlur = 4 * dpr; ctx.stroke(); ctx.shadowBlur = 0;
  }
}

const charts = [
  new Sparkline($('#cpuChart'), 'cpu'),
  new Sparkline($('#gpuChart'), 'gpu'),
  new Sparkline($('#ramChart'), 'ram'),
  new Sparkline($('#networkChart'), 'network', false)
];

function pushHistory(data, now) {
  if (now - lastSample < 720) return;
  lastSample = now;
  const values = { cpu: data.cpu.usage || 0, gpu: data.gpu.usage || 0, ram: data.ram.usage || 0, network: Math.min(100, Math.log10(1 + (data.network.download || 0)) * 32) };
  for (const [key, value] of Object.entries(values)) { history[key].push(value); history[key].shift(); }
}

function renderCoreGrid(cores) {
  const grid = $('#coreGrid');
  const safeCores = cores?.length ? cores : Array(8).fill(0);
  if (grid.childElementCount !== safeCores.length) grid.replaceChildren(...safeCores.map(() => document.createElement('i')));
  [...grid.children].forEach((bar, index) => bar.style.setProperty('--load', Math.max(.07, Math.min(1, (safeCores[index] || 0) / 100))));
}

function renderProcesses(processes) {
  const rows = (processes || []).slice(0, 8).map(process => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${Number(process.id) || 0}</td><td>${escapeHtml(process.name)}</td><td>${format(Number(process.cpu), 1, '%')}</td><td>${format(Number(process.memory), 0, ' MB')}</td><td title="${escapeHtml(process.status || 'RUNNING')}"><i></i></td>`;
    return row;
  });
  $('#processRows').replaceChildren(...rows);
  $('#processCount').textContent = String(processes?.length || 0);
}

function renderTemperature(selector, value) {
  const output = $(selector);
  const numericValue = Number(value);
  const available = (!isNativeHost() || isNativeTelemetry()) &&
    value != null && Number.isFinite(numericValue) && numericValue > 5 && numericValue < 130;
  output.closest('.temperature-reading').hidden = !available;
  output.textContent = available ? format(numericValue, 0, '°C') : '';
}

function renderTelemetry(data, now) {
  const stamp = data.timestamp ? new Date(data.timestamp) : new Date();
  $('#clock').textContent = stamp.toLocaleTimeString('de-DE', { hour12: false });
  $('#date').textContent = stamp.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
  $('#hostName').textContent = (getSettings().customName || data.computerName || 'LOCAL NODE').toUpperCase();
  $('#windowsVersion').textContent = compactWindows(data.windowsVersion);
  $('#uptime').textContent = data.uptime || '00:00:00';
  $('#cpuName').textContent = data.cpu.name || 'PROCESSOR ARRAY';
  $('#cpuValue').textContent = format(data.cpu.usage, 0, '%');
  $('#gpuName').textContent = data.gpu.name || 'GRAPHICS ARRAY';
  $('#gpuValue').textContent = format(data.gpu.usage, 0, '%');
  renderTemperature('#gpuTemp', data.gpu.temperature);
  $('#vramValue').textContent = data.gpu.vramUsed == null || data.gpu.vramTotal == null ? 'N/A' : `${format(data.gpu.vramUsed, 1)} / ${format(data.gpu.vramTotal, 1)} GB`;
  $('#ramValue').textContent = format(data.ram.usage, 0, '%');
  $('#ramDetail').textContent = `${format(data.ram.used, 1)} / ${format(data.ram.total, 1)} GB`;
  $('#adapter').textContent = data.network.adapter || 'KEIN AKTIVER ADAPTER';
  $('#download').textContent = format(data.network.download, 2, ' Mbit/s');
  $('#upload').textContent = format(data.network.upload, 2, ' Mbit/s');
  $('#diskName').textContent = data.disk.name || 'SYSTEM DISK';
  $('#diskUsed').textContent = format(data.disk.usage, 0, '%');
  $('#diskBar').style.width = `${Math.max(0, Math.min(100, data.disk.usage || 0))}%`;
  $('#diskCapacity').textContent = data.disk.total ? `${format(data.disk.free, 0)} GB FREI / ${format(data.disk.total, 0)} GB` : 'KAPAZITÄT N/A';
  $('#diskRead').textContent = format(data.disk.read, 1, ' MB/s');
  $('#diskWrite').textContent = format(data.disk.write, 1, ' MB/s');
  $('#sensorStatus').innerHTML = `<i></i>${isNativeTelemetry() ? 'WINDOWS-SENSOREN AKTIV' : 'VORSCHAU-DATEN AKTIV'}`;
  renderCoreGrid(data.cpu.cores);
  renderProcesses(data.processes);
  pushHistory(data, now);
  charts.forEach(chart => chart.draw());
}

function addLog(message) {
  const log = $('#telemetryLog');
  const span = document.createElement('span');
  span.textContent = `[${new Date().toLocaleTimeString('de-DE', { hour12: false })}] ${message}`;
  log.prepend(span);
  while (log.childElementCount > 5) log.lastElementChild.remove();
}

subscribeSettings(settings => {
  $('#brandName').textContent = 'TRANSFORMERS';
  const isEco = settings.energySavingMode === true;
  const fps = isEco ? 24 : (settings.targetFps || 60);
  const qual = isEco ? 'ECO-MODE' : (settings.animationQuality || 'High').toUpperCase();
  $('#qualityState').textContent = `${fps} FPS // ${qual}`;
  const configuredProfile = settings.transformerProfile === 'random'
    ? activeProfile.id
    : getProfile(settings.transformerProfile || 'optimus').id;
  const enabledProfileIds = getEnabledProfileIds(settings, configuredProfile);
  const initialProfile = settings.profileMode === 'cycle' && !enabledProfileIds.includes(configuredProfile)
    ? enabledProfileIds[0]
    : configuredProfile;
  setProfile(initialProfile, false, settings.startForm);
});

subscribe((data) => {
  const now = performance.now();
  renderTelemetry(data, now);
  if (getSettings().profileMode === 'cycle' && now >= nextProfileSwitch) {
    const profileIds = getEnabledProfileIds(getSettings(), activeProfile.id);
    const nextIndex = (profileIds.indexOf(activeProfile.id) + 1) % profileIds.length;
    setProfile(profileIds[nextIndex]);
  }
  if (now >= nextFormSwitch) {
    setForm(activeForm === 'robot' ? 'alt' : 'robot');
    scheduleFormSwitch();
  }
  if (now - lastLog > 4800) {
    lastLog = now;
    const messages = [`CPU ${format(data.cpu.usage, 0, '%')} // GPU ${format(data.gpu.usage, 0, '%')}`, `NETZWERK ${format(data.network.download, 1, ' Mbit/s')} RX`, `DATENTRÄGER I/O NORMAL`, `${data.processes?.length || 0} PROZESSE ERFASST`, `SENSORDATEN SYNCHRON`];
    addLog(messages[Math.floor(Math.random() * messages.length)]);
  }
});

function compactWindows(value) {
  const text = String(value || 'WINDOWS').toUpperCase();
  const match = text.match(/WINDOWS[^\d]*(\d+)/);
  return match ? `WINDOWS ${match[1]}` : text.replace('MICROSOFT ', '').slice(0, 28);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

window.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === 'Escape') window.chrome?.webview?.postMessage({ command: 'exit' });
});

window.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button, select, option')) return;
  window.chrome?.webview?.postMessage({ command: 'exit' });
});

function triggerRandomEvent(manual = false) {
  if (getSettings().enableEvents === false) return;
  if (isEventActive) {
    if (!manual) scheduleRandomEvent();
    return;
  }
  const frequency = getSettings().randomEvents;
  if (!manual && frequency === 'off') return;

  isEventActive = true;
  const eventType = Math.floor(Math.random() * 2);

  if (eventType === 0) {
    const level = 78 + Math.floor(Math.random() * 22);
    showCyberAlert('ENERGON ALERT', 'ENERGON SURGE DETECTED', `ENERGON CORE OUTPUT // ${level}%`, 'energon');
  } else {
    const level = 72 + Math.floor(Math.random() * 28);
    app.classList.add('under-attack');
    showCyberAlert(
      'DECEPTICON ATTACK',
      'HOSTILE CONTACT DETECTED',
      `DEFENSE MATRIX // THREAT LEVEL ${level}%`,
      'attack',
      () => app.classList.remove('under-attack')
    );
  }
}

function showCyberAlert(code, title, detail, tone, onClose) {
  const alert = $('#cyberAlert');
  const meter = $('#alertMeter');
  const animationToken = ++alertAnimationToken;
  clearTimeout(alertCloseTimer);
  alertDecodeTimers.forEach(clearTimeout);
  alertDecodeTimers = [];
  alertProgressAnimation?.cancel();
  const decodedElements = [
    prepareDecodedText($('#alertCode'), code),
    prepareDecodedText($('#alertTitle'), title),
    prepareDecodedText($('#alertDetail'), detail)
  ];
  meter.style.width = '0%';
  alert.dataset.tone = tone;
  alert.dataset.decodeState = 'encrypted';
  alert.classList.add('visible');
  alert.setAttribute('aria-hidden', 'false');
  alertDecodeTimers.push(window.setTimeout(() => {
    if (animationToken !== alertAnimationToken) return;
    alert.dataset.decodeState = 'decoding';
    decodeAlertText(decodedElements, animationToken);
  }, ALERT_ENCRYPTED_HOLD_MS));

  const closeAfterCompletion = () => {
    if (animationToken !== alertAnimationToken) return;
    meter.style.width = '100%';
    alertProgressAnimation?.cancel();
    alertProgressAnimation = null;
    alertCloseTimer = window.setTimeout(() => {
      if (animationToken !== alertAnimationToken) return;
      alert.classList.remove('visible');
      alert.setAttribute('aria-hidden', 'true');
      delete alert.dataset.decodeState;
      meter.style.width = '0%';
      onClose?.();
      isEventActive = false;
      scheduleRandomEvent();
    }, ALERT_COMPLETE_HOLD_MS);
  };

  if (typeof meter.animate === 'function') {
    alertProgressAnimation = meter.animate(
      [{ width: '0%' }, { width: '100%' }],
      { duration: ALERT_PROGRESS_DURATION_MS, easing: 'linear', fill: 'forwards' }
    );
    alertProgressAnimation.finished.then(closeAfterCompletion).catch(() => {});
  } else {
    meter.style.transition = `width ${ALERT_PROGRESS_DURATION_MS}ms linear`;
    requestAnimationFrame(() => requestAnimationFrame(() => { meter.style.width = '100%'; }));
    alertCloseTimer = window.setTimeout(closeAfterCompletion, ALERT_PROGRESS_DURATION_MS);
  }
}

function prepareDecodedText(element, value) {
  const characters = Array.from(value);
  element.replaceChildren(...characters.map(character => {
    const span = document.createElement('span');
    span.className = 'decoded-character';
    span.textContent = character;
    if (character === ' ') span.classList.add('space');
    return span;
  }));
  element.setAttribute('aria-label', value);
  return { element, characters, spans: [...element.children] };
}

function decodeAlertText(groups, animationToken) {
  const characters = groups.flatMap(group => group.spans
    .map((span, index) => ({ span, finalCharacter: group.characters[index] }))
    .filter(item => item.finalCharacter !== ' '));
  const step = ALERT_DECODE_DURATION_MS / Math.max(1, characters.length);

  characters.forEach((item, index) => {
    alertDecodeTimers.push(window.setTimeout(() => {
      if (animationToken !== alertAnimationToken) return;
      item.span.textContent = DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)];
      item.span.classList.add('decoding');
      alertDecodeTimers.push(window.setTimeout(() => {
        if (animationToken !== alertAnimationToken) return;
        item.span.textContent = item.finalCharacter;
        item.span.classList.remove('decoding');
        item.span.classList.add('decoded');
      }, 70));
    }, Math.round(index * step)));
  });

  alertDecodeTimers.push(window.setTimeout(() => {
    if (animationToken !== alertAnimationToken) return;
    $('#cyberAlert').dataset.decodeState = 'readable';
  }, ALERT_DECODE_DURATION_MS + 90));
}

function scheduleRandomEvent() {
  clearTimeout(randomEventTimer);
  if (getSettings().enableEvents === false) return;
  const frequency = getSettings().randomEvents;
  if (!frequency || frequency === 'off') return;
  
  const minDelay = frequency === 'rare' ? 45000 : 15000;
  const maxDelay = frequency === 'rare' ? 90000 : 35000;
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  randomEventTimer = setTimeout(triggerRandomEvent, delay);
}

function randomBetween(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function scheduleUptimeEasterEgg() {
  clearTimeout(uptimeEasterEggTimer);
  const delay = randomBetween(UPTIME_EASTER_EGG_MIN_DELAY_MS, UPTIME_EASTER_EGG_MAX_DELAY_MS);
  uptimeEasterEggTimer = window.setTimeout(() => {
    const uptimeDisplay = $('#uptimeDisplay');
    uptimeDisplay.classList.add('is-readable');
    uptimeDisplay.dataset.fontState = 'readable';

    clearTimeout(uptimeReadableTimer);
    const readableDuration = randomBetween(UPTIME_READABLE_MIN_DURATION_MS, UPTIME_READABLE_MAX_DURATION_MS);
    uptimeReadableTimer = window.setTimeout(() => {
      uptimeDisplay.classList.remove('is-readable');
      uptimeDisplay.dataset.fontState = 'ancient';
      scheduleUptimeEasterEgg();
    }, readableDuration);
  }, delay);
}

function updateCoordinates() {
  const coordEl = $('.coordinates');
  const lat = (Math.random() * 180 - 90).toFixed(4);
  const lon = (Math.random() * 360 - 180).toFixed(4);
  coordEl.querySelector('b').textContent = `${lat}° N   ${lon}° E`;
  coordEl.classList.toggle('left', Math.random() > 0.5);
  coordEl.style.top = 'auto';
  coordEl.style.bottom = '10%';
  coordEl.classList.add('visible');
  
  setTimeout(() => {
    coordEl.classList.remove('visible');
  }, 4000);
}

setInterval(updateCoordinates, 8000);
updateCoordinates();
scheduleUptimeEasterEgg();

subscribeSettings(settings => {
  const alertButton = $('#settingsButton');
  alertButton.disabled = settings.enableEvents === false;
  alertButton.title = alertButton.disabled ? 'HUD-Alerts sind in den Einstellungen deaktiviert' : 'Alert manuell auslösen';

  scheduleRandomEvent();
});

addLog('SYSTEM LINK INITIALISIERT');
