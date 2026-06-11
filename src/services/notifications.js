import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { StorageService } from "./storage";

// ─── Constants ────────────────────────────────────────────────────────────────

export const NOTIFICATION_IDS = {
  FOOD: 1001,
  EXERCISE: 1002,
  MILESTONE_BASE: 2000, // dynamic IDs are 2000 + (Date.now() % 1_000_000)
};

export const NOTIFICATION_CONTENT = {
  food: { title: "Log your meals", body: "Don't forget today's meal log." },
  exercise: { title: "Time to move", body: "Don't forget today's exercise." },
  challenge: { title: "🎉 Congratulations!", body: "You've reached a new milestone! Keep it up." },
};

export const NOTIFICATION_TAB = {
  food: "calories",
  exercise: "calories",
  challenge: "challenge",
};

export const DEFAULT_SETTINGS = {
  food: { enabled: false, hour: 9, minute: 0 },
  exercise: { enabled: false, hour: 18, minute: 0 },
  challenge: { enabled: false },
};

const STORAGE_KEY = "dr_notif_settings";
const ASKED_KEY = "dr_notif_permission_asked";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isNative = () => Capacitor.isNativePlatform();

function readSettings() {
  const stored = StorageService.load(STORAGE_KEY, null);
  if (!stored) {
    return {
      food: { ...DEFAULT_SETTINGS.food },
      exercise: { ...DEFAULT_SETTINGS.exercise },
      challenge: { enabled: DEFAULT_SETTINGS.challenge.enabled },
    };
  }
  return {
    food: { ...DEFAULT_SETTINGS.food, ...(stored.food || {}) },
    exercise: { ...DEFAULT_SETTINGS.exercise, ...(stored.exercise || {}) },
    challenge: { ...DEFAULT_SETTINGS.challenge, ...(stored.challenge || {}) },
  };
}

function writeSettings(s) {
  StorageService.save(STORAGE_KEY, s);
}

function markAsked() {
  try { localStorage.setItem(ASKED_KEY, "true"); } catch {}
}

async function scheduleDaily(id, content, type, hour, minute) {
  if (!isNative()) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title: content.title,
        body: content.body,
        schedule: { on: { hour, minute }, repeats: true },
        extra: { type },
      },
    ],
  });
}

async function cancelOne(id) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (e) {
    console.warn(`NotificationService.cancelOne(${id}) failed:`, e);
  }
}

// ─── Public Service ───────────────────────────────────────────────────────────

export const NotificationService = {
  // Lifecycle
  async init({ onTap }) {
    if (!isNative()) return;
    try {
      await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        const type = event.notification?.extra?.type;
        const tabId = NOTIFICATION_TAB[type];
        if (tabId && typeof onTap === "function") onTap(tabId);
      });
    } catch (e) {
      console.warn("NotificationService.init failed:", e);
    }
  },

  // Permission
  async requestPermission() {
    if (!isNative()) return "denied";
    let result;
    try {
      result = await LocalNotifications.requestPermissions();
    } catch (e) {
      console.warn("NotificationService.requestPermission failed:", e);
      return "denied";
    }
    markAsked();
    if (result.display === "granted") {
      const current = readSettings();
      const isFirstGrant =
        !current.food.enabled && !current.exercise.enabled && !current.challenge.enabled;
      if (isFirstGrant) {
        const updated = {
          food: { ...DEFAULT_SETTINGS.food, enabled: true },
          exercise: { ...DEFAULT_SETTINGS.exercise, enabled: true },
          challenge: { enabled: true },
        };
        writeSettings(updated);
      }
      // Self-heal: ensure OS schedules exist for any enabled daily reminder.
      // Covers: fresh install + first grant; reinstall where settings were
      // restored from the server but OS schedules were cleared on uninstall.
      const finalSettings = readSettings();
      if (finalSettings.food.enabled || finalSettings.exercise.enabled) {
        try {
          await NotificationService.updateSettings(finalSettings);
        } catch (e) {
          console.warn("NotificationService.requestPermission reschedule failed:", e);
        }
      }
    }
    return result.display;
  },

  async checkPermission() {
    if (!isNative()) return "denied";
    try {
      const r = await LocalNotifications.checkPermissions();
      return r.display;
    } catch (e) {
      console.warn("NotificationService.checkPermission failed:", e);
      return "denied";
    }
  },

  // Settings
  getSettings() {
    return readSettings();
  },

  async updateSettings(newSettings) {
    writeSettings(newSettings);
    try {
      await cancelOne(NOTIFICATION_IDS.FOOD);
      await cancelOne(NOTIFICATION_IDS.EXERCISE);
      if (newSettings.food?.enabled) {
        await scheduleDaily(NOTIFICATION_IDS.FOOD, NOTIFICATION_CONTENT.food, "food", newSettings.food.hour, newSettings.food.minute);
      }
      if (newSettings.exercise?.enabled) {
        await scheduleDaily(NOTIFICATION_IDS.EXERCISE, NOTIFICATION_CONTENT.exercise, "exercise", newSettings.exercise.hour, newSettings.exercise.minute);
      }
    } catch (e) {
      console.warn("NotificationService.updateSettings schedule failed:", e);
    }
  },

  // Imperative trigger for challenge milestones (wired up later)
  async triggerMilestone({ body } = {}) {
    if (!isNative()) return;
    const settings = readSettings();
    if (!settings.challenge.enabled) return;
    const perm = await NotificationService.checkPermission();
    if (perm !== "granted") return;
    const id = NOTIFICATION_IDS.MILESTONE_BASE + (Date.now() % 1_000_000);
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: NOTIFICATION_CONTENT.challenge.title,
            body: body || NOTIFICATION_CONTENT.challenge.body,
            schedule: { at: new Date(Date.now() + 1000) },
            extra: { type: "challenge" },
          },
        ],
      });
    } catch (e) {
      console.warn("NotificationService.triggerMilestone failed:", e);
    }
  },

  // Wipe all schedules + restore defaults. ASKED_KEY is preserved (raw localStorage).
  async reset() {
    if (isNative()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications?.length) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map((n) => ({ id: n.id })),
          });
        }
      } catch (e) {
        console.warn("NotificationService.reset cancel failed:", e);
      }
    }
    writeSettings({
      food: { ...DEFAULT_SETTINGS.food },
      exercise: { ...DEFAULT_SETTINGS.exercise },
      challenge: { enabled: false },
    });
  },
};
