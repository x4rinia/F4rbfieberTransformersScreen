const fallback = {
  timestamp: new Date().toISOString(),
  computerName: 'CYBERTRON-NODE',
  windowsVersion: 'WINDOWS // LOCAL SESSION',
  uptime: '04:37:22',
  cpu: { name: 'AMD RYZEN PROCESSOR', usage: 12, temperature: 48, cores: [8, 12, 19, 10, 24, 14, 18, 11, 9, 21, 16, 12] },
  gpu: { name: 'NVIDIA GRAPHICS ARRAY', usage: 28, temperature: 61, vramUsed: 5.8, vramTotal: 12 },
  ram: { used: 14.3, total: 32, usage: 44.7 },
  network: { adapter: 'INTEL WI-FI 6E', download: 12.4, upload: 2.8 },
  disk: { name: 'SYSTEM NVME', read: 128, write: 36, free: 341, total: 953, usage: 64.2 },
  processes: [
    { id: 4980, name: 'System', cpu: 1.2, memory: 110, status: 'RUNNING' },
    { id: 7312, name: 'dwm.exe', cpu: .8, memory: 342, status: 'RUNNING' },
    { id: 8844, name: 'explorer.exe', cpu: 1.6, memory: 416, status: 'RUNNING' },
    { id: 12904, name: 'chrome.exe', cpu: 4.8, memory: 1230, status: 'RUNNING' },
    { id: 15320, name: 'WebView2.exe', cpu: .4, memory: 618, status: 'RUNNING' },
    { id: 16088, name: 'MsMpEng.exe', cpu: .6, memory: 402, status: 'RUNNING' },
    { id: 17216, name: 'TransformersScreen.exe', cpu: .2, memory: 318, status: 'RUNNING' }
  ]
};

let target = structuredClone(fallback);
let display = structuredClone(fallback);
const hasNativeBridge = Boolean(window.chrome?.webview);
const parseUptimeSeconds = value => {
  const parts = String(value || '').split(':').map(Number);
  return parts.length === 3 && parts.every(Number.isFinite)
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : 0;
};
const formatUptime = seconds => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor(wholeSeconds % 3600 / 60).toString().padStart(2, '0');
  const remainingSeconds = (wholeSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainingSeconds}`;
};
let uptimeAnchorSeconds = parseUptimeSeconds(fallback.uptime);
let uptimeAnchorAt = performance.now();
const startupParameters = new URLSearchParams(window.location.search);
let settings = {
  targetFps: 60,
  animationQuality: 'High',
  transformerProfile: startupParameters.get('profile') || 'optimus',
  transformationIntervalSeconds: 15,
  startForm: startupParameters.get('form') === 'alt' ? 'alt' : 'robot',
  profileMode: 'fixed',
  profileCycleIntervalSeconds: 60,
  selectedTransformerProfiles: ['grimlock', 'hound', 'optimus', 'bumblebee', 'ironhide', 'jazz', 'megatron', 'shockwave', 'soundwave'],
  monitorTarget: '1',
  enableEvents: true
};
let receivedNativeTelemetry = false;
const listeners = new Set();
const settingsListeners = new Set();
const numericKeys = [
  ['cpu','usage'], ['cpu','temperature'], ['gpu','usage'], ['gpu','temperature'], ['gpu','vramUsed'], ['gpu','vramTotal'],
  ['ram','used'], ['ram','total'], ['ram','usage'], ['network','download'], ['network','upload'],
  ['disk','read'], ['disk','write'], ['disk','free'], ['disk','total'], ['disk','usage']
];

function mergeTelemetry(payload) {
  target = { ...fallback, ...payload };
  for (const group of ['cpu','gpu','ram','network','disk']) target[group] = { ...fallback[group], ...(payload[group] || {}) };
  for (const group of ['cpu', 'gpu']) {
    const temperature = Number(target[group].temperature);
    if (target[group].temperature == null || !Number.isFinite(temperature) || temperature <= 5 || temperature >= 130)
      target[group].temperature = null;
  }
  target.processes = Array.isArray(payload.processes) ? payload.processes : fallback.processes;
}

function onMessage(message) {
  if (!message || !message.type) return;
  if (message.type === 'telemetry' && message.payload) {
    const isFirstNativeSample = !receivedNativeTelemetry;
    receivedNativeTelemetry = true;
    mergeTelemetry(message.payload);
    if (isFirstNativeSample) {
      for (const [group, key] of numericKeys)
        display[group][key] = target[group][key];
    }
    uptimeAnchorSeconds = parseUptimeSeconds(message.payload.uptime);
    uptimeAnchorAt = performance.now();
  }
  if (message.type === 'settings' && message.payload) {
    settings = { ...settings, ...message.payload };
    settingsListeners.forEach(listener => listener(settings));
  }
}

if (window.chrome?.webview) window.chrome.webview.addEventListener('message', event => onMessage(event.data));

// A softly moving sample keeps the standalone HTML useful for design review.
setInterval(() => {
  if (receivedNativeTelemetry) return;
  const t = performance.now() / 1000;
  const wave = (base, spread, speed) => Math.max(0, base + Math.sin(t * speed) * spread + Math.sin(t * speed * .43) * spread * .25);
  mergeTelemetry({
    ...target,
    timestamp: new Date().toISOString(),
    cpu: { ...target.cpu, usage: wave(18, 8, .55), temperature: wave(49, 3, .2), cores: target.cpu.cores.map((_, i) => wave(16 + (i % 4) * 3, 11, .31 + i * .017)) },
    gpu: { ...target.gpu, usage: wave(31, 13, .29), temperature: wave(59, 4, .18) },
    ram: { ...target.ram, usage: wave(45, 2.3, .08), used: wave(14.4, .7, .08) },
    network: { ...target.network, download: wave(14, 10, .7), upload: wave(3.6, 2.4, .48) },
    disk: { ...target.disk, read: wave(72, 55, .42), write: wave(24, 17, .33) }
  });
}, 850);

let last = performance.now();
function interpolate(now) {
  const delta = Math.min(2, (now - last) / 1000);
  last = now;
  const factor = 1 - Math.pow(.08, delta);
  display.timestamp = target.timestamp;
  display.computerName = target.computerName;
  display.windowsVersion = target.windowsVersion;
  display.uptime = formatUptime(uptimeAnchorSeconds + (now - uptimeAnchorAt) / 1000);
  display.processes = target.processes || [];
  display.cpu.name = target.cpu.name;
  display.cpu.cores = target.cpu.cores || [];
  display.gpu.name = target.gpu.name;
  display.network.adapter = target.network.adapter;
  display.disk.name = target.disk.name;
  for (const [group, key] of numericKeys) {
    const value = target[group]?.[key];
    if (value == null || !Number.isFinite(Number(value))) display[group][key] = null;
    else {
      const displayedValue = display[group][key];
      const current = displayedValue != null && Number.isFinite(Number(displayedValue))
        ? Number(displayedValue)
        : Number(value);
      display[group][key] = current + (Number(value) - current) * factor;
    }
  }
  listeners.forEach(listener => listener(display, delta));
  requestAnimationFrame(interpolate);
}
// Leave one complete frame for the initial HUD and profile artwork before live canvas work starts.
requestAnimationFrame(() => requestAnimationFrame(interpolate));

export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function subscribeSettings(listener) { settingsListeners.add(listener); listener(settings); return () => settingsListeners.delete(listener); }
export function getSettings() { return settings; }
export function format(value, digits = 1, suffix = '') { return value == null || !Number.isFinite(value) ? 'N/A' : `${value.toFixed(digits)}${suffix}`; }
export function isNativeTelemetry() { return receivedNativeTelemetry; }
export function isNativeHost() { return hasNativeBridge; }
