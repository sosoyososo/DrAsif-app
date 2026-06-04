import { getSession } from "./api";
import { writeUserData } from "./userDataApi";

const REGISTRY_KEY = '__dr_storage_registry__';

// ─── Private registry helpers ─────────────────────────────────────────────────

function getRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveRegistry(set) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify([...set]));
}

// ─── StorageService ───────────────────────────────────────────────────────────

const StorageService = {
  _initialized: false,
  _listeners: new Set(),

  markInitialized() {
    this._initialized = true;
  },

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  },

  _notify() {
    this._listeners.forEach((l) => l());
  },

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      const registry = getRegistry();
      registry.add(key);
      saveRegistry(registry);
    } catch (e) {
      console.warn(`StorageService.save failed for key "${key}":`, e);
      return;
    }
    if (this._initialized && getSession()?.token) {
      writeUserData(key, data).catch((e) => {
        console.warn(`StorageService.save server sync failed for key "${key}":`, e);
      });
    }
  },

  load(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`StorageService.load failed for key "${key}":`, e);
      return fallback;
    }
  },

  exportAll() {
    const registry = getRegistry();
    const result = {};
    for (const key of registry) {
      result[key] = this.load(key);
    }
    return result;
  },

  importAll(json) {
    if (!json || typeof json !== 'object') return;
    for (const key in json) {
      this.save(key, json[key]);
    }
    this._notify();
  },

  clearAll() {
    const registry = getRegistry();
    for (const key of registry) {
      localStorage.removeItem(key);
    }
    registry.clear();
    saveRegistry(registry);
  },
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export { StorageService };
