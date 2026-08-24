/**
 * Live Blocks — refresh URL guard (#167 / Codex P0 SSRF fix)
 *
 * Server-side reachability checks must never become a network probe into
 * private infrastructure. This guard is pure, synchronous, and fails CLOSED:
 * anything it cannot confidently classify as a public http(s) URL is unsafe.
 *
 * Blocked at minimum:
 * - non-http(s) schemes (file:, ftp:, gopher:, …)
 * - credentials embedded in the URL
 * - localhost / *.localhost / *.local / *.internal / *.lan hostnames
 * - IPv4: loopback (127/8), RFC1918 (10/8, 172.16/12, 192.168/16),
 *   link-local (169.254/16 — includes cloud metadata 169.254.169.254),
 *   CGNAT (100.64/10), 0/8, 192.0/24, benchmarking 198.18/15,
 *   multicast + reserved (224/4)
 * - IPv6: loopback (::1), unspecified (::), link-local (fe80::/10),
 *   site-local (fec0::/10), unique-local (fc00::/7), multicast (ff00::/8),
 *   IPv4-mapped (::ffff:a.b.c.d) re-checked against the IPv4 rules
 *
 * Hostname allowlist (Codex re-review, P0 SSRF): arbitrary hostnames are
 * NOT confidently public — a user-controlled hostname can resolve (or be
 * rebound, DNS TOCTOU) to loopback / private / metadata addresses, and the
 * resolved IP cannot be pinned through to fetch. v1 therefore fails closed:
 * only curated public evidence domains (SEC EDGAR: sec.gov + subdomains,
 * matching the MCP fetch_filing allowlist in modules/mcp/router) may be
 * auto-refreshed. Any other hostname is unsafe and is never fetched.
 * Public IP *literals* stay allowed — they carry no DNS path.
 *
 * NOTE: WHATWG URL parsing already normalizes trick IPv4 forms
 * (octal/hex/single-integer) to dotted decimal before we see the hostname,
 * so a strict dotted-quad parse here is sufficient — anything else fails.
 */

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
] as const;

/**
 * v1 auto-refresh allowlist: curated public evidence domains only.
 * Exact `sec.gov` plus any `*.sec.gov` subdomain (www./efts./data.sec.gov).
 */
const REFRESH_ALLOWLIST_HOSTS = ["sec.gov"] as const;
const REFRESH_ALLOWLIST_SUFFIXES = [".sec.gov"] as const;

function isAllowlistedHostname(host: string): boolean {
  return (
    REFRESH_ALLOWLIST_HOSTS.includes(
      host as (typeof REFRESH_ALLOWLIST_HOSTS)[number],
    ) || REFRESH_ALLOWLIST_SUFFIXES.some((s) => host.endsWith(s))
  );
}

export function isSafeRefreshUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username !== "" || url.password !== "") return false;

  const host = url.hostname.toLowerCase();
  if (host === "") return false;

  // IPv6 literal — URL serializes it with brackets.
  if (host.startsWith("[")) {
    return isSafeIpv6(host.slice(1, -1));
  }

  if (host === "localhost") return false;
  if (BLOCKED_HOSTNAME_SUFFIXES.some((s) => host.endsWith(s))) return false;

  // IPv4 literal (already normalized by the URL parser). Fail closed on
  // anything that merely looks numeric but doesn't parse strictly.
  if (/^[0-9.]+$/.test(host)) {
    return isSafeIpv4(host);
  }

  // Arbitrary hostnames carry a DNS path we cannot pin to fetch (rebinding
  // TOCTOU) — v1 auto-refresh is restricted to the curated allowlist.
  return isAllowlistedHostname(host);
}

// ── IPv4 ─────────────────────────────────────────────────────────────────────

function isSafeIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [, sa, sb, sc, sd] = m;
  if (
    sa === undefined ||
    sb === undefined ||
    sc === undefined ||
    sd === undefined
  ) {
    return false;
  }
  const a = Number(sa);
  const b = Number(sb);
  const c = Number(sc);
  const d = Number(sd);
  if (Math.max(a, b, c, d) > 255) return false;
  return isSafeIpv4Octets(a, b, c, d);
}

function isSafeIpv4Octets(
  a: number,
  b: number,
  _c: number,
  _d: number,
): boolean {
  if (a === 0) return false; // 0.0.0.0/8 "this host"
  if (a === 10) return false; // RFC1918
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return false; // RFC1918
  if (a === 192 && b === 168) return false; // RFC1918
  if (a === 192 && b === 0) return false; // 192.0.0.0/24 protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking 198.18.0.0/15
  if (a >= 224) return false; // multicast 224/4 + reserved 240/4
  return true;
}

// ── IPv6 ─────────────────────────────────────────────────────────────────────

function parseHextet(g: string): number | null {
  return /^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : null;
}

/** Expand an IPv6 address to 8 hextets; null when unparsable (fail closed). */
function expandIpv6(addr: string): number[] | null {
  let a = addr.toLowerCase();

  // Embedded dotted IPv4 tail (e.g. ::ffff:127.0.0.1) → two hextets.
  const v4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(a);
  if (v4) {
    const tail = v4[1];
    if (tail === undefined) return null;
    const [p0, p1, p2, p3] = tail.split(".").map(Number);
    if (
      p0 === undefined ||
      p1 === undefined ||
      p2 === undefined ||
      p3 === undefined ||
      Math.max(p0, p1, p2, p3) > 255
    ) {
      return null;
    }
    const h1 = ((p0 << 8) | p1).toString(16);
    const h2 = ((p2 << 8) | p3).toString(16);
    a = `${a.slice(0, a.length - tail.length)}${h1}:${h2}`;
  }

  const halves = a.split("::");
  if (halves.length > 2) return null;
  const hLeft = halves[0];
  const hRight = halves[1];
  if (hLeft === undefined) return null;

  const left = hLeft === "" ? [] : hLeft.split(":");
  const right =
    hRight === undefined ? [] : hRight === "" ? [] : hRight.split(":");
  const hasCompress = halves.length === 2;

  const leftGroups: number[] = [];
  for (const g of left) {
    const v = parseHextet(g);
    if (v === null) return null;
    leftGroups.push(v);
  }
  const rightGroups: number[] = [];
  for (const g of right) {
    const v = parseHextet(g);
    if (v === null) return null;
    rightGroups.push(v);
  }

  if (!hasCompress) {
    return leftGroups.length === 8 ? leftGroups : null;
  }
  const missing = 8 - leftGroups.length - rightGroups.length;
  if (missing < 0) return null;
  return [...leftGroups, ...Array<number>(missing).fill(0), ...rightGroups];
}

function isSafeIpv6(addr: string): boolean {
  const g = expandIpv6(addr);
  if (!g) return false; // fail closed
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
  if (
    g0 === undefined ||
    g1 === undefined ||
    g2 === undefined ||
    g3 === undefined ||
    g4 === undefined ||
    g5 === undefined ||
    g6 === undefined ||
    g7 === undefined
  ) {
    return false;
  }

  // IPv4-mapped ::ffff:a.b.c.d → apply IPv4 rules to the embedded address.
  if (
    g0 === 0 &&
    g1 === 0 &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0xffff
  ) {
    return isSafeIpv4Octets(g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff);
  }

  if (g.every((x) => x === 0)) return false; // unspecified ::
  if (g.slice(0, 7).every((x) => x === 0) && g7 === 1) return false; // ::1

  if (g0 >= 0xfe80 && g0 <= 0xfeff) return false; // link-local fe80/10 + site-local fec0/10
  if ((g0 & 0xfe00) === 0xfc00) return false; // unique-local fc00::/7
  if ((g0 & 0xff00) === 0xff00) return false; // multicast ff00::/8
  return true;
}
