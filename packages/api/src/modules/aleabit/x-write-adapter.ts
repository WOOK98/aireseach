/**
 * AleaBit — X write adapter interface (#139)
 *
 * Defines the contract for publishing to X.
 * Provides DryRunXWriteAdapter (default) that only records would-send payload.
 * XApiWriteAdapter skeleton exists but is NOT callable without explicit env.
 *
 * SAFETY: Default is dry-run. No external writes without kill-switch override.
 * No browser automation. No media upload bypass.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PublishPayload {
  replyToPostId: string;
  text: string;
  mediaPngZh?: Buffer;
  mediaPngEn?: Buffer;
  creatorId: string;
  conversationId: string;
}

export interface PublishResult {
  success: boolean;
  dryRun: boolean;
  externalPostId?: string;
  adapter: string;
  payloadHash: string;
  error?: string;
  attemptedAt: string;
}

// ── Adapter interface ─────────────────────────────────────────────────────────

export interface IXWriteAdapter {
  readonly name: string;
  readonly isDryRun: boolean;

  /**
   * Publish a reply with optional media to X.
   * Must be atomic: either all parts succeed or all fail.
   * Partial success (text-only after media failure) is NOT allowed.
   */
  publishReplyWithMedia(input: PublishPayload): Promise<PublishResult>;
}

// ── Payload hash ─────────────────────────────────────────────────────────────

/**
 * Compute deterministic hash of publish payload for dedup/audit.
 */
export async function hashPayload(input: PublishPayload): Promise<string> {
  const parts = [
    input.replyToPostId,
    input.text,
    input.creatorId,
    input.conversationId,
    input.mediaPngZh ? `zh:${input.mediaPngZh.length}` : "zh:none",
    input.mediaPngEn ? `en:${input.mediaPngEn.length}` : "en:none",
  ].join("|");

  const data = new TextEncoder().encode(parts);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Dry-run adapter (default) ─────────────────────────────────────────────────

/**
 * DryRunXWriteAdapter — records what would be sent, sends nothing.
 * This is the default adapter. Always safe. No external calls.
 */
export class DryRunXWriteAdapter implements IXWriteAdapter {
  readonly name = "dry-run";
  readonly isDryRun = true;

  async publishReplyWithMedia(input: PublishPayload): Promise<PublishResult> {
    const payloadHash = await hashPayload(input);

    return {
      success: true,
      dryRun: true,
      adapter: this.name,
      payloadHash,
      attemptedAt: new Date().toISOString(),
    };
  }
}

// ── X API write adapter (skeleton) ────────────────────────────────────────────

/**
 * XApiWriteAdapter — would call X API v2 to post reply + media.
 *
 * SAFETY: This is a SKELETON. It is NOT callable unless:
 * 1. ALEABIT_PUBLISH_DRY_RUN=false
 * 2. ALEABIT_PUBLISH_KILL_SWITCH=false
 * 3. X_BEARER_TOKEN (write scope) is configured
 *
 * The executor enforces these checks before instantiation.
 * This class throws if called without proper configuration.
 */
export class XApiWriteAdapter implements IXWriteAdapter {
  readonly name = "x-api";
  readonly isDryRun = false;

  private readonly bearerToken: string;

  constructor(bearerToken: string) {
    if (!bearerToken) {
      throw new Error(
        "XApiWriteAdapter requires write-scope bearer token.", // no secret value in message
      );
    }
    this.bearerToken = bearerToken;
  }

  async publishReplyWithMedia(input: PublishPayload): Promise<PublishResult> {
    const payloadHash = await hashPayload(input);

    // SAFETY: This is a skeleton. Real implementation would:
    // 1. Upload media (zh + en PNGs) via POST /2/media/upload
    // 2. Create reply tweet via POST /2/tweets with media_ids
    // 3. Verify both succeeded atomically
    //
    // For now, this always returns an error indicating it's not implemented.
    // The executor should never reach this point in production.
    return {
      success: false,
      dryRun: false,
      adapter: this.name,
      payloadHash,
      error: "XApiWriteAdapter is a skeleton. Real X write not implemented.",
      attemptedAt: new Date().toISOString(),
    };
  }
}

// ── Adapter factory ──────────────────────────────────────────────────────────

export interface AdapterConfig {
  publishMode: "off" | "shadow" | "canary" | "auto";
  dryRun: boolean;
  killSwitch: boolean;
  xBearerToken?: string;
}

/**
 * Create the appropriate adapter based on config.
 * Returns null if publishing is not allowed (off / kill-switch / missing creds).
 */
export function createAdapter(config: AdapterConfig): IXWriteAdapter | null {
  // Kill switch → no adapter
  if (config.killSwitch) {
    return null;
  }

  // Mode off → no adapter
  if (config.publishMode === "off") {
    return null;
  }

  // Dry-run (default) → DryRunXWriteAdapter
  if (config.dryRun) {
    return new DryRunXWriteAdapter();
  }

  // Real write requires credentials
  if (!config.xBearerToken) {
    // Fail-closed: missing creds → no adapter
    return null;
  }

  // Real write adapter (skeleton — not implemented)
  return new XApiWriteAdapter(config.xBearerToken);
}
