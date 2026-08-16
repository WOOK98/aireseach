/**
 * AleaBit — Publish executor (#139)
 *
 * Orchestrates the publish attempt pipeline:
 * 1. Check policy decision verdict === "allowed"
 * 2. Check bilingual PNG artifact hashes exist
 * 3. Check canary requires human approve
 * 4. Generate idempotency key
 * 5. Check for duplicate (non-dry-run only)
 * 6. Call adapter (dry-run or real)
 * 7. Record publish attempt
 *
 * SAFETY: Default is off + dry-run + kill-switch.
 * No external writes without all gates passing.
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

// ── Blocking reason builder ───────────────────────────────────────────────────

function block(reason: string): PublishAttempt {
  return {
    id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    failureStage: reason,
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

  // Sync hash using crypto
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── Publish executor ──────────────────────────────────────────────────────────

export interface PublishExecutorInput {
  item: QueueItem;
  config: PublishExecutorConfig;
  /**
   * Check if this idempotency key has already been published (non-dry-run).
   * Returns existing attempt if found, null if not.
   */
  checkDuplicate?: (key: string) => Promise<PublishAttempt | null>;
  /**
   * Record the publish attempt.
   */
  recordAttempt?: (attempt: PublishAttempt) => Promise<void>;
}

export interface PublishExecutorResult {
  attempt: PublishAttempt;
  publishResult?: PublishResult;
}

/**
 * Execute a publish attempt for a queue item.
 *
 * Checks all gates in order, short-circuits on first failure.
 * Returns a PublishAttempt record for audit.
 */
export async function executePublishAttempt(
  input: PublishExecutorInput,
): Promise<PublishExecutorResult> {
  const { item, config } = input;

  // ── Gate 1: Kill switch ────────────────────────────────────────────────
  if (config.killSwitch) {
    const attempt = {
      ...block("Kill switch is active."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  // ── Gate 2: Mode off ───────────────────────────────────────────────────
  if (config.publishMode === "off") {
    const attempt = {
      ...block("Publish mode is 'off'."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  // ── Gate 3: Policy decision ────────────────────────────────────────────
  const policy = item.policyDecision;
  if (!policy) {
    const attempt = {
      ...block("No policy decision on item."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  if (policy.verdict !== "allowed") {
    const attempt = {
      ...block(`Policy verdict is '${policy.verdict}', not 'allowed'.`),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      policyVersion: policy.policyVersion,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  // ── Gate 4: Bilingual PNG artifacts ────────────────────────────────────
  if (!item.renderedPngHashZh) {
    const attempt = {
      ...block("zh-CN PNG artifact hash missing."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      policyVersion: policy.policyVersion,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  if (!item.renderedPngHashEn) {
    const attempt = {
      ...block("en PNG artifact hash missing."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      policyVersion: policy.policyVersion,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  // ── Gate 5: Brief must exist ───────────────────────────────────────────
  if (!item.brief) {
    const attempt = {
      ...block("Brief card missing."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      policyVersion: policy.policyVersion,
      rolloutMode: config.publishMode,
    };
    return { attempt };
  }

  // ── Gate 6: Canary requires human approve ──────────────────────────────
  if (config.publishMode === "canary" && item.status !== "approved") {
    const attempt = {
      ...block("Canary mode requires human approval (status !== 'approved')."),
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      policyVersion: policy.policyVersion,
      rolloutMode: config.publishMode,
    };
    return { attempt };
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
        id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
        attemptedAt: new Date().toISOString(),
      };
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
    const attempt: PublishAttempt = {
      id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      queueItemId: item.id,
      creatorId: item.creatorId,
      conversationId: item.conversationId,
      sourcePostId,
      policyVersion: policy.policyVersion,
      rolloutMode: config.publishMode,
      dryRun: config.dryRun,
      adapter: "none",
      payloadHash,
      imageHashZh: item.renderedPngHashZh,
      imageHashEn: item.renderedPngHashEn,
      idempotencyKey,
      decision: "blocked",
      failureStage:
        "Adapter creation failed (kill-switch / off / missing creds).",
      attemptedAt: new Date().toISOString(),
    };
    return { attempt };
  }

  // ── Execute publish ────────────────────────────────────────────────────
  let publishResult: PublishResult;
  try {
    publishResult = await adapter.publishReplyWithMedia(payload);
  } catch {
    publishResult = {
      success: false,
      dryRun: adapter.isDryRun,
      adapter: adapter.name,
      payloadHash,
      error: "Adapter call threw an exception.",
      attemptedAt: new Date().toISOString(),
    };
  }

  const attempt: PublishAttempt = {
    id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    failureStage: publishResult.error,
    externalPostId: publishResult.externalPostId,
    attemptedAt: new Date().toISOString(),
  };

  // ── Record attempt ─────────────────────────────────────────────────────
  if (input.recordAttempt) {
    await input.recordAttempt(attempt);
  }

  return { attempt, publishResult };
}
