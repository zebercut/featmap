# FEAT030 — Tasks tab RICE scoring and Why-this-rank sheet

**Type:** feature
**Status:** Planned | **Progress:** 0%
**MoSCoW:** SHOULD
**Category:** Tasks
**Priority:** 2
**Release:** v2.2
**Tags:** tasks, ui, prioritization, rice, tasks-tab
**Created:** 2026-04-06

**Parent:** [FEAT028 — Tasks tab MVP](../FEAT028_Tasks_tab_with_prioritized_view_search_grouping_and_filtering/FEAT028_Tasks_tab_with_prioritized_view_search_grouping_and_filtering.md)
**Depends on:** FEAT028 (must ship first — `taskPrioritizer.ts` extraction and tab scaffolding)
**Related:** [FEAT029 — Shared RICE module](../FEAT029_Shared_RICE_scoring_module_for_prioritization_across_domains/FEAT029_Shared_RICE_scoring_module_for_prioritization_across_domains.md) (deferred; this feature creates a task-scoped RICE scorer that FEAT029 will later generalize)

---

## Summary

Replace the Phase 1 simple priority sort in `src/modules/taskPrioritizer.ts` with a RICE-based (Reach × Impact × Confidence ÷ Effort) scoring algorithm that weighs OKR linkage, due-date urgency, conflict status, and task age. Add a "Why this rank?" bottom sheet that opens on row tap and shows the factor breakdown + active modifiers so the user can build trust in the ranking.

The RICE scorer lives in `src/modules/rice.ts` and is **scoped to tasks only**. Generalizing it to other domains (features, OKRs, nudges, suggestions) is FEAT029's job and stays deferred until a second consumer actually exists (YAGNI).

---

## Problem Statement

Phase 1's sort is naive: priority enum → due date. It can't distinguish a high-priority errand from a high-priority OKR-linked deep-work task, doesn't weight urgency proportionally, and gives no explanation when the ordering feels wrong. Users will want to know "why is this at the top?" and "why isn't this task higher?" — we need a principled, deterministic, testable scoring model to answer.

---

## User Stories

### Story 1 — Smart prioritization
**As a** user, **I want** tasks ordered by a multi-factor score, **so that** the top of my list reflects what actually matters across urgency, impact, and effort.

**Acceptance Criteria:**
- [ ] Given a task is overdue, when sorted, then it appears above tasks due later (urgency modifier x2.0)
- [ ] Given a task is linked to an OKR, when sorted, then it ranks higher than tasks not tied to goals (Reach +2, Impact +1)
- [ ] Given a task has `priority: "high"` set explicitly, when sorted, then high-priority tasks outrank medium for equal-everything-else
- [ ] Given a task has `conflictStatus: "flagged"`, when sorted, then it is deprioritized (x0.5)
- [ ] All scoring is deterministic — same input produces same output

### Story 2 — Transparency
**As a** user, **I want** to tap a task and see why it's ranked where it is, **so that** I can trust (or challenge) the ordering.

**Acceptance Criteria:**
- [ ] Given a task in the list, when the user taps the row, then a bottom sheet opens showing RICE factors (R, I, C, E) and active modifiers
- [ ] Given the sheet is open, when the user reads it, then each factor shows its raw value and the derivation source (e.g. "Impact 3 — from priority: high")
- [ ] Given modifiers are applied, when the sheet renders, then each modifier shows its label and multiplier (e.g. "Overdue x2.0")
- [ ] Given the sheet is open, when the user taps outside or the close button, then it dismisses

---

## RICE Algorithm

Formula: `baseScore = (Reach * Impact * Confidence) / Effort`, then apply modifiers.

### Factor derivation (task -> RICE input)

| Factor | Range | How it's computed from the real `Task` type |
|--------|-------|---------------------------------------------|
| **Reach** | 0.1 - 10 | +2 if `okrLink` set. +1 per entry in `relatedCalendar`. +1 per entry in `relatedInbox`. Default 0.5. Clamped. |
| **Impact** | 0.25, 0.5, 1, 2, 3 | From `task.priority`: high=3, medium=1, low=0.5. Plus +1 if `okrLink` is set. Clamped to discrete set. |
| **Confidence** | 0 - 1 | 1.0 when `task.priority` is explicitly set (always the case in current model). 0.7 when inferred. |
| **Effort** | 0.1 - 10 | Parsed from `task.timeAllocated` via `parseTimeAllocated(s)` returning hours. Falls back to 1h if unparseable. Clamped. |

**Note on field names:** The current `Task` type ([src/types/index.ts:144-162](src/types/index.ts#L144-L162)) uses `due` (not `dueDate`) and `timeAllocated` (not `estimatedHours`). There is no `tags` field. The scorer works with what exists.

### Modifiers (applied after baseScore)

| Modifier | Effect | Trigger |
|----------|--------|---------|
| Overdue | x2.0 | `status === "overdue"` or `due < todayIso` |
| Due today | x1.5 | `due === todayIso` |
| Due tomorrow | x1.2 | `due === tomorrowIso` |
| Conflict flagged | x0.5 | `conflictStatus === "flagged"` |
| Age > 14 days | x1.1 | `createdAt` older than 14 days and still pending |

The scorer returns `{ score, baseScore, rice: { reach, impact, confidence, effort }, modifiers: [{ label, multiplier }] }` so the Why-this-rank sheet can render the full breakdown.

---

## Time Parsing Helper

`task.timeAllocated` is a free-form string like `"30min"`, `"2h"`, `"1h30m"`. A small parser helper `parseTimeAllocated(s: string): number` lives in `taskPrioritizer.ts` and returns hours:

- `"30min"` -> 0.5
- `"2h"` -> 2.0
- `"1h30m"` -> 1.5
- `""` or unparseable -> 1.0 (fallback)

Unit-tested in isolation.

---

## Architecture Notes

### Scope: tasks only

`src/modules/rice.ts` exposes `computeRice(input, modifiers?)` with a task-friendly API. **Do NOT** create `packages/feature-kit/src/rice.ts`, `src/modules/okrPrioritizer.ts`, or integrate RICE into `proactiveEngine.ts` or `nudges.ts`. Those are FEAT029's scope and are deferred until a second consumer exists.

### Signature compatibility

`computeTaskPriority(tasks, now)` keeps the same signature introduced in FEAT028 P1. Only the body changes. The regression parity tests from FEAT028 are **expected to change** in this feature — update them to reflect the new ordering and add new tests for RICE-specific scenarios.

### No type changes

No modifications to `src/types/index.ts`. RICE inputs are derived at call time from existing `Task` fields.

---

## Implementation Notes

| File | Change |
|------|--------|
| `src/modules/rice.ts` | **NEW** — RICE formula, `computeRice(input, modifiers?)` returning `{ score, baseScore, rice, modifiers }` |
| `src/modules/rice.test.ts` | **NEW** — unit tests for formula correctness and modifier application |
| `src/modules/taskPrioritizer.ts` | Replace P1 sort body with `taskToRice` adapter + `computeRice` call; add `parseTimeAllocated` helper |
| `src/modules/taskPrioritizer.test.ts` | Update regression tests; add RICE-specific scenarios (overdue boost, OKR linkage, conflict deprioritization) |
| `src/components/RiceBadge.tsx` | **NEW** — compact score pill (hidden by default on rows; used in sheet) |
| `src/components/WhyThisRankSheet.tsx` | **NEW** — bottom sheet with factor breakdown + modifier list |
| `app/(tabs)/tasks.tsx` | Wire row tap -> open `WhyThisRankSheet` with the scored task |
| `docs/new_architecture_typescript.md` | Update Sections 6 (modules) and 12 (feature catalog) |

---

## Testing Notes

- [ ] Unit: `computeRice` formula correct for boundary inputs (min/max factor values)
- [ ] Unit: Each modifier applied in isolation produces expected score delta
- [ ] Unit: `parseTimeAllocated` handles `"30min"`, `"2h"`, `"1h30m"`, `""`, `"weird"`, `null`
- [ ] Unit: Overdue + high-priority + OKR-linked task ranks above all other combinations
- [ ] Unit: Conflict-flagged task is demoted below same-priority non-conflicted task
- [ ] Integration: Tap a row -> Why-this-rank sheet opens with correct factor breakdown
- [ ] Integration: Focus Brief (via assembler.ts -> taskPrioritizer) reflects the new ordering — sanity check assembler hasn't drifted
- [ ] Manual: Compare top-10 ordering before and after with real data — user confirms "feels more correct"

---

## Open Questions

- Should RICE score be visible on every row or only in the sheet? **Recommended: hidden on row by default, shown in sheet. Dev toggle for debugging.**
- Modifier display — pills or formula line? **Recommended: pills with multiplier labels.**
- "Due today" boost at 00:00:00 or at wake time? **Recommended: `todayIso` midnight-based (matches existing assembler behavior).**
