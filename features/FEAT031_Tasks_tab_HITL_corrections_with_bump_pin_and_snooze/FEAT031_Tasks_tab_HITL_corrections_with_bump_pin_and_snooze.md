# FEAT031 — Tasks tab HITL corrections with bump, pin, and snooze

**Type:** feature
**Status:** Planned | **Progress:** 0%
**MoSCoW:** SHOULD
**Category:** Tasks
**Priority:** 3
**Release:** v2.3
**Tags:** tasks, ui, hitl, corrections, tasks-tab
**Created:** 2026-04-06

**Parent:** [FEAT028 — Tasks tab MVP](../FEAT028_Tasks_tab_with_prioritized_view_search_grouping_and_filtering/FEAT028_Tasks_tab_with_prioritized_view_search_grouping_and_filtering.md)
**Depends on:** FEAT030 (RICE scoring must exist so corrections can modify a meaningful score)
**Enables:** [FEAT032 — Learning loop](../FEAT032_Tasks_tab_learning_loop_for_adaptive_priority_weights/FEAT032_Tasks_tab_learning_loop_for_adaptive_priority_weights.md) (learning loop needs the correction log this feature produces)

---

## Summary

Add a long-press menu on each task row with four actions — **Bump up**, **Bump down**, **Pin to top**, **Snooze (not now)** — that let the user correct the automatic ranking when it's wrong. Corrections write to two places: a per-task `task.hitl` object that adjusts the task's score immediately, and an append-only log on `FeedbackMemory.corrections` that feeds the future learning loop (FEAT032).

---

## Problem Statement

Even with RICE, the automatic ranking will sometimes be wrong — a low-scoring task might suddenly become urgent because of a phone call, or a high-scoring task might be blocked waiting for someone else. Users need a direct, fast affordance to override the ordering without editing task fields. Today they have no such affordance.

Equally important: every correction is signal. The system should capture corrections in a structured log so FEAT032 can later detect patterns ("the user consistently demotes OKR-linked tasks during focus hours") and propose adjustments.

---

## User Stories

### Story 1 — Immediate override
**As a** user, **I want** to long-press a task and bump it up or down, **so that** I can correct the ranking without opening the task or editing fields.

**Acceptance Criteria:**
- [ ] Given a task row, when the user long-presses it, then a menu appears with: Bump up, Bump down, Pin to top, Snooze (not now)
- [ ] Given the user taps "Bump up", when the list re-renders, then the task moves up and a toast confirms "Bumped up"
- [ ] Given the user bumps up twice, when the list re-renders, then the task's `hitl.bumpOffset` is +20 (each bump = +10)
- [ ] Given a task has a non-zero `bumpOffset`, when 7 days pass since `bumpUpdatedAt`, then the offset decays linearly to 0
- [ ] Given the menu is open, when the user taps outside, then it dismisses without action

### Story 2 — Pin to top
**As a** user, **I want** to pin a task so it stays at the top no matter what, **so that** I can keep the most important thing visible.

**Acceptance Criteria:**
- [ ] Given a task, when the user taps "Pin to top", then `hitl.pinnedAt` is set and the task sorts to the top (add +1000 to score)
- [ ] Given a pinned task, when the user long-presses and taps "Unpin", then `hitl.pinnedAt` is cleared and the task returns to its scored position
- [ ] Given a pinned task is completed, when the list refreshes, then the pin is auto-cleared

### Story 3 — Snooze
**As a** user, **I want** to tell the system "not now" for a task, **so that** it gets out of my way for 24 hours.

**Acceptance Criteria:**
- [ ] Given a task, when the user taps "Snooze", then `hitl.snoozedUntil` is set to now + 24h and the task's score is multiplied by 0.2
- [ ] Given a snoozed task, when 24h pass, then `hitl.snoozedUntil` expires and the task returns to normal scoring
- [ ] Given a snoozed task, when the user long-presses and taps "Unsnooze", then `hitl.snoozedUntil` is cleared immediately

### Story 4 — Audit trail
**As a** system, **I need** every correction logged in an append-only structured format, **so that** FEAT032's learning loop has data to analyze.

**Acceptance Criteria:**
- [ ] Given the user performs any HITL action, when the write completes, then a `TaskPriorityCorrection` entry is appended to `FeedbackMemory.corrections`
- [ ] Given the entry is created, when inspected, then it contains `kind: "task_priority"`, timestamp, taskId, action, scoreBefore, scoreAfter, positionBefore, positionAfter
- [ ] Given the corrections log has 1000+ entries, when a new entry is added, then it is still appended (no FIFO cap for now — revisit if log grows unbounded)

---

## Type Extensions

### New interfaces in `src/types/index.ts`

```typescript
export interface TaskHITL {
  bumpOffset?: number;          // Signed; decays linearly over 7 days
  bumpUpdatedAt?: string;       // ISO timestamp, for decay calculation
  pinnedAt?: string | null;     // ISO timestamp when pinned, null otherwise
  snoozedUntil?: string | null; // ISO timestamp when snooze expires
}

export interface TaskPriorityCorrection {
  kind: "task_priority";
  timestamp: string;
  taskId: string;
  action: "bump_up" | "bump_down" | "pin" | "unpin" | "snooze" | "unsnooze";
  scoreBefore: number;
  scoreAfter: number;
  positionBefore: number;
  positionAfter: number;
}
```

### Modifications to existing interfaces

```typescript
// Task gains an optional hitl field
export interface Task {
  // ... existing fields unchanged
  hitl?: TaskHITL;
}

// FeedbackMemory.corrections widens to accept both shapes (discriminated union)
export interface FeedbackMemory {
  // ... existing fields
  corrections: Array<
    | { original: string; correctedTo: string; date: string }  // legacy
    | TaskPriorityCorrection                                    // new
  >;
}
```

**Why `FeedbackMemory.corrections` and not `learning_log.json`:**
`FeedbackMemory.corrections` ([src/types/index.ts:251-255](src/types/index.ts#L251-L255)) is already the designated place for user corrections and is currently unused. `LearningItem` is for spaced-repetition learning and has the wrong shape (it has `masteryLevel`, `nextReview`, etc.) — using it for HITL corrections would be a category error.

---

## Scoring modifiers added to `taskPrioritizer.ts`

After FEAT030's RICE score is computed, three new modifiers are applied:

| Modifier | Effect | Source |
|----------|--------|--------|
| **HITL pin** | `score + 1000` | `task.hitl.pinnedAt !== null` |
| **HITL bump** | `score + (bumpOffset * decayFactor)` | `task.hitl.bumpOffset`, 7-day linear decay from `bumpUpdatedAt` |
| **HITL snooze** | `score * 0.2` if `snoozedUntil > now`, else no-op | `task.hitl.snoozedUntil` |

Pure functions, fully deterministic, unit-tested.

---

## Write path

HITL actions reuse the existing executor write pipeline — no new write semantics:

1. Task row long-press -> action selected
2. UI computes new `task.hitl` state locally
3. UI dispatches `{ file: "tasks", action: "update", id: task.id, data: { hitl: newHitl } }` via existing executor
4. UI dispatches `{ file: "feedbackMemory", action: "update", data: { corrections: [...existing, newEntry] } }`
5. `flushWrites()` persists both atomically
6. State reloads -> list re-sorts

---

## Architecture Notes

- **Sacred boundary:** No LLM in HITL logic. Long-press menu, score adjustments, and correction logging are all deterministic TypeScript.
- **No new files outside the ones listed** — reuse existing executor, loader, and write pipeline.
- **Decay is lazy:** computed at read time from `bumpUpdatedAt`, not via background task. Keeps it simple.
- **Unpin/unsnooze are mirror actions** of pin/snooze and share the same menu affordance when already active.

---

## Implementation Notes

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `TaskHITL`, `TaskPriorityCorrection`; add optional `hitl` on `Task`; widen `FeedbackMemory.corrections` |
| `src/modules/taskPrioritizer.ts` | Apply HITL pin/bump/snooze modifiers with decay logic |
| `src/modules/taskPrioritizer.test.ts` | Add unit tests for pin, bump decay, snooze expiry |
| `src/modules/executor.ts` | Verify `tasks update` handles the new `hitl` subfield (may already work; test to confirm) |
| `app/(tabs)/tasks.tsx` | Long-press menu UI, dispatch writes, show toast |
| `src/components/TaskHitlMenu.tsx` | **NEW** — action sheet component for the long-press menu |
| `docs/new_architecture_typescript.md` | Update Sections 4 (data file architecture — note corrections log extension), 5 (types), 6 (modules), 12 (feature catalog) |

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User bumps an already-bumped task | Replace offset with new total, update `bumpUpdatedAt` (decay resets) |
| User pins a task that's already pinned | No-op; toast says "Already pinned" |
| User snoozes a pinned task | Pin wins (+1000 dominates x0.2); toast warns "Unpin first to snooze" |
| Task completed while pinned | Auto-unpin on completion; no correction log entry (it's a natural expiry) |
| Corrections log grows to 10k+ entries | Accept for now; FEAT032 will add compaction if needed |
| User bumps down repeatedly to "hide" a task | Score can go negative; add a floor of -500 to prevent permanent burial |

---

## Testing Notes

- [ ] Unit: HITL pin adds +1000 to score
- [ ] Unit: HITL bump offset applied with correct sign
- [ ] Unit: HITL bump offset decays linearly over 7 days (test at day 0, 3, 7, 14)
- [ ] Unit: HITL snooze multiplies by 0.2 only when `snoozedUntil > now`
- [ ] Unit: Unpin clears the bonus; list reorders
- [ ] Integration: Long-press -> bump up -> task moves up, correction logged
- [ ] Integration: Pin then complete -> pin auto-cleared
- [ ] Integration: Correction entries are discriminated correctly (legacy string entries still readable)
- [ ] Manual: Bump, pin, snooze flows feel fast and don't require confirmation dialogs

---

## Open Questions

- Should there be a cap on pinned tasks (e.g. max 3) to prevent pin-everything behavior? **Recommended: no cap in v1; revisit if abuse observed.**
- Should the long-press menu include "Undo last correction"? **Recommended: defer to v2. `unpin` / `unsnooze` cover the common case.**
- Should bumping be stepped (±10) or absolute ("make this #3")? **Recommended: stepped. Absolute positioning re-introduces the manual-sort model we're deliberately avoiding.**
