import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { useState } from "react";

expect.extend(matchers);

vi.mock("@plasmohq/storage/hook", () => ({
  useStorage: vi.fn((key: string, defaultValue: unknown) => {
    return useState(defaultValue);
  }),
}));

const mockStorage = new Map<string, unknown>();

class MockStorage {
  async get(key: string) {
    return mockStorage.get(key);
  }
  async set(key: string, value: unknown) {
    mockStorage.set(key, value);
  }
}

vi.mock("@plasmohq/storage", () => ({
  Storage: MockStorage,
}));

const createMockEvent = () => ({
  addListener: vi.fn(),
  removeListener: vi.fn(),
  hasListener: vi.fn(() => false),
  hasListeners: vi.fn(() => false),
});

global.chrome = {
  cookies: {
    getAll: vi.fn(() => Promise.resolve([])),
    remove: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve({})),
    get: vi.fn(),
    getAllCookieStores: vi.fn(),
    onChanged: createMockEvent(),
  },
  browsingData: {
    remove: vi.fn(),
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    onUpdated: createMockEvent(),
    onRemoved: createMockEvent(),
    onCreated: createMockEvent(),
    onActivated: createMockEvent(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      onChanged: createMockEvent(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      onChanged: createMockEvent(),
    },
    onChanged: createMockEvent(),
  },
  runtime: {
    lastError: undefined as chrome.runtime.LastError | undefined,
    onInstalled: createMockEvent(),
    onStartup: createMockEvent(),
    onMessage: createMockEvent(),
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    getManifest: vi.fn(() => ({ manifest_version: 3, name: "Test", version: "1.0" })),
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn(() => Promise.resolve(undefined)),
    getAll: vi.fn(() => Promise.resolve([])),
    clear: vi.fn(() => Promise.resolve(true)),
    clearAll: vi.fn(() => Promise.resolve(true)),
    onAlarm: createMockEvent(),
  },
} as unknown as typeof chrome;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockStorage.clear();
});
