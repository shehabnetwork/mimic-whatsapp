const SETTINGS_KEY = 'wa_sim_settings';
const WINDOW_NAME_PREFIX = 'wa-sim:';

export const DEFAULT_SETTINGS = {
  webhookUrl: 'http://localhost:8069/whatsapp/webhook',
  phoneNumberId: '106540352242922',
  wabaId: '102290129340398',
  appId: '102290129340398',
  appSecret: 'my_verify_token',
  accessToken: 'my_verify_token',
  from: '16505551234',
  contactName: 'Test User',
  verifyToken: 'my_verify_token',
};

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getSessionId() {
  try {
    // window.name survives reloads but starts empty in a separately opened window.
    // This avoids sharing an ID when a browser copies sessionStorage to a new window.
    let sessionId = window.name.startsWith(WINDOW_NAME_PREFIX)
      ? window.name.slice(WINDOW_NAME_PREFIX.length)
      : null;
    if (!sessionId) {
      sessionId = createSessionId();
      window.name = `${WINDOW_NAME_PREFIX}${sessionId}`;
    }
    return sessionId;
  } catch {
    return createSessionId();
  }
}

export function loadSettings() {
  try {
    const saved = sessionStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };

    // Seed the first window-scoped configuration from settings saved by older versions.
    const legacySettings = localStorage.getItem(SETTINGS_KEY);
    const settings = legacySettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(legacySettings) }
      : { ...DEFAULT_SETTINGS };
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getGraphApiBaseUrl(sessionId) {
  const backendOrigin = window.location.port && window.location.port !== '3001'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin;
  return `${backendOrigin}/session/${encodeURIComponent(sessionId)}`;
}
