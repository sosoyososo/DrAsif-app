import { useState, useCallback } from 'react';

// ─── STORAGE_KEYS ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  user: {
    gender:  'user.gender',
    profile: 'user.profile',
  },
  streak: {
    weekly: 'streak.weekly',
  },
  calories: {
    food:     'calories.food',
    exercise: 'calories.exercise',
  },
  challenge: {
    phase:   'challenge.phase',
    started: 'challenge.started',
    checked: 'challenge.checked',
  },
  track: {
    entries: 'track.entries',
  },
  coach: {
    messages: 'coach.messages',
  },
  community: {
    liked: 'community.liked',
  },
};

// ─── StorageService ───────────────────────────────────────────────────────────

const StorageService = {
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`StorageService.save failed for key "${key}":`, e);
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
    const result = {};
    for (const section in STORAGE_KEYS) {
      result[section] = {};
      for (const key in STORAGE_KEYS[section]) {
        result[section][key] = this.load(STORAGE_KEYS[section][key]);
      }
    }
    return result;
  },

  importAll(json) {
    if (!json || typeof json !== 'object') return;
    for (const section in json) {
      for (const key in json[section]) {
        this.save(`${section}.${key}`, json[section][key]);
      }
    }
  },

  clearAll() {
    for (const section in STORAGE_KEYS) {
      for (const key in STORAGE_KEYS[section]) {
        localStorage.removeItem(STORAGE_KEYS[section][key]);
      }
    }
  },
};

// ─── useStorage ────────────────────────────────────────────────────────────────

function useStorage(key, defaultValue) {
  const [value, setValue] = useState(() => StorageService.load(key, defaultValue));

  const setAndPersist = useCallback((next) => {
    const resolved = next instanceof Function ? next(value) : next;
    setValue(resolved);
    StorageService.save(key, resolved);
  }, [key, value]);

  return [value, setAndPersist];
}

// ─── Domain-specific hooks ──────────────────────────────────────────────────────

// User
export const useGender        = (defaultValue) => useStorage(STORAGE_KEYS.user.gender, defaultValue);
export const useUserProfile   = (defaultValue) => useStorage(STORAGE_KEYS.user.profile, defaultValue);

// Streak
export const useStreak        = (defaultValue) => useStorage(STORAGE_KEYS.streak.weekly, defaultValue);

// Calories
export const useCaloriesFood     = (defaultValue) => useStorage(STORAGE_KEYS.calories.food, defaultValue);
export const useCaloriesExercise = (defaultValue) => useStorage(STORAGE_KEYS.calories.exercise, defaultValue);

// Challenge
export const useChallengePhase   = (defaultValue) => useStorage(STORAGE_KEYS.challenge.phase, defaultValue);
export const useChallengeStarted = (defaultValue) => useStorage(STORAGE_KEYS.challenge.started, defaultValue);
export const useChallengeChecked = (defaultValue) => useStorage(STORAGE_KEYS.challenge.checked, defaultValue);

// Track
export const useTrackEntries = (defaultValue) => useStorage(STORAGE_KEYS.track.entries, defaultValue);

// Coach
export const useCoachMessages = (defaultValue) => useStorage(STORAGE_KEYS.coach.messages, defaultValue);

// Community
export const useCommunityLiked = (defaultValue) => useStorage(STORAGE_KEYS.community.liked, defaultValue);

// ─── Exports ──────────────────────────────────────────────────────────────────

export { STORAGE_KEYS, StorageService };