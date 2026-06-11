import { useState, useEffect, useRef, useCallback } from "react";
import { App as CapApp } from "@capacitor/app";
import { NotificationService } from "../services/notifications";
import { StorageService } from "../services/storage";

export function useNotifications({ onTap }) {
  const [settings, setSettings] = useState(() => NotificationService.getSettings());
  const [permission, setPermission] = useState("prompt");
  const initRanRef = useRef(false);

  // Mount: register tap listener + request permission (one-shot, ref-guarded)
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    (async () => {
      await NotificationService.init({ onTap });
      const before = await NotificationService.checkPermission();
      setPermission(before);
      if (before === "prompt") {
        const result = await NotificationService.requestPermission();
        setPermission(result);
      }
      // Self-heal: if permission is granted and any daily reminder is enabled,
      // ensure the OS has the schedules. Covers cold-start after reinstall
      // (where iOS may have kept the grant or the user just re-granted) and
      // any other case where localStorage has settings but OS schedules are
      // missing or out of sync.
      const after = await NotificationService.checkPermission();
      if (after === "granted") {
        const s = NotificationService.getSettings();
        setSettings(s);
        if (s.food.enabled || s.exercise.enabled) {
          await NotificationService.updateSettings(s);
        }
      }
    })();
  }, [onTap]);

  // Server sync (e.g., importAll after sign-in): re-read settings and self-heal.
  // The hook's `settings` state initializes once at mount; without this
  // subscription, settings restored from the server AFTER mount would be
  // invisible to the hook, and OS schedules would not be recreated.
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      (async () => {
        const s = NotificationService.getSettings();
        setSettings(s);
        const perm = await NotificationService.checkPermission();
        setPermission(perm);
        if (perm === "granted" && (s.food.enabled || s.exercise.enabled)) {
          try {
            await NotificationService.updateSettings(s);
          } catch (e) {
            console.warn("useNotifications StorageService sync reschedule failed:", e);
          }
        }
      })();
    });
    return unsubscribe;
  }, []);

  // App focus: re-check permission + flush pending schedules if newly granted
  useEffect(() => {
    let handle;
    (async () => {
      try {
        handle = await CapApp.addListener("appStateChange", async (state) => {
          if (!state.isActive) return;
          const perm = await NotificationService.checkPermission();
          setPermission(perm);
          if (perm === "granted") {
            const s = NotificationService.getSettings();
            const needSchedule = s.food.enabled || s.exercise.enabled;
            if (needSchedule) {
              await NotificationService.updateSettings(s);
              setSettings(s);
            }
          }
        });
      } catch (e) {
        console.warn("useNotifications appStateChange registration failed:", e);
      }
    })();
    return () => { if (handle) handle.remove(); };
  }, []);

  // Setters
  const persist = useCallback(async (next) => {
    setSettings(next);
    await NotificationService.updateSettings(next);
  }, []);

  const setFood = useCallback(async (food) => {
    await persist({ ...settings, food: { ...settings.food, ...food } });
  }, [settings, persist]);

  const setExercise = useCallback(async (exercise) => {
    await persist({ ...settings, exercise: { ...settings.exercise, ...exercise } });
  }, [settings, persist]);

  const setChallenge = useCallback(async (challenge) => {
    await persist({ ...settings, challenge: { ...settings.challenge, ...challenge } });
  }, [settings, persist]);

  // Toggle from UI: returns { permission } so caller can show denied-state UI
  const toggleFromUi = useCallback(async (kind) => {
    const isEnabling = !settings[kind]?.enabled;
    const next = { ...settings, [kind]: { ...settings[kind], enabled: isEnabling } };
    let resultPerm = permission;
    if (isEnabling) {
      const before = await NotificationService.checkPermission();
      if (before !== "granted") {
        const result = await NotificationService.requestPermission();
        setPermission(result);
        resultPerm = result;
      } else {
        resultPerm = before;
      }
    }
    await persist(next);
    return { permission: resultPerm };
  }, [settings, permission, persist]);

  const triggerMilestone = useCallback((opts) => NotificationService.triggerMilestone(opts), []);

  const reset = useCallback(async () => {
    await NotificationService.reset();
    setSettings(NotificationService.getSettings());
  }, []);

  return {
    settings,
    permission,
    setFood,
    setExercise,
    setChallenge,
    toggleFromUi,
    triggerMilestone,
    reset,
  };
}
