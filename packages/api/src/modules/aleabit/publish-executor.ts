/**
 * AleaBit — Publish executor (#139, #141 fix)
 *
 * Orchestrates the publish attempt pipeline:
 * 1. Check kill switch
 * 2. Check publish mode
 * 3. Check policy decision verdict === "allowed"
 * 4. Check bilingual PNG artifact BYTES exist (not just hash)
 * 5. Check canary requires human approve
 * 6. Generate idempotency key
 * 7. Check for duplicate (non-dry-run only)
 * 8. Call adapter (dry-run or real)
 * 9. Record publish attempt — ALL paths, no exceptions
 *
 * SAFETY: Default is off + dry-run + kill-switch.
 * No external writes without all gates passing.
 *
 * REDLINE: Every code path records to audit table via recordAttempt().
 * Raw external error details never surface in attempt.failureStage —
 * only neutral stage descriptors go there.
 */

import { RolloutMode } from "./publish-policy";
import { QueueItem } from "./queue-interface";
import { createAdapter, hashPayload } from "./x-write-adapter";

import type {
  PublishPayload,
  PublishResult,
  AdapterConfig,
} from "./x-write-adapter";

// ── Publish attempt record ────────────────────────────────────────────────────

export interface PublishAttempt {
  id: string;
  queueItemId: string;
  creatorId: string;
  conversationId: string;
  sourcePostId: string;
  policyVersion: number;
  rolloutMode: RolloutMode;
  dryRun: boolean;
  adapter: string;
  payloadHash: string;
  imageHashZh: string;
  imageHashEn: string;
  idempotencyKey: string;
  decision: "attempted" | "blocked" | "duplicate" | "error";
  failureStage?: string;
  externalPostId?: string;
  attemptedAt: string;
}

// ── Publish executor config ───────────────────────────────────────────────────

export interface PublishExecutorConfig {
  publishMode: RolloutMode;
  dryRun: boolean;
  killSwitch: boolean;
  xWriteBearerToken?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId(): string {
  return `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyAttempt(): PublishAttempt {
  return {
    id: newId(),
    queueItemId: "",
    creatorId: "",
    conversationId: "",
    sourcePostId: "",
    policyVersion: 0,
    rolloutMode: "off",
    dryRun: true,
    adapter: "none",
    payloadHash: "",
    imageHashZh: "",
    imageHashEn: "",
    idempotencyKey: "",
    decision: "blocked",
    failureStage: "",
    attemptedAt: new Date().toISOString(),
  };
}

// ── Idempotency key generation ────────────────────────────────────────────────

function buildPublishIdempotencyKey(params: {
  creatorId: string;
  sourcePostId: string;
  conversationId: string;
  rendererVersion: string;
  zhHash: string;
  enHash: string;
}): string {
  const raw = [
    params.creatorId,
    params.sourcePostId,
    params.conversationId,
    params.rendererVersion,
    params.zhHash,
    params.enHash,
  ].join("|");

  const crypto = require("crypto");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── Publish executor ──────────────────────────────────────────────────────────

export interface PublishExecutorInput {
  item: QueueItem;
  config: PublishExecutorConfig;
  checkDuplicate?: (key: string) => Promise<PublishAttempt | null>;
  recordAttempt?: (attempt: PublishAttempt) => Promise<void>;
}

export interface PublishExecutorResult {
  attempt: PublishAttempt;
  publishResult?: PublishResult;
}

/**
 * Execute a publish attempt for a queue item.
 *
 * ALL code paths record to audit via recordAttempt().
 * Raw external error details are logged server-side only;
 * attempt.failureStage gets a neutral descriptor.
 */
export async function executePublishAttempt(
  input: PublishExecutorInput,
): Promise<PublishExecutorResult> {
  const { item, config, recordAttempt } = input;
  const now = new Date().toISOString();

  // Helper: build a blocked attempt with item context, record it, return it.
  const blockAndRecord = async (
    reason: string,
    partial: Partial<PublishAttempt> = {},
  ): Promise<PublishExecutorResult> => {
    const attempt: PublishAttempt = {
      ...emptyAttempt(),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      rolloutMode: config.publishMode,
      decision: "blocked",
      failureStage: reason,
      attemptedAt: now,
      ...partial,
    };
    if (recordAttempt) {
      await recordAttempt(attempt);
    }
    return { attempt };
  };

  // ── Gate 1: Kill switch ────────────────────────────────────────────────
  if (config.killSwitch) {
    return blockAndRecord("Kill switch is active.");
  }

  // ── Gate 2: Mode off ───────────────────────────────────────────────────
  if (config.publishMode === "off") {
    return blockAndRecord("Publish mode is 'off'.");
  }

  // ── Gate 3: Policy decision ────────────────────────────────────────────
  const policy = item.policyDecision;
  if (!policy) {
    return blockAndRecord("No policy decision on item.");
  }

  if (policy.verdict !== "allowed") {
    return blockAndRecord(
      `Policy verdict is '${policy.verdict}', not 'allowed'.`,
      { policyVersion: policy.policyVersion },
    );
  }

  // ── Gate 4: Bilingual PNG artifacts (bytes, not just hash) ─────────────
  if (!item.renderedPngHashZh || !item.renderedPngZh) {
    return blockAndRecord("zh-CN PNG artifact missing (hash or bytes).", {
      policyVersion: policy.policyVersion,
    });
  }

  if (!item.renderedPngHashEn || !item.renderedPngEn) {
    return blockAndRecord("en PNG artifact missing (hash or bytes).", {
      policyVersion: policy.policyVersion,
    });
  }

  // ── Gate 5: Brief must exist ───────────────────────────────────────────
  if (!item.brief) {
    return blockAndRecord("Brief card missing.", {
      policyVersion: policy.policyVersion,
    });
  }

  // ── Gate 6: Canary requires human approve ──────────────────────────────
  if (config.publishMode === "canary" && item.status !== "approved") {
    return blockAndRecord(
      "Canary mode requires human approval (status !== 'approved').",
      { policyVersion: policy.policyVersion },
    );
  }

  // ── Build payload ──────────────────────────────────────────────────────
  const sourcePostId = item.brief.triggerPost.postId;
  const rendererVersion = `v${item.brief.schema_version}`;

  const idempotencyKey = buildPublishIdempotencyKey({
    creatorId: item.creatorId,
    sourcePostId,
    conversationId: item.conversationId,
    rendererVersion,
    zhHash: item.renderedPngHashZh,
    enHash: item.renderedPngHashEn,
  });

  const payload: PublishPayload = {
    replyToPostId: sourcePostId,
    text: item.brief.authorThesis,
    mediaPngZh: item.renderedPngZh,
    mediaPngEn: item.renderedPngEn,
    creatorId: item.creatorId,
    conversationId: item.conversationId,
  };

  const payloadHash = await hashPayload(payload);

  // ── Gate 7: Idempotency check (non-dry-run only) ──────────────────────
  if (!config.dryRun && input.checkDuplicate) {
    const existing = await input.checkDuplicate(idempotencyKey);
    if (existing) {
      const attempt: PublishAttempt = {
        id: newId(),
        queueItemId: item.id,
        creatorId: item.creatorId,
        conversationId: item.conversationId,
        sourcePostId,
        policyVersion: policy.policyVersion,
        rolloutMode: config.publishMode,
        dryRun: config.dryRun,
        adapter: existing.adapter,
        payloadHash,
        imageHashZh: item.renderedPngHashZh,
        imageHashEn: item.renderedPngHashEn,
        idempotencyKey,
        decision: "duplicate",
        externalPostId: existing.externalPostId,
        attemptedAt: now,
      };
      if (recordAttempt) {
        await recordAttempt(attempt);
      }
      return { attempt };
    }
  }

  // ── Create adapter ─────────────────────────────────────────────────────
  const adapterConfig: AdapterConfig = {
    publishMode: config.publishMode,
    dryRun: config.dryRun,
    killSwitch: config.killSwitch,
    xWriteBearerToken: config.xWriteBearerToken,
  };

  const adapter = createAdapter(adapterConfig);
  if (!adapter) {
    return blockAndRecord(
      "Adapter creation failed (missing creds or config).",
      {
        policyVersion: policy.policyVersion,
        sourcePostId,
        payloadHash,
        imageHashZh: item.renderedPngHashZh,
        imageHashEn: item.renderedPngHashEn,
        idempotencyKey,
      },
    );
  }

  // ── Execute publish ────────────────────────────────────────────────────
  let publishResult: PublishResult;
  try {
    publishResult = await adapter.publishReplyWithMedia(payload);
  } catch (err) {
    // Log raw error server-side only, neutral message in attempt
    console.error("[aleabit:publish] adapter error:", err);
    publishResult = {
      success: false,
      dryRun: adapter.isDryRun,
      adapter: adapter.name,
      payloadHash,
      error: "Adapter call failed. See server logs.",
      attemptedAt: now,
    };
  }

  const attempt: PublishAttempt = {
    id: newId(),
    queueItemId: item.id,
    creatorId: item.creatorId,
    conversationId: item.conversationId,
    sourcePostId,
    policyVersion: policy.policyVersion,
    rolloutMode: config.publishMode,
    dryRun: config.dryRun,
    adapter: adapter.name,
    payloadHash,
    imageHashZh: item.renderedPngHashZh,
    imageHashEn: item.renderedPngHashEn,
    idempotencyKey,
    decision: publishResult.success ? "attempted" : "error",
    // Neutral error: never expose raw X API response
    failureStage: publishResult.success
      ? undefined
      : "Publish failed. See server logs.",
    externalPostId: publishResult.externalPostId,
    attemptedAt: now,
  };

  // ── Record attempt ─────────────────────────────────────────────────────
  if (recordAttempt) {
    await recordAttempt(attempt);
  }

  return { attempt, publishResult };
}
