import { Storage } from "@plasmohq/storage";
import { WHITELIST_KEY, BLACKLIST_KEY, SETTINGS_KEY } from "~store";
import type { Settings } from "~types";
import { performCleanup } from "~utils/cleanup";

const storage = new Storage();

chrome.runtime.onInstalled.addListener(async () => {
  const whitelist = await storage.get(WHITELIST_KEY);
  const blacklist = await storage.get(BLACKLIST_KEY);

  if (whitelist === undefined) {
    await storage.set(WHITELIST_KEY, []);
  }

  if (blacklist === undefined) {
    await storage.set(BLACKLIST_KEY, []);
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
