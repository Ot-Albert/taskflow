// Thin, typed-ish wrappers around localStorage with JSON (de)serialisation
// and graceful fallback when storage is unavailable (private mode, SSR, etc.).

function isStorageAvailable() {
  try {
    const test = "__taskflow_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function loadJSON(key, fallback) {
  if (!isStorageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[storage] Failed to parse key "${key}":`, err);
    return fallback;
  }
}

export function saveJSON(key, value) {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to save key "${key}":`, err);
    return false;
  }
}

export function removeKey(key) {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] Failed to remove key "${key}":`, err);
  }
}
