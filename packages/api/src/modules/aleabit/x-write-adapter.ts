/**
 * AleaBit — X write adapter interface (#139, #141 fix)
 *
 * Defines the contract for publishing to X.
 * Provides DryRunXWriteAdapter (default) that only records would-send payload.
 * XApiWriteAdapter implements real X API v2 calls.
 *
 * SAFETY: Default is dry-run. No external writes without kill-switch override.
 * No browser automation. No media upload bypass.
 *
 * REDLINE: Raw external API responses are logged server-side only.
 * Error messages returned to callers are neutral descriptors.
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

// ── X API v2 helpers ──────────────────────────────────────────────────────────

const X_API_BASE = "https://api.x.com/2";
const X_UPLOAD_BASE = "https://upload.x.com/1.1";

interface MediaUploadResponse {
  media_id_string: string;
  media_id: number;
}

interface TweetCreateResponse {
  data: {
    id: string;
    text: string;
  };
}

/**
 * Neutral error: log raw details server-side, throw generic message.
 */
function neutralError(stage: string, status: number, raw: string): never {
  console.error(`[aleabit:x-write] ${stage} failed (${status}):`, raw);
  throw new Error(`${stage} failed (${status}).`);
}

/**
 * Upload a PNG image to X and return the media_id.
 * Uses INIT → APPEND → FINALIZE flow.
 */
async function uploadMedia(
  bearerToken: string,
  png: Buffer,
  altText?: string,
): Promise<string> {
  const base64 = png.toString("base64");

  // Step 1: INIT
  const initRes = await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "INIT",
      total_bytes: String(png.length),
      media_type: "image/png",
      media_category: "tweet_image",
    }),
  });

  if (!initRes.ok) {
    const raw = await initRes.text();
    neutralError("Media INIT", initRes.status, raw);
  }

  const initData = (await initRes.json()) as MediaUploadResponse;
  const mediaId = initData.media_id_string;

  // Step 2: APPEND (single chunk for < 5MB)
  const appendRes = await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "APPEND",
      media_id: mediaId,
      segment_index: "0",
      media: base64,
    }),
  });

  if (!appendRes.ok) {
    const raw = await appendRes.text();
    neutralError("Media APPEND", appendRes.status, raw);
  }

  // Step 3: FINALIZE
  const finalizeRes = await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      command: "FINALIZE",
      media_id: mediaId,
    }),
  });

  if (!finalizeRes.ok) {
    const raw = await finalizeRes.text();
    neutralError("Media FINALIZE", finalizeRes.status, raw);
  }

  // Step 4: Set alt text (best-effort, don't fail upload)
  if (altText) {
    try {
      await fetch(`${X_UPLOAD_BASE}/media/metadata/create.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: mediaId,
          alt_text: { text: altText },
        }),
      });
    } catch {
      // Alt text is best-effort
    }
  }

  return mediaId;
}

/**
 * Create a reply tweet with optional media.
 */
async function createReply(
  bearerToken: string,
  replyToPostId: string,
  text: string,
  mediaIds?: string[],
): Promise<string> {
  const body: Record<string, unknown> = {
    text,
    reply: { in_reply_to_tweet_id: replyToPostId },
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text();
    neutralError("Tweet create", res.status, raw);
  }

  const data = (await res.json()) as TweetCreateResponse;
  return data.data.id;
}

// ── X API write adapter ──────────────────────────────────────────────────────

/**
 * XApiWriteAdapter — publishes reply + media to X via API v2.
 *
 * SAFETY: Only instantiated when:
 * 1. ALEABIT_PUBLISH_DRY_RUN=false
 * 2. ALEABIT_PUBLISH_KILL_SWITCH=false
 * 3. X_WRITE_BEARER_TOKEN is configured
 *
 * Steps:
 * 1. Upload zh PNG → media_id_zh
 * 2. Upload en PNG → media_id_en
 * 3. Create reply tweet with both media_ids
 * 4. Return external post ID
 *
 * REDLINE: Raw API responses logged server-side only.
 * Returned errors are neutral descriptors.
 */
export class XApiWriteAdapter implements IXWriteAdapter {
  readonly name = "x-api";
  readonly isDryRun = false;

  private readonly bearerToken: string;

  constructor(bearerToken: string) {
    if (!bearerToken) {
      throw new Error("XApiWriteAdapter requires write-scope bearer token.");
    }
    this.bearerToken = bearerToken;
  }

  async publishReplyWithMedia(input: PublishPayload): Promise<PublishResult> {
    const payloadHash = await hashPayload(input);

    // REDLINE: Dual image enforcement — refuse to publish without both PNGs.
    // This prevents accidental text-only replies even if executor is bypassed.
    if (!input.mediaPngZh || !input.mediaPngEn) {
      return {
        success: false,
        dryRun: false,
        adapter: this.name,
        payloadHash,
        error:
          "Both zh and en PNG media are required. Refusing text-only reply.",
        attemptedAt: new Date().toISOString(),
      };
    }

    try {
      const mediaIds: string[] = [];

      // Upload zh PNG
      if (input.mediaPngZh) {
        const zhId = await uploadMedia(
          this.bearerToken,
          input.mediaPngZh,
          `AleaBit financial brief (${input.creatorId}) — Chinese`,
        );
        mediaIds.push(zhId);
      }

      // Upload en PNG
      if (input.mediaPngEn) {
        const enId = await uploadMedia(
          this.bearerToken,
          input.mediaPngEn,
          `AleaBit financial brief (${input.creatorId}) — English`,
        );
        mediaIds.push(enId);
      }

      // Create reply tweet
      const externalPostId = await createReply(
        this.bearerToken,
        input.replyToPostId,
        input.text,
        mediaIds.length > 0 ? mediaIds : undefined,
      );

      return {
        success: true,
        dryRun: false,
        externalPostId,
        adapter: this.name,
        payloadHash,
        attemptedAt: new Date().toISOString(),
      };
    } catch (err) {
      // Log raw error server-side, return neutral message
      console.error("[aleabit:x-write] publish failed:", err);
      return {
        success: false,
        dryRun: false,
        adapter: this.name,
        payloadHash,
        error: "Publish failed. See server logs.",
        attemptedAt: new Date().toISOString(),
      };
    }
  }
}

// ── Adapter factory ──────────────────────────────────────────────────────────

export interface AdapterConfig {
  publishMode: "off" | "shadow" | "canary" | "auto";
  dryRun: boolean;
  killSwitch: boolean;
  xWriteBearerToken?: string;
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
  if (!config.xWriteBearerToken) {
    // Fail-closed: missing creds → no adapter
    return null;
  }

  // Real write adapter
  return new XApiWriteAdapter(config.xWriteBearerToken);
}
