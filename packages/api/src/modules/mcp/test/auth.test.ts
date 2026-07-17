import { describe, expect, it } from "vitest";

import {
  extractKeyName,
  getAuthorizationResult,
  getToken,
  isAuthorizedToken,
  keyFingerprint,
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

describe("extractKeyName", () => {
  it("returns the NAME prefix from a labeled key", () => {
    expect(extractKeyName("team-a=abc123")).toBe("team-a");
  });

  it("returns unknown for bare tokens", () => {
    expect(extractKeyName("abc123")).toBe("unknown");
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

describe("getAuthorizationResult", () => {
  it("returns the configured key name for a labeled match", () => {
    expect(
      getAuthorizationResult(
        "plugin=mcp_abc,preview=mcp_def",
        "Bearer mcp_def",
      ),
    ).toEqual({ authorized: true, keyName: "preview" });
  });

  it("returns unknown as the key name for a bare token match", () => {
    expect(getAuthorizationResult("mcp_abc", "Bearer mcp_abc")).toEqual({
      authorized: true,
      keyName: "unknown",
    });
  });

  it("does not expose a key name for failed auth", () => {
    expect(getAuthorizationResult("plugin=mcp_abc", "Bearer nope")).toEqual({
      authorized: false,
    });
  });
});

describe("keyFingerprint", () => {
  it("returns 8 hex chars", () => {
    const fp = keyFingerprint("mcp_testkey123");
    expect(fp).toHaveLength(8);
    expect(fp).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is deterministic for the same input", () => {
    expect(keyFingerprint("abc")).toBe(keyFingerprint("abc"));
  });

  it("differs for different inputs", () => {
    expect(keyFingerprint("abc")).not.toBe(keyFingerprint("def"));
  });

  it("does not leak the original key", () => {
    const secret = "mcp_supersecretkey_xyz";
    const fp = keyFingerprint(secret);
    expect(fp).not.toContain(secret);
    expect(fp.length).toBeLessThan(secret.length);
  });
});

describe("multi-key revocation scenarios", () => {
  const KEYS = "beta-alice=mcp_alice111,beta-bob=mcp_bob222,beta-carol=mcp_carol333";

  it("all three keys authorize independently", () => {
    expect(isAuthorizedToken(KEYS, "Bearer mcp_alice111")).toBe(true);
    expect(isAuthorizedToken(KEYS, "Bearer mcp_bob222")).toBe(true);
    expect(isAuthorizedToken(KEYS, "Bearer mcp_carol333")).toBe(true);
  });

  it("after removing bob's key, alice and carol still work", () => {
    const afterRevoke = "beta-alice=mcp_alice111,beta-carol=mcp_carol333";
    expect(isAuthorizedToken(afterRevoke, "Bearer mcp_alice111")).toBe(true);
    expect(isAuthorizedToken(afterRevoke, "Bearer mcp_carol333")).toBe(true);
    // Bob is now rejected
    expect(isAuthorizedToken(afterRevoke, "Bearer mcp_bob222")).toBe(false);
  });

  it("revoked key returns correct keyName before revocation", () => {
    expect(getAuthorizationResult(KEYS, "Bearer mcp_bob222")).toEqual({
      authorized: true,
      keyName: "beta-bob",
    });
  });

  it("revoked key returns authorized:false after removal", () => {
    const afterRevoke = "beta-alice=mcp_alice111,beta-carol=mcp_carol333";
    expect(getAuthorizationResult(afterRevoke, "Bearer mcp_bob222")).toEqual({
      authorized: false,
    });
  });
});

describe("empty key list", () => {
  it("rejects everything when configured keys is empty string", () => {
    expect(isAuthorizedToken("", "Bearer anything")).toBe(false);
  });

  it("rejects everything when configured keys is undefined", () => {
    expect(isAuthorizedToken(undefined, "Bearer anything")).toBe(false);
  });

  it("rejects everything when configured keys is only whitespace/commas", () => {
    expect(isAuthorizedToken(" , , ", "Bearer anything")).toBe(false);
  });
});
