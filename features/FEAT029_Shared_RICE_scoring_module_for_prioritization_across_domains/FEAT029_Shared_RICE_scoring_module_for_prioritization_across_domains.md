# FEAT029 — Shared RICE scoring module for prioritization across domains

**Type:** feature
**Status:** Planned | **Progress:** 0%
**MoSCoW:** SHOULD
**Category:** Architecture
**Priority:** 2
**Release:** POST-MVP
**Tags:** rice, prioritization, architecture, shared, scoring
**Created:** 2026-04-06

---

## Summary

A single, reusable RICE (Reach × Impact × Confidence ÷ Effort) scoring module that any domain in the system can use to prioritize its items. Tasks, features, OKRs, nudges, and suggestions all share the same scoring primitive, the same transparency UI, and the same HITL correction flow. One mental model, one implementation, consistent behavior everywhere.

---

## Problem Statement

Today, each domain that needs to prioritize items (tasks, features, nudges, suggestions) either has ad-hoc weighted scoring or no scoring at all. This leads to:

- **Inconsistent mental models** — the user has to reason about priority differently for each domain
- **Duplicated code** — every scorer reinvents weighting, sorting, and breakdown logic
- **Opaque decisions** — no standard way to answer "why is this ranked here?"
- **No learning** — corrections in one domain don't transfer to another because there's no shared abstraction

A shared RICE module solves all four at once.

---

## User Stories

### Story 1 — Consistent scoring everywhere
**As a** user, **I want** tasks, features, nudges, and OKRs to be scored with the same framework, **so that** I can reason about priority the same way everywhere in the app.

**Acceptance Criteria:**
- [ ] Given I look at a task's priority, when I look at a feature's or nudge's priority, then I see the same `R · I · C / E` format
- [ ] Given I tap "Why this rank?" on any item, then I see the same RICE factor breakdown UI
- [ ] Given I bump a task up in the Tasks tab, when I look at how it affects scoring, then the same bump mechanism is available on nudges and features

### Story 2 — Transparent breakdown
**As a** user, **I want** to see exactly why something is ranked where it is, **so that** I trust the system's ordering and know when to correct it.

**Acceptance Criteria:**
- [ ] Given any scored item, when I tap its score badge, then a sheet opens showing reach, impact, confidence, effort, base score, and applied modifiers
- [ ] Each modifier shows its label (e.g. "overdue ×2.0") and its effect on the final score
- [ ] The sheet is the same component regardless of domain

### Story 3 — Developer experience
**As a** developer, **I want** a single function to call for scoring, **so that** I don't reimplement prioritization for each new feature.

**Acceptance Criteria:**
- [ ] Given a new domain needs prioritization, when I implement it, then I write a 10-20 line `domainToRice(item, context)` adapter and call `computeRice()`
- [ ] Given I need to add a modifier (e.g. "deadline within 1 hour"), when I add it, then it works for every domain that wants to use it
- [ ] Given I want to unit-test scoring, then RICE is a pure function with no I/O

---

## MoSCoW × RICE Integration

MoSCoW and RICE are kept as **two orthogonal layers**, not competing ranking systems. Each has a distinct job and never overlaps with the other.

| Layer | Role | Question it answers |
|-------|------|---------------------|
| **MoSCoW** | Scoping filter | "Will we do this at all? Which release does it belong to?" |
| **RICE** | Ordering engine | "In what order should we work on the things we said yes to?" |

### The rules

1. **MoSCoW is the scoping layer.** Every item gets a MUST / SHOULD / COULD / WONT assignment. WONT items are excluded from prioritization entirely — they still exist, still show up in filtered views, but they don't get RICE-scored.

2. **MoSCoW feeds RICE.** The MoSCoW bucket maps directly to the RICE `impact` factor. This is the single source of coupling between the two systems — they never conflict because MoSCoW is an **input** to RICE, not a parallel ranking.

   | MoSCoW | RICE impact | Rationale |
   |--------|-------------|-----------|
   | MUST | 3 | Massive / critical |
   | SHOULD | 2 | High — important but not blocking |
   | COULD | 1 | Medium — nice to have |
   | WONT | — | Not scored |

3. **Views are grouped by MoSCoW, ordered by RICE within groups.** The default list view shows MUST items first (RICE-ordered), then SHOULD (RICE-ordered), then COULD. One glance shows both scoping and ordering.

4. **HITL corrects RICE, not MoSCoW.** If the user bumps or pins items, that adjusts RICE modifiers. MoSCoW stays as the user set it.

5. **Cross-bucket correction triggers a MoSCoW re-eval suggestion.** If the user repeatedly bumps a SHOULD item above all MUST items (or bumps a MUST item below most SHOULDs), the learning loop surfaces a one-tap card: "You keep ranking this SHOULD above your MUSTs — promote to MUST?" or "Demote to SHOULD?". The user makes the call; the system never auto-mutates MoSCoW.

### Why keep both (especially for cross-project reuse)

- **MoSCoW is portable.** Every PM tool, every stakeholder, every client understands MUST/SHOULD/COULD/WONT. Exporting a backlog to a client or another team, they read it instantly. "RICE 4.2" means nothing without explanation.
- **MoSCoW forces the WONT conversation.** RICE alone gives an ordered list with no natural cutoff. MoSCoW forces the user to explicitly decide what they're NOT going to do — which is the single highest-leverage prioritization habit.
- **RICE handles ordering within scope.** MoSCoW alone can't answer "which of my 15 MUSTs should I do first?" RICE does that with transparency, HITL, and the same UI everywhere.
- **They're reusable together.** In Chief Clarity, Saddle Up, or any future project: stakeholders see MoSCoW buckets, the app uses RICE internally to order work. Same code, same rules, same mental model.

### What this means in practice

```
User perspective:
  "I have 5 MUSTs, 12 SHOULDs, 8 COULDs, 3 WONTs"  ← MoSCoW gives the shape
  "Within my MUSTs, this one is top because overdue + high reach"  ← RICE gives the order

Developer perspective:
  computeRice(input) never needs to know about MoSCoW.
  Adapters like featureToRice() translate MoSCoW → impact once.
  No other code path branches on MoSCoW for scoring purposes.
```

---

## Featmap Integration

Featmap (the file-per-feature backlog viewer) is the first UI surface to show both MoSCoW and RICE side-by-side. This is the reference implementation — any other project reusing featmap inherits the same design.

### Default list view

Each feature row shows both systems in a non-competing way:

```
FEAT001  Task management dashboard              [MUST] [R·I·C/E = 7.2] [Pending]
FEAT028  Tasks tab with prioritized view        [SHOULD] [R·I·C/E = 5.8] [Planned]
FEAT017  One-liner open source setup            [SHOULD] [R·I·C/E = 4.1] [Planned]
FEAT005  Mobile-native experience               [COULD] [R·I·C/E = 2.3] [Planned]
```

- **MoSCoW badge** — the existing colored pill (red MUST, yellow SHOULD, blue COULD, gray WONT) stays exactly as it is today.
- **RICE badge** — new compact pill next to it. Format: `R·I·C/E = N` where N is the final score rounded to 1 decimal. Tapping opens the "Why this rank?" sheet.
- **Status badge** — unchanged.

### Default sort order

List view sorts by **MoSCoW first, then RICE descending within each bucket**. This preserves the "scoping shape" (how many MUSTs/SHOULDs/COULDs) while showing the smart order inside each group.

A new "Sort by" dropdown is added:
- **MoSCoW → RICE** (default, grouped)
- **RICE descending** (flat, cross-bucket — useful for "what should I work on next overall?")
- **Priority / ID / Date** (existing options)

### Group-by MoSCoW

The existing `groupBy` selector already has MoSCoW. When active, each MoSCoW section header shows:

```
▼ MUST  (5 features · total effort: 42h · avg RICE: 6.8)
  ...items ordered by RICE desc...

▼ SHOULD  (12 features · total effort: 68h · avg RICE: 4.2)
  ...items ordered by RICE desc...
```

Sum of effort and average RICE per bucket help with release planning at a glance.

### Why-this-rank sheet in featmap

Clicking the RICE badge on any feature opens the shared `WhyThisRankSheet` component:

```
┌─────────────────────────────────────────────┐
│ FEAT028 — Tasks tab with prioritized view   │
│ Final score: 5.8                            │
├─────────────────────────────────────────────┤
│ Reach:      8    (Tasks category, wide)    │
│ Impact:     2    (SHOULD → 2)              │
│ Confidence: 0.8  (complexity known)        │
│ Effort:     2.8  (medium complexity ≈ 20h) │
│                                             │
│ Base score: (8 × 2 × 0.8) / 2.8 = 4.57     │
├─────────────────────────────────────────────┤
│ Modifiers:                                  │
│   + dependency on FEAT029 (×1.2)           │
│   + user pinned (+1000)                    │
│                                             │
│ Final: 5.48 × 1.2 = 6.58  → rounded to 5.8 │
└─────────────────────────────────────────────┘
```

### Filtering and search

- **Filter by MoSCoW** — existing, unchanged
- **Filter by RICE range** — new: slider for "score ≥ N" to hide low-priority noise
- **Sort within filter** — filters compose with sort order (e.g. "MUST with RICE ≥ 5, sorted by RICE desc")
- **Search** — existing, unchanged

### Live editing

- Editing `moscow` on a row automatically recomputes the RICE score (because it feeds `impact`). The UI shows a brief "RICE updated" toast.
- Editing `complexity` also recomputes RICE (feeds `effort` and `confidence`).
- Editing `priority` (the numeric user priority) is now optional — RICE makes it redundant. Kept for backwards compat but hidden behind an "Advanced" toggle.

### Milestone view

The existing Milestones view already groups by `release`. RICE is added to the sort within each milestone card. Each milestone shows:

```
┌─ MVP ───────────────────────┐
│ Progress: 60% (3/5 done)    │
│ Total effort: 42h           │
│ Top unfinished item:        │
│   FEAT028 (MUST, RICE 7.2)  │
└─────────────────────────────┘
```

### Implementation notes for featmap

| File | Change |
|------|--------|
| `packages/featmap/src/rice.ts` | **NEW** — `featureToRice()` adapter mapping Feature → RiceInput |
| `packages/featmap/src/html-generator.ts` | Add RiceBadge render, "Why this rank?" sheet, RICE range filter, MoSCoW→RICE default sort |
| `packages/featmap/schema/feature.schema.json` | No changes — all RICE fields derived from existing MoSCoW, complexity, category, tags |
| `packages/featmap/src/types.ts` | Optional: add `RiceResult` to `Feature` type as a computed property |

Featmap re-exports the shared `rice.ts` from the host project (or inlines a minimal copy for the submodule case, since featmap is a zero-dependency standalone). Both approaches keep the formula identical.

---

## Architecture

### Core module: `src/modules/rice.ts`

```typescript
export interface RiceInput {
  reach: number;        // 0.1 – 10
  impact: number;       // 0.25 | 0.5 | 1 | 2 | 3
  confidence: number;   // 0 – 1
  effort: number;       // 0.1 – 10 (hours or effort units)
}

export interface RiceModifier {
  label: string;        // human-readable, shown in breakdown
  multiplier?: number;  // applied multiplicatively
  addend?: number;      // applied additively (for pins, etc.)
}

export interface RiceResult {
  score: number;                 // final score after modifiers
  baseScore: number;             // pre-modifier RICE score
  rice: RiceInput;               // the four factors
  modifiers: RiceModifier[];     // applied modifiers with their effects
}

/** Pure function. No I/O. No side effects. */
export function computeRice(input: RiceInput, modifiers?: RiceModifier[]): RiceResult;

/** Human-readable breakdown for "Why this rank?" sheets. */
export function explainRice(result: RiceResult): string;

/** Guardrails — clamp inputs into valid ranges, apply sensible defaults. */
export function clampRiceInput(input: Partial<RiceInput>): RiceInput;

/** Sort an array of items by RICE score descending. */
export function sortByRice<T extends { rice: RiceResult }>(items: T[]): T[];
```

### Formula

```
baseScore = (reach × impact × confidence) / effort
finalScore = modifiers.reduce((s, m) => (s + (m.addend ?? 0)) × (m.multiplier ?? 1), baseScore)
```

Modifiers are applied in order. Addends happen before multipliers within each modifier step. The `modifiers` array is preserved in the result for full transparency.

### Defaults (when a domain adapter can't determine a value)

| Factor | Default | Rationale |
|--------|---------|-----------|
| `reach` | 1 | Single-user context — most items affect one "person" |
| `impact` | 1 | Medium impact is the safe middle |
| `confidence` | 0.5 | "We're guessing" — raises as the user corrects |
| `effort` | 1 | One unit of effort (hour or abstract) |

### Domain adapters

Each domain writes a small function: `itemToRice(item, context) → RiceInput`.

**Tasks** (`src/modules/taskPrioritizer.ts`):
```typescript
function taskToRice(task: Task, state: AppState, now: Date): RiceInput {
  return clampRiceInput({
    reach: countLinkedContexts(task, state),   // topics + OKRs touched
    impact: task.priority === "high" ? 3 : task.priority === "medium" ? 1 : 0.5,
    confidence: task.priority ? 1.0 : 0.5,     // user-set vs inferred
    effort: task.estimatedHours ?? inferEffort(task),
  });
}
```

**Features** (`packages/feature-kit/src/rice.ts`):
```typescript
function featureToRice(f: Feature): RiceInput {
  return clampRiceInput({
    reach: f.category === "Tasks" ? 8 : 3,     // cross-cutting features = higher reach
    impact: f.moscow === "MUST" ? 3 : f.moscow === "SHOULD" ? 2 : 1,
    confidence: f.complexity ? 0.8 : 0.5,
    effort: complexityToHours(f.complexity),
  });
}
```

**OKRs / KRs** (`src/modules/okrPrioritizer.ts`):
```typescript
function krToRice(kr: KeyResult, state: AppState): RiceInput {
  return clampRiceInput({
    reach: kr.linkedTasks.length + 2,
    impact: kr.weight,                         // 1 – 3
    confidence: kr.progressConfidence ?? 0.7,
    effort: kr.estimatedWeeks * 5,
  });
}
```

**Nudges** (`src/modules/nudges.ts`) and **Suggestions** (`src/modules/proactiveEngine.ts`) follow the same pattern.

### Shared UI components

| Component | Purpose |
|-----------|---------|
| `src/components/RiceBadge.tsx` | Compact pill showing score. Tapping opens the breakdown sheet. |
| `src/components/WhyThisRankSheet.tsx` | Modal showing RICE inputs + modifiers + final score with visual breakdown |
| `src/components/RiceInputEditor.tsx` | Editable form for manual RICE overrides (used in HITL flows) |

These components are domain-agnostic — they take a `RiceResult` and render it identically whether the source is a task, feature, OKR, nudge, or suggestion.

---

## Workflow

```
Domain needs to prioritize items
  → Adapter maps domain model → RiceInput
  → Optional: collect modifiers (overdue, pinned, snoozed, etc.)
  → computeRice(input, modifiers) → RiceResult
  → Sort items by result.score descending
  → Render with RiceBadge component
  → User taps badge → WhyThisRankSheet opens
  → User makes HITL correction → adds a modifier or adjusts input via RiceInputEditor
  → Logged to learning_log.json with category "rice_correction"
  → Re-score on next render
```

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| `effort` is 0 | Clamped to 0.1 to prevent division by zero |
| `confidence` is 0 | Base score becomes 0 — item sinks to bottom |
| All factors at default | Base score = 0.5, acts as a neutral baseline |
| Modifier with `multiplier: 0` | Legal — effectively zeros the score |
| Empty modifiers array | Score equals base score |
| Negative RICE input | Clamped to 0.1 minimum |
| Item with no adapter | Won't compile — adapters are required per domain (type-safe) |

---

## Success Metrics

- All domains that need prioritization use `rice.ts` (no ad-hoc scorers)
- One "Why this rank?" UI that works everywhere
- Adding a new prioritized domain takes < 30 lines of adapter code
- User corrections in one domain can inform scoring in another (shared HITL log category)

---

## Out of Scope

- Domain-specific priority fields (each domain keeps its own raw data)
- Machine learning — the learning loop is deterministic pattern matching, not ML
- Cross-item dependencies (e.g. "this task blocks that task") — handled by domain logic, not RICE
- Automatic RICE input inference from natural language — adapters are hand-written

---

## Implementation Notes

| File | Change |
|------|--------|
| `src/modules/rice.ts` | **NEW** — core RICE module |
| `src/modules/rice.test.ts` | **NEW** — unit tests for formula, modifiers, clamping, sorting |
| `src/components/RiceBadge.tsx` | **NEW** — shared score pill |
| `src/components/WhyThisRankSheet.tsx` | **NEW** — shared breakdown modal |
| `src/components/RiceInputEditor.tsx` | **NEW** — shared manual override form |
| `src/types/index.ts` | Add `RiceInput`, `RiceModifier`, `RiceResult` interfaces |
| `docs/new_architecture_typescript.md` | Add RICE module to Section 6 (Module Responsibilities) and Section 9 (ADRs) |

---

## Testing Notes

- [ ] Unit: `computeRice` returns `(R × I × C) / E` for trivial inputs
- [ ] Unit: modifiers applied in order, multipliers and addends combine correctly
- [ ] Unit: `clampRiceInput` clamps negative, zero, and out-of-range values
- [ ] Unit: `sortByRice` sorts descending and is stable for ties
- [ ] Unit: `explainRice` produces a human-readable string with all factors and modifiers
- [ ] Integration: task adapter produces expected scores for representative tasks
- [ ] Integration: feature adapter produces expected scores for representative features
- [ ] Visual regression: `RiceBadge` and `WhyThisRankSheet` render identically across domains

---

## Dependencies

- FEAT028 (Tasks tab) — first consumer of the shared module
- Future features that need prioritization (OKR pace, nudges ranking, suggestions ordering)

---

## Open Questions

- Should `impact` be free-form (0.1–10) or fixed to the standard RICE ladder (0.25, 0.5, 1, 2, 3)?
- Should `effort` be normalized to hours across domains, or kept abstract (relative effort units)?
- Should modifiers be typed (enum of known labels) or free-form strings?
- Should there be a global "confidence floor" that raises over time as the user makes fewer corrections?
