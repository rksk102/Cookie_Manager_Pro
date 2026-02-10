import { describe, it, expect } from "vitest";
import { normalizeDomain, isDomainMatch, isInList, getCookieTypeName } from "~types";

describe("normalizeDomain", () => {
  it("should remove leading dot", () => {
    expect(normalizeDomain(".example.com")).toBe("example.com");
  });

  it("should convert to lowercase", () => {
    expect(normalizeDomain("Example.COM")).toBe("example.com");
  });

  it("should handle both leading dot and uppercase", () => {
    expect(normalizeDomain(".Example.COM")).toBe("example.com");
  });

  it("should handle domain without leading dot", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
  });

  it("should handle subdomain", () => {
    expect(normalizeDomain("sub.example.com")).toBe("sub.example.com");
  });
});

describe("isDomainMatch", () => {
  it("should match exact domain", () => {
    expect(isDomainMatch("example.com", "example.com")).toBe(true);
  });

  it("should match cookie domain with leading dot", () => {
    expect(isDomainMatch(".example.com", "example.com")).toBe(true);
  });

  it("should match subdomain", () => {
    expect(isDomainMatch("sub.example.com", "example.com")).toBe(true);
  });

  it("should match target with leading dot", () => {
    expect(isDomainMatch("example.com", ".example.com")).toBe(true);
  });

  it("should not match different domains", () => {
    expect(isDomainMatch("example.com", "test.org")).toBe(false);
  });

  it("should not match partial domain", () => {
    expect(isDomainMatch("example.com", "example.org")).toBe(false);
  });
});

describe("isInList", () => {
  it("should find exact match in list", () => {
    expect(isInList("example.com", ["test.org", "example.com", "demo.net"])).toBe(true);
  });

  it("should find subdomain match", () => {
    expect(isInList("sub.example.com", ["example.com"])).toBe(true);
  });

  it("should find leading dot match", () => {
    expect(isInList("example.com", [".example.com"])).toBe(true);
  });

  it("should not find non-matching domain", () => {
    expect(isInList("example.com", ["test.org", "demo.net"])).toBe(false);
  });

  it("should handle empty list", () => {
    expect(isInList("example.com", [])).toBe(false);
  });

  it("should handle case insensitive matching", () => {
    expect(isInList("Example.COM", ["example.com"])).toBe(true);
  });
});

describe("getCookieTypeName", () => {
  it("should return correct name for session type", () => {
    expect(getCookieTypeName("session")).toBe("会话Cookie");
  });

  it("should return correct name for persistent type", () => {
    expect(getCookieTypeName("persistent")).toBe("持久Cookie");
  });

  it("should return correct name for all type", () => {
    expect(getCookieTypeName("all")).toBe("所有Cookie");
  });

  it("should return default name for unknown type", () => {
    expect(getCookieTypeName("unknown")).toBe("所有Cookie");
  });
});
