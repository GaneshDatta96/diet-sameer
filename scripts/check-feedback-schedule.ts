/**
 * Self-check: feedbackDueAt is purchase + delay hours (default 48).
 * Run: npx tsx scripts/check-feedback-schedule.ts
 */
import assert from "node:assert/strict";
import { feedbackDueAt } from "../src/lib/feedbackEmail";

const t0 = Date.UTC(2026, 0, 1, 12, 0, 0);
assert.equal(feedbackDueAt(t0, 48), t0 + 48 * 60 * 60 * 1000);
assert.equal(feedbackDueAt(t0, 0), t0);
assert.equal(feedbackDueAt(t0, -1), t0 + 48 * 60 * 60 * 1000); // invalid → 48h
console.log("ok: feedbackDueAt");
