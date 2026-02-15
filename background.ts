import {
  storage,
  WHITELIST_KEY,
  BLACKLIST_KEY,
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  SCHEDULE_INTERVAL_MAP,
} from "~store";
import type { Settings } from "~types";
import { performCleanup, performCleanupWithFilter } from "~utils/cleanup";
import { CookieClearType, ScheduleInterval } from "~types";
import { ALARM_INTERVAL_MINUTES } from "~constants";

const checkScheduledCleanup = async () => {
  try {
    const settings = await storage.get<Settings>(SETTINGS_KEY);
    if (!settings || settings.scheduleInterval === ScheduleInterval.DISABLED) {
      return;
    }

    const now = Date.now();
    const lastCleanup = settings.lastScheduledCleanup || 0;
    const interval = SCHEDULE_INTERVAL_MAP[settings.scheduleInterval];

    if (now - lastCleanup >= interval) {
      await performCleanupWithFilter(() => true, {
        clearType: CookieClearType.ALL,
        clearCache: settings.clearCache,
        clearLocalStorage: settings.clearLocalStorage,
        clearIndexedDB: settings.clearIndexedDB,
      });

      await storage.set(SETTINGS_KEY, {
        ...settings,
        lastScheduledCleanup: now,
      });
    }
  } catch (e) {
    console.error("Failed to perform scheduled cleanup:", e);
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  const whitelist = await storage.get(WHITELIST_KEY);
  const blacklist = await storage.get(BLACKLIST_KEY);
  const settings = await storage.get(SETTINGS_KEY);

  if (whitelist === undefined) {
    await storage.set(WHITELIST_KEY, []);
  }

  if (blacklist === undefined) {
    await storage.set(BLACKLIST_KEY, []);
  }

  if (settings === undefined) {
    await storage.set(SETTINGS_KEY, DEFAULT_SETTINGS);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await storage.get<Settings>(SETTINGS_KEY);
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnTabDiscard) return;

  if (changeInfo.discarded && tab.url) {
    try {
      const url = new URL(tab.url);
      await performCleanup({
        domain: url.hostname,
        clearCache: settings.clearCache,
        clearLocalStorage: settings.clearLocalStorage,
        clearIndexedDB: settings.clearIndexedDB,
      });
    } catch (e) {
      console.error("Failed to cleanup on tab discard:", e);
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await storage.get<Settings>(SETTINGS_KEY);
  if (!settings?.enableAutoCleanup || !settings?.cleanupOnStartup) return;

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.url) {
      try {
        const url = new URL(activeTab.url);
        await performCleanup({
          domain: url.hostname,
          clearCache: settings.clearCache,
          clearLocalStorage: settings.clearLocalStorage,
          clearIndexedDB: settings.clearIndexedDB,
        });
      } catch (e) {
        console.error("Failed to cleanup active tab on startup:", e);
      }
    } else {
      const allTabs = await chrome.tabs.query({});
      for (const tab of allTabs) {
        if (tab?.url) {
          try {
            const url = new URL(tab.url);
            await performCleanup({
              domain: url.hostname,
              clearCache: settings.clearCache,
              clearLocalStorage: settings.clearLocalStorage,
              clearIndexedDB: settings.clearIndexedDB,
            });
          } catch (e) {
            console.error(`Failed to cleanup tab ${tab.id} on startup:`, e);
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to cleanup on startup:", e);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "scheduled-cleanup") {
    await checkScheduledCleanup();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create("scheduled-cleanup", {
    periodInMinutes: ALARM_INTERVAL_MINUTES,
  });
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create("scheduled-cleanup", {
    periodInMinutes: ALARM_INTERVAL_MINUTES,
  });
  await checkScheduledCleanup();
});
