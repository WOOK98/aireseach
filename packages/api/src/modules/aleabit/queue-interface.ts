/**
 * AleaBit — Queue interface (#127)
 *
 * Common interface for in-memory (ReviewQueue) and persistent (PersistentReviewQueue)
 * queue implementations. Enables shadow-run to work with both.
 */

import type { EvidenceGateResult } from "./gates/evidence";
import type {
  ContentCategory,
  EntityResolution,
  FinancialBriefCard,
  TriggerPost,
} from "@workspace/shared/types/aleabit";
import type { ClassificationResult } from "@workspace/shared/types/aleabit";

export interface QueueItem {
  id: string;
  conversationId: string;
  triggerPost: TriggerPost;
  status: string;
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

/**
 * Common queue interface. Both sync (in-memory) and async (persistent)
 * implementations satisfy this — callers should `await` all methods.
 */
export interface AddQueueItem {
  id: string;
  creatorId?: string; // multi-creator idempotency
  conversationId: string;
  triggerPost: TriggerPost;
  status: string;
  editHistory?: string[];
  version?: number;
}

export interface IReviewQueue {
  add(item: AddQueueItem): Promise<QueueItem> | QueueItem;
  updateStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<QueueItem | null> | QueueItem | null;
  setBrief(
    id: string,
    brief: FinancialBriefCard,
  ): Promise<QueueItem | null> | QueueItem | null;
  setRenderedHtml(
    id: string,
    html: string,
  ): Promise<QueueItem | null> | QueueItem | null;
  setClassification(
    id: string,
    classification: ClassificationResult,
  ): Promise<QueueItem | null> | QueueItem | null;
  setEntity(
    id: string,
    entity: EntityResolution,
  ): Promise<QueueItem | null> | QueueItem | null;
  setEvidenceGate(
    id: string,
    gate: EvidenceGateResult,
  ): Promise<QueueItem | null> | QueueItem | null;
  get(id: string): Promise<QueueItem | undefined> | QueueItem | undefined;
  getAll(): Promise<QueueItem[]> | QueueItem[];
}
