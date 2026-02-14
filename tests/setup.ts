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

global.chrome = {
  cookies: {
    getAll: vi.fn(() => Promise.resolve([])),
    remove: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve({})),
    get: vi.fn(),
    getAllCookieStores: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  browsingData: {
    remove: vi.fn(),
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as unknown as typeof chrome;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockStorage.clear();
});
