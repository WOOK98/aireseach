/**
 * Live Blocks — refresh URL guard tests (#167 / Codex P0 SSRF fix)
 *
 * Redlines under test:
 * - loopback / private / link-local / metadata targets are unsafe
 * - local hostnames (localhost, .local, .internal, .lan) are unsafe
 * - credentials in URL and non-http(s) schemes are unsafe
 * - IPv6 loopback / link-local / unique-local / IPv4-mapped are unsafe
 * - public http(s) URLs remain refreshable
 * - the guard fails CLOSED on anything unparsable
 */
import { describe, expect, it } from "vitest";

import { isSafeRefreshUrl } from "../live-block-url-guard";

describe("isSafeRefreshUrl", () => {
  it("allows ordinary public http(s) URLs", () => {
    expect(isSafeRefreshUrl("https://example.com")).toBe(true);
    expect(isSafeRefreshUrl("https://example.com:8443/a?b=c#d")).toBe(true);
    expect(isSafeRefreshUrl("http://sec.gov/Archives/edgar/data")).toBe(true);
    expect(isSafeRefreshUrl("https://8.8.8.8/dns")).toBe(true);
  });

  it("blocks loopback and localhost", () => {
    expect(isSafeRefreshUrl("http://127.0.0.1:3000")).toBe(false);
    expect(isSafeRefreshUrl("http://127.1.2.3/")).toBe(false);
    expect(isSafeRefreshUrl("http://localhost:3000")).toBe(false);
    expect(isSafeRefreshUrl("http://app.localhost:3000")).toBe(false);
    expect(isSafeRefreshUrl("http://[::1]")).toBe(false);
    expect(isSafeRefreshUrl("http://[::1]:8080/x")).toBe(false);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isSafeRefreshUrl("http://10.0.0.1")).toBe(false);
    expect(isSafeRefreshUrl("http://10.255.255.255")).toBe(false);
    expect(isSafeRefreshUrl("http://172.16.0.1")).toBe(false);
    expect(isSafeRefreshUrl("http://172.31.255.255")).toBe(false);
    expect(isSafeRefreshUrl("http://192.168.0.1")).toBe(false);
  });

  it("allows the public edge of adjacent ranges (no over-blocking)", () => {
    expect(isSafeRefreshUrl("http://172.15.0.1")).toBe(true);
    expect(isSafeRefreshUrl("http://172.32.0.1")).toBe(true);
    expect(isSafeRefreshUrl("http://11.0.0.1")).toBe(true);
    expect(isSafeRefreshUrl("http://192.167.0.1")).toBe(true);
  });

  it("blocks link-local and cloud metadata endpoints", () => {
    expect(isSafeRefreshUrl("http://169.254.0.1")).toBe(false);
    expect(isSafeRefreshUrl("http://169.254.169.254/latest/meta-data")).toBe(
      false,
    );
    expect(isSafeRefreshUrl("https://169.254.169.254/")).toBe(false);
  });

  it("blocks other non-public IPv4 ranges", () => {
    expect(isSafeRefreshUrl("http://0.0.0.0")).toBe(false);
    expect(isSafeRefreshUrl("http://100.64.0.1")).toBe(false); // CGNAT
    expect(isSafeRefreshUrl("http://100.127.255.255")).toBe(false);
    expect(isSafeRefreshUrl("http://198.18.0.1")).toBe(false); // benchmarking
    expect(isSafeRefreshUrl("http://224.0.0.1")).toBe(false); // multicast
    expect(isSafeRefreshUrl("http://255.255.255.255")).toBe(false); // reserved
  });

  it("blocks local hostnames", () => {
    expect(isSafeRefreshUrl("http://printer.local")).toBe(false);
    expect(isSafeRefreshUrl("http://nas.internal")).toBe(false);
    expect(isSafeRefreshUrl("http://router.lan")).toBe(false);
  });

  it("blocks IPv6 private scopes", () => {
    expect(isSafeRefreshUrl("http://[fe80::1]")).toBe(false); // link-local
    expect(isSafeRefreshUrl("http://[fec0::1]")).toBe(false); // site-local
    expect(isSafeRefreshUrl("http://[fc00::1]")).toBe(false); // unique-local
    expect(isSafeRefreshUrl("http://[fd12:3456::1]")).toBe(false);
    expect(isSafeRefreshUrl("http://[ff02::1]")).toBe(false); // multicast
    expect(isSafeRefreshUrl("http://[::]")).toBe(false); // unspecified
  });

  it("blocks IPv4-mapped IPv6 pointing at private space", () => {
    expect(isSafeRefreshUrl("http://[::ffff:127.0.0.1]")).toBe(false);
    expect(isSafeRefreshUrl("http://[::ffff:7f00:1]")).toBe(false); // URL-serialized form
    expect(isSafeRefreshUrl("http://[::ffff:169.254.169.254]")).toBe(false);
    expect(isSafeRefreshUrl("http://[::ffff:10.0.0.1]")).toBe(false);
  });

  it("allows public IPv6", () => {
    expect(isSafeRefreshUrl("http://[2606:4700:4700::1111]")).toBe(true);
  });

  it("blocks credentials embedded in the URL", () => {
    expect(isSafeRefreshUrl("http://user:pass@example.com")).toBe(false);
    expect(isSafeRefreshUrl("https://token@example.com")).toBe(false);
  });

  it("blocks non-http(s) schemes", () => {
    expect(isSafeRefreshUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeRefreshUrl("ftp://example.com/x")).toBe(false);
    expect(isSafeRefreshUrl("gopher://example.com")).toBe(false);
    expect(isSafeRefreshUrl("data:text/plain,hi")).toBe(false);
  });

  it("fails closed on garbage", () => {
    expect(isSafeRefreshUrl("")).toBe(false);
    expect(isSafeRefreshUrl("not a url")).toBe(false);
    expect(isSafeRefreshUrl("http://")).toBe(false);
  });
});
