import type { EvidenceGateResult } from "./gates/evidence";
/**
 * AleaBit — Review queue store (#121)
 *
 * In-memory queue with status transitions.
 * Each item tracks: trigger post, classification, entity resolution,
 * evidence gate result, structured brief (if generated), and status.
 *
 * Status flow: detected → researching → ready_for_review | needs_review | skipped | failed
 */
import type {
  BriefStatus,
  ContentCategory,
  EntityResolution,
  FinancialBriefCard,
  TriggerPost,
} from "@workspace/shared/types/aleabit";
import type { ClassificationResult } from "@workspace/shared/types/aleabit";

// ── Queue item ───────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  creatorId: string;
  conversationId: string;
  triggerPost: TriggerPost;
  status: BriefStatus;
  category?: ContentCategory;
  classification?: ClassificationResult;
  entity?: EntityResolution;
  evidenceGate?: EvidenceGateResult;
  brief?: FinancialBriefCard;
  renderedHtml?: string;
  skipReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ── Status transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BriefStatus, BriefStatus[]> = {
  detected: ["researching", "skipped", "failed"],
  researching: ["ready_for_review", "needs_review", "skipped", "failed"],
  ready_for_review: [], // terminal
  needs_review: [], // terminal
  skipped: [], // terminal
  failed: [], // terminal
};

export function isValidTransition(from: BriefStatus, to: BriefStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Queue operations ─────────────────────────────────────────────────────────

export class ReviewQueue {
  private items: Map<string, QueueItem> = new Map();

  add(item: Omit<QueueItem, "createdAt" | "updatedAt">): QueueItem {
    const now = new Date().toISOString();
    const fullItem: QueueItem = {
      ...item,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, fullItem);
    return fullItem;
  }

  updateStatus(
    id: string,
    status: BriefStatus,
    reason?: string,
  ): QueueItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    if (!isValidTransition(item.status, status)) {
      throw new Error(
        `Invalid transition: ${item.status} → ${status} for item ${id}`,
      );
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();

    if (status === "skipped") {
      item.skipReason = reason;
    } else if (status === "failed") {
      item.failureReason = reason;
    }

    return item;
  }

  setBrief(id: string, brief: FinancialBriefCard): QueueItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    item.brief = brief;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  setRenderedHtml(id: string, html: string): QueueItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    item.renderedHtml = html;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  setClassification(
    id: string,
    classification: ClassificationResult,
  ): QueueItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    item.classification = classification;
    item.category = classification.category;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  setEntity(id: string, entity: EntityResolution): QueueItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    item.entity = entity;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  setEvidenceGate(id: string, gate: EvidenceGateResult): QueueItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    item.evidenceGate = gate;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  get(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  getAll(): QueueItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getByStatus(status: BriefStatus): QueueItem[] {
    return this.getAll().filter((item) => item.status === status);
  }

  clear(): void {
    this.items.clear();
  }
}
