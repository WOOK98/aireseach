import { describe, expect, it } from "vitest";

import {
  getToken,
  isAuthorizedToken,
  normalizeKey,
  parseConfiguredKeys,
} from "../auth";

describe("getToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(getToken("Bearer abc123")).toBe("abc123");
  });

  it("is case-insensitive on the scheme", () => {
    expect(getToken("bearer abc123")).toBe("abc123");
    expect(getToken("BEARER abc123")).toBe("abc123");
  });

  it("falls back to the raw header when there is no Bearer scheme", () => {
    expect(getToken("abc123")).toBe("abc123");
  });

  it("returns an empty string when no header is provided", () => {
    expect(getToken(undefined)).toBe("");
  });

  it("returns an empty string for a bare 'Bearer' with no value", () => {
    expect(getToken("Bearer")).toBe("");
  });
});

describe("normalizeKey", () => {
  it("returns bare tokens unchanged", () => {
    expect(normalizeKey("abc123")).toBe("abc123");
  });

  it("strips a NAME= prefix", () => {
    expect(normalizeKey("team-a=abc123")).toBe("abc123");
  });

  it("only strips the first '=' segment, keeping the rest of the value intact", () => {
    expect(normalizeKey("team-a=abc=123")).toBe("abc=123");
  });

  it("treats a leading '=' as part of the token, not a name prefix", () => {
    expect(normalizeKey("=abc123")).toBe("=abc123");
  });
});

describe("parseConfiguredKeys", () => {
  it("splits comma-separated keys and trims whitespace", () => {
    expect(parseConfiguredKeys(" abc , def ")).toEqual(["abc", "def"]);
  });

  it("normalizes NAME=value entries alongside bare tokens", () => {
    expect(parseConfiguredKeys("team-a=abc,def")).toEqual(["abc", "def"]);
  });

  it("filters out empty entries", () => {
    expect(parseConfiguredKeys("abc,,def,")).toEqual(["abc", "def"]);
  });

  it("returns an empty array for undefined or blank input", () => {
    expect(parseConfiguredKeys(undefined)).toEqual([]);
    expect(parseConfiguredKeys("")).toEqual([]);
    expect(parseConfiguredKeys("   ")).toEqual([]);
  });
});

describe("isAuthorizedToken", () => {
  it("authorizes a bare configured token sent as a Bearer header", () => {
    expect(isAuthorizedToken("abc123", "Bearer abc123")).toBe(true);
  });

  it("authorizes a NAME=value configured key when the client sends the bare token", () => {
    expect(isAuthorizedToken("team-a=abc123", "Bearer abc123")).toBe(true);
  });

  it("authorizes when the matching key is one of several comma-separated keys", () => {
    expect(
      isAuthorizedToken("team-a=abc123,team-b=def456", "Bearer def456"),
    ).toBe(true);
  });

  it("rejects a token that isn't in the configured list", () => {
    expect(isAuthorizedToken("abc123", "Bearer nope")).toBe(false);
  });

  it("rejects any request when no keys are configured", () => {
    expect(isAuthorizedToken(undefined, "Bearer abc123")).toBe(false);
    expect(isAuthorizedToken("", "Bearer abc123")).toBe(false);
  });

  it("rejects a request with no authorization header", () => {
    expect(isAuthorizedToken("abc123", undefined)).toBe(false);
  });
});
