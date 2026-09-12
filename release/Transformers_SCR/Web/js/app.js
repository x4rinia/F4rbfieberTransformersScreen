import { subscribe, subscribeSettings, getSettings, format, isNativeTelemetry } from './telemetry.js';
import { PROFILES, getProfile } from './profiles.js';

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

for (const profile of Object.values(PROFILES)) {
  const option = document.createElement('option');
  option.value = profile.id;
  option.textContent = `${profile.name} // ${profile.faction}`;
  profileSelect.append(option);
}

function setProfile(profileId, animate = true) {
  const nextProfile = getProfile(profileId);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reducedMotion || nextProfile.id === activeProfile.id) {
    profileTransitionToken += 1;
    app.classList.remove('profile-switch-out', 'profile-switch-in');
    commitProfile(nextProfile);
    return;
  }

  const transitionToken = ++profileTransitionToken;
  nextProfileSwitch = Number.POSITIVE_INFINITY;
  app.classList.remove('profile-switch-in');
  app.classList.add('profile-switch-out');
  showOverlay(`${nextProfile.name} // PROFIL-SYNCHRONISIERUNG`);

  window.setTimeout(() => {
    if (transitionToken !== profileTransitionToken) return;
    commitProfile(nextProfile);
    app.classList.remove('profile-switch-out');
    app.classList.add('profile-switch-in');
    window.setTimeout(() => {
      if (transitionToken === profileTransitionToken) app.classList.remove('profile-switch-in');
    }, 620);
  }, 340);
}

function commitProfile(profile) {
  activeProfile = profile;
  app.dataset.profile = activeProfile.id;
  applyPalette();
  profileSelect.value = activeProfile.id;
  $('#hologramTitle').textContent = activeProfile.name;
  $('#profileFaction').textContent = `${activeProfile.faction} // HOLOGRAMM`;
  $('#altModeLabel').textContent = activeProfile.altLabel;
  $('#headerFactionLogo').src = activeProfile.factionLogo;
  $('#factionWatermark').src = activeProfile.factionLogo;
  setForm(getSettings().startForm === 'alt' ? 'alt' : 'robot', false);
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
  nextProfileSwitch = getSettings().profileMode === 'cycle'
    ? performance.now() + Math.max(30, Number(getSettings().profileCycleIntervalSeconds) || 60) * 1000
    : Number.POSITIVE_INFINITY;
}

function applyPalette() {
  app.style.setProperty('--primary', activeProfile.primary);
  app.style.setProperty('--secondary', activeProfile.secondary);
  app.style.setProperty('--accent', activeProfile.accent);
  app.style.setProperty('--ink', activeProfile.ink);
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
  const source = activeForm === 'robot' ? activeProfile.robotImage : activeProfile.altImage;
  image.src = source;
  image.alt = activeForm === 'robot' ? `${activeProfile.name} als Roboter` : `${activeProfile.name} im Alt-Mode ${activeProfile.altLabel}`;
  echo.src = source;
  app.dataset.form = activeForm;
  $('#robotMode').classList.toggle('active', activeForm === 'robot');
  $('#altMode').classList.toggle('active', activeForm === 'alt');
}

profileSelect.addEventListener('change', () => setProfile(profileSelect.value));
$('#robotMode').addEventListener('click', () => { setForm('robot'); scheduleFormSwitch(); });
$('#altMode').addEventListener('click', () => { setForm('alt'); scheduleFormSwitch(); });

let isSettingsMessageActive = false;
$('#settingsButton').addEventListener('click', () => {
  if (isSettingsMessageActive) return;
  const overlay = $('#eventOverlay');
  const messages = ['SYSTEM DIAGNOSTICS ONLINE', 'ENERGON LEVELS OPTIMAL', 'DEFENSE GRID ACTIVE', 'SENSOR ARRAY NOMINAL', 'COMMUNICATIONS ESTABLISHED', 'CYBERTRON LINK STABLE'];
  overlay.querySelector('span').textContent = messages[Math.floor(Math.random() * messages.length)];
  overlay.classList.add('visible');
  isSettingsMessageActive = true;
  
  setTimeout(() => {
    overlay.classList.remove('visible');
    setTimeout(() => {
      isSettingsMessageActive = false;
    }, 300);
  }, 2000);
});

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

function renderTelemetry(data, now) {
  const stamp = data.timestamp ? new Date(data.timestamp) : new Date();
  $('#clock').textContent = stamp.toLocaleTimeString('de-DE', { hour12: false });
  $('#date').textContent = stamp.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
  $('#hostName').textContent = (getSettings().customName || data.computerName || 'LOCAL NODE').toUpperCase();
  $('#windowsVersion').textContent = compactWindows(data.windowsVersion);
  $('#uptime').textContent = data.uptime || '00:00:00';
  $('#cpuName').textContent = data.cpu.name || 'PROCESSOR ARRAY';
  $('#cpuValue').textContent = format(data.cpu.usage, 0, '%');
  $('#cpuTemp').textContent = format(data.cpu.temperature, 0, '°C');
  $('#gpuName').textContent = data.gpu.name || 'GRAPHICS ARRAY';
  $('#gpuValue').textContent = format(data.gpu.usage, 0, '%');
  $('#gpuTemp').textContent = format(data.gpu.temperature, 0, '°C');
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
  setProfile(settings.transformerProfile || 'optimus', false);
});

subscribe((data) => {
  const now = performance.now();
  renderTelemetry(data, now);
  if (getSettings().profileMode === 'cycle' && now >= nextProfileSwitch) {
    const profileIds = Object.keys(PROFILES);
    const nextIndex = (profileIds.indexOf(activeProfile.id) + 1) % profileIds.length;
    setProfile(profileIds[nextIndex]);
  }
  if (now >= nextFormSwitch) {
    setForm(activeForm === 'robot' ? 'alt' : 'robot');
    scheduleFormSwitch();
    showOverlay(`${activeProfile.name} // TRANSFORMATIONS-MATRIX`);
  }
  if (now - lastLog > 4800) {
    lastLog = now;
    const messages = [`CPU ${format(data.cpu.usage, 0, '%')} // GPU ${format(data.gpu.usage, 0, '%')}`, `NETZWERK ${format(data.network.download, 1, ' Mbit/s')} RX`, `DATENTRÄGER I/O NORMAL`, `${data.processes?.length || 0} PROZESSE ERFASST`, `SENSORDATEN SYNCHRON`];
    addLog(messages[Math.floor(Math.random() * messages.length)]);
  }
});

function showOverlay(text) {
  if (getSettings().enableEvents === false) return;
  const overlay = $('#eventOverlay');
  overlay.querySelector('span').textContent = text;
  overlay.classList.add('visible');
  setTimeout(() => overlay.classList.remove('visible'), 1800);
}

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

function triggerRandomEvent() {
  if (isEventActive) { scheduleRandomEvent(); return; }
  const frequency = getSettings().randomEvents;
  if (frequency === 'off') return;

  isEventActive = true;
  const eventType = Math.floor(Math.random() * 2);
  
  if (eventType === 0) {
    // Transmission
    const transEl = $('#transmissionEvent');
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let text = '';
    for (let i = 0; i < 16; i++) text += glyphs.charAt(Math.floor(Math.random() * glyphs.length));
    $('#transmissionData').textContent = text;
    transEl.classList.add('visible');
    setTimeout(() => {
      transEl.classList.remove('visible');
      isEventActive = false;
      scheduleRandomEvent();
    }, 3000);
  } else {
    // Glitch
    const frame = $('#hologramFrame');
    frame.classList.add('energon-glitch');
    setTimeout(() => {
      frame.classList.remove('energon-glitch');
      isEventActive = false;
      scheduleRandomEvent();
    }, 1500);
  }
}

function scheduleRandomEvent() {
  clearTimeout(randomEventTimer);
  const frequency = getSettings().randomEvents;
  if (!frequency || frequency === 'off') return;
  
  const minDelay = frequency === 'rare' ? 45000 : 15000;
  const maxDelay = frequency === 'rare' ? 90000 : 35000;
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  randomEventTimer = setTimeout(triggerRandomEvent, delay);
}

function updateCoordinates() {
  const coordEl = $('.coordinates');
  const lat = (Math.random() * 180 - 90).toFixed(4);
  const lon = (Math.random() * 360 - 180).toFixed(4);
  coordEl.querySelector('b').textContent = `${lat}° N   ${lon}° E`;
  const yPos = Math.random() > 0.5 ? '10%' : '80%';
  coordEl.style.top = yPos;
  coordEl.style.bottom = 'auto';
  coordEl.classList.add('visible');
  
  setTimeout(() => {
    coordEl.classList.remove('visible');
  }, 4000);
}

setInterval(updateCoordinates, 8000);
updateCoordinates();

subscribeSettings(settings => {
  scheduleRandomEvent();
});

addLog('SYSTEM LINK INITIALISIERT');
