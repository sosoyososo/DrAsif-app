# StorageService Dynamic Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `StorageService` to be a dynamic key-value store that auto-tracks its own registered keys. v23's `lsGet`/`lsSet` will delegate to `StorageService`. No hardcoded `STORAGE_KEYS` list.

**Architecture:** Replace the hardcoded `STORAGE_KEYS` constants map with a `REGISTRY_KEY` that stores a `Set` of all registered keys. On every `save()`, automatically add the key to the registry. `exportAll()` reads only keys in the registry. `importAll()` restores from JSON and registers all imported keys. `clearAll()` clears registry + all its keys.

**Tech Stack:** Vanilla JS, localStorage, no dependencies.

---

## File Map

- Modify: `src/services/storage.js` — rewrite `StorageService` + remove `STORAGE_KEYS`
- Modify: `src/dr_asif_v23_app.jsx:4522-4528` — make `lsGet`/`lsSet` delegate to `StorageService`
- Modify: `docs/architecture.md` — update StorageService API docs
- Modify: `docs/challenge-tab.md` — note storage key change
- Modify: `CLAUDE.md` — update Data Layer section

---

## Task 1: Rewrite StorageService with dynamic registry

**File:** Modify: `src/services/storage.js`

- [ ] **Step 1: Replace the hardcoded STORAGE_KEYS with REGISTRY_KEY constant**

Add at top of file:

```js
const REGISTRY_KEY = '__dr_storage_registry__';
```

- [ ] **Step 2: Implement registry helpers (private to StorageService)**

```js
function getRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveRegistry(set) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify([...set]));
}
```

- [ ] **Step 3: Rewrite save() to auto-register the key**

Replace the `save()` method body:

```js
save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    const registry = getRegistry();
    registry.add(key);
    saveRegistry(registry);
  } catch (e) {
    console.warn(`StorageService.save failed for key "${key}":`, e);
  }
}
```

- [ ] **Step 4: Rewrite load() — unchanged logic, no registry interaction**

```js
load(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`StorageService.load failed for key "${key}":`, e);
    return fallback;
  }
}
```

- [ ] **Step 5: Rewrite exportAll() to read only registered keys**

```js
exportAll() {
  const registry = getRegistry();
  const result = {};
  for (const key of registry) {
    result[key] = this.load(key);
  }
  return result;
}
```

- [ ] **Step 6: Rewrite importAll() to register all imported keys**

```js
importAll(json) {
  if (!json || typeof json !== 'object') return;
  const registry = getRegistry();
  for (const key in json) {
    this.save(key, json[key]);   // save() auto-registers
  }
}
```

- [ ] **Step 7: Rewrite clearAll() to clear registry and all its keys**

```js
clearAll() {
  const registry = getRegistry();
  for (const key of registry) {
    localStorage.removeItem(key);
  }
  registry.clear();
  saveRegistry(registry);
}
```

- [ ] **Step 8: Remove STORAGE_KEYS constant and domain hooks**

Delete the entire `STORAGE_KEYS` block (lines 5–32) and the domain-specific hooks section (lines 100–127). The `StorageService` is now the only export — consumers call it directly.

- [ ] **Step 9: Update exports**

```js
export { StorageService };
```

---

## Task 2: Update lsGet/lsSet in v23 to delegate to StorageService

**File:** Modify: `src/dr_asif_v23_app.jsx:4522-4528`

- [ ] **Step 1: Import StorageService at the top of the file (if not already)**

Check line 1 of `dr_asif_v23_app.jsx` — if no import of `StorageService`, add:

```js
import { StorageService } from "./services/storage.js";
```

- [ ] **Step 2: Replace lsGet and lsSet implementations**

Replace lines 4522–4528 with:

```js
function lsGet(key, fallback) {
  return StorageService.load(key, fallback);
}
function lsSet(key, val) {
  StorageService.save(key, val);
}
```

- [ ] **Step 3: Remove the try/catch wrapper functions — StorageService handles that**

The new `lsGet`/`lsSet` are thin delegates; error handling is in `StorageService`.

---

## Task 3: Update docs

**Files:**
- Modify: `docs/architecture.md` — update StorageService API table (REGISTRY_KEY, dynamic keys)
- Modify: `docs/challenge-tab.md` — update storage key references (remove `challenge.checked`/`challenge.completed`, note new `dailyLogs` shape)
- Modify: `CLAUDE.md` — update Data Layer section

- [ ] **Step 1: Update architecture.md StorageService API table**

Replace the existing API table with:

| Method | Signature | Notes |
|---|---|---|
| `save(key, data)` | `(string, any) → void` | JSON-serializes, auto-registers key in `__dr_storage_registry__` |
| `load(key, fallback)` | `(string, any?) → any` | JSON-parses, returns fallback on miss |
| `exportAll()` | `() → object` | Exports all registered keys as `{ [key]: value }` |
| `importAll(json)` | `(object) → void` | Bulk restore; auto-registers all imported keys |
| `clearAll()` | `() → void` | Clears registry and all stored keys |

Remove the `STORAGE_KEYS` section from the doc.

- [ ] **Step 2: Update challenge-tab.md**

Remove references to `challenge.checked` and `challenge.completed` storage keys — v23 uses `dr_dailylogs` and `dr_progresslog` (already correctly documented). No storage key changes needed for the challenge tab itself.

- [ ] **Step 3: Update CLAUDE.md Data Layer section**

Update:

```
- **Persistence**: `StorageService` in `src/services/storage.js` with `save`/`load`/`exportAll`/`importAll`/`clearAll`. Dynamic registry — no hardcoded key list.
- **Storage keys**: dynamically tracked in `__dr_storage_registry__` localStorage key
```

Also update the "Adding Features" section to remove "Adding state + `useEffect`" reference to `useStorage` hook — v23 uses inline `lsGet`/`lsSet` with `StorageService` backing.

---

## Self-Review Checklist

1. **Spec coverage:** All requirements from the request are in tasks:
   - `lsGet`/`lsSet` delegate to StorageService ✓
   - No hardcoded key list in StorageService ✓
   - Special key stores the key list (REGISTRY_KEY) ✓
   - `lsSet` updates the registry ✓

2. **Placeholder scan:** No TBDs, TODOs, or vague steps. All code is concrete.

3. **Type consistency:** `REGISTRY_KEY` is a string constant, `getRegistry()` returns `Set`, `saveRegistry()` takes `Set` — consistent across all private helpers.

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-02-storage-registry-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**