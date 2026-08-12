/**
 * AleaBit — Shadow-run tests (#121)
 *
 * Validates:
 * - All 4 fixtures produce explicit queue status (no silent drops)
 * - At least 1 skipped, 1 needs_review
 * - Queue state transitions are valid
 * - No fixture is silently lost
 */
import { describe, it, expect } from "vitest";

import { isValidTransition } from "../queue";
import { runShadowRun } from "../shadow-run";

describe("shadow-run", () => {
  it("processes all 4 fixtures without silent drops", async () => {
    const result = await runShadowRun();
    expect(result.summary.total).toBe(4);
    // Every item must be in a terminal state
    expect(
      result.summary.readyForReview +
        result.summary.needsReview +
        result.summary.skipped +
        result.summary.failed,
    ).toBe(4);
  });

  it("produces at least 1 ready_for_review with brief artifact", async () => {
    const result = await runShadowRun();
    expect(result.summary.readyForReview).toBeGreaterThanOrEqual(1);
    const item = result.items.find((i) => i.status === "ready_for_review");
    expect(item?.brief).toBeTruthy();
    expect(item?.renderedHtml).toBeTruthy();
    expect(item?.renderedHtml).toContain("<!DOCTYPE html>");
    expect(item?.brief?.metrics.length).toBeGreaterThan(0);
  });

  it("produces at least 1 skipped (no-entity macro)", async () => {
    const result = await runShadowRun();
    expect(result.summary.skipped).toBeGreaterThanOrEqual(1);
    const skippedItem = result.items.find((i) => i.status === "skipped");
    expect(skippedItem?.skipReason).toBeTruthy();
  });

  it("produces at least 1 needs_review", async () => {
    const result = await runShadowRun();
    expect(result.summary.needsReview).toBeGreaterThanOrEqual(1);
    const item = result.items.find((i) => i.status === "needs_review");
    expect(
      item?.skipReason ||
        item?.failureReason ||
        item?.entity?.reviewReason ||
        item?.evidenceGate?.reason,
    ).toBeTruthy();
  });

  it("every item has trigger post", async () => {
    const result = await runShadowRun();
    for (const item of result.items) {
      expect(item.triggerPost).toBeTruthy();
      expect(item.triggerPost.postId).toBeTruthy();
      expect(item.triggerPost.text).toBeTruthy();
    }
  });

  it("classification result is populated for all items", async () => {
    const result = await runShadowRun();
    for (const item of result.items) {
      expect(item.classification).toBeTruthy();
      expect(item.category).toBeTruthy();
    }
  });
});

describe("queue transitions", () => {
  it("allows valid transitions", () => {
    expect(isValidTransition("detected", "researching")).toBe(true);
    expect(isValidTransition("detected", "skipped")).toBe(true);
    expect(isValidTransition("researching", "ready_for_review")).toBe(true);
    expect(isValidTransition("researching", "needs_review")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(isValidTransition("skipped", "researching")).toBe(false);
    expect(isValidTransition("ready_for_review", "failed")).toBe(false);
    expect(isValidTransition("needs_review", "detected")).toBe(false);
  });
});
