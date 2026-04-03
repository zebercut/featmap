# featmap

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

File-per-feature backlog management. CLI, TypeScript API, validation, HTML viewer with live editing.

Each feature is a folder (e.g. `FEAT001_user_authentication/`) containing a JSON metadata file and a Markdown doc. A `_manifest.json` index and `features.html` viewer are auto-regenerated on every mutation.

No database. No framework. Plain files, validated by JSON Schema, managed by CLI.

## Quick start

```bash
# Clone or add as submodule
git submodule add https://github.com/zebercut/featmap.git packages/featmap
cd packages/featmap && npm install

# Create your features directory (in your project, not inside featmap)
mkdir -p features

# Add your first feature
npx ts-node packages/featmap/src/cli.ts add --dir=./features \
  --title="User authentication" --category="Auth" --moscow=MUST --priority=1
```

This creates:

```
features/
  _manifest.json                            # auto-generated index
  features.html                             # auto-generated HTML viewer
  FEAT001_user_authentication/
    FEAT001_user_authentication.json        # structured metadata
    FEAT001_user_authentication.md          # rich documentation template
```

## Setup

### Set the features path

Pick one:

**Option A — Environment variable:**
```bash
export FEATMAP_DIR=./features
```

**Option B — Pass `--dir` on every command:**
```bash
npx ts-node packages/featmap/src/cli.ts list --dir=./features
```

**Option C — npm script wrapper** (recommended):
```json
{
  "scripts": {
    "feat": "ts-node packages/featmap/src/cli.ts --dir=./features"
  }
}
```
Then: `npm run feat -- list`, `npm run feat -- add --title="..." --category="..." --moscow=MUST`

### .gitignore (optional)

```gitignore
features.html
```

The HTML viewer is auto-generated. The `_manifest.json` is also generated but useful to commit for quick lookups.

## CLI

```bash
featmap list [--status=X] [--category=X] [--moscow=X] [--release=X] [--sort=X]
featmap show FEAT001
featmap add --title="..." --category="..." --moscow=MUST [--priority=N] [--release=v1.0] [--tags=admin,api]
featmap update FEAT001 --status="In Progress" [--priority=N] [--moscow=X] [--release=v1.0]
featmap regen
featmap html [--out=path]
featmap serve [--port=3456]
featmap stats
featmap help
```

Replace `featmap` with `npx ts-node packages/featmap/src/cli.ts --dir=./features` or your wrapper script.

## Live server

```bash
featmap serve --port=3456
```

- Dark/light theme toggle (persisted)
- Inline editing — click any cell to edit via dropdown or text input
- Combobox dropdowns — pick from existing values or add new ones
- Click feature title to view its Markdown doc in a slide-out panel
- SSE (Server-Sent Events) — real-time updates across browser tabs
- REST API: `GET /api/features`, `GET /api/features/:id/doc`, `POST /api/features/:id`
- File watchers — disk edits push to the browser automatically
- Auto-port — if the port is busy, tries the next available (up to 10 attempts)
- Pagination with configurable page size
- Sortable columns with sticky headers
- Group by: status, category, MoSCoW, release, tag

## TypeScript API

```typescript
import {
  loadAllFeatures,
  loadFeatureById,
  writeFeature,
  updateFeature,
  filterFeatures,
  sortFeatures,
  nextFeatureId,
  generateManifest,
  generateHtml,
  startServer,
} from "featmap";

const features = loadAllFeatures("./features");
const planned = filterFeatures(features, { status: "Planned" });
const byRelease = filterFeatures(features, { release: "v1.0" });
const single = loadFeatureById("./features", "FEAT001");
```

## Feature schema

Each feature folder is named `FEAT001_snake_case_title/` and contains a JSON file with the same name:

```json
{
  "id": "FEAT001",
  "title": "User authentication",
  "category": "Auth",
  "moscow": "MUST",
  "priority": 1,
  "status": "Planned",
  "release": "v1.0",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "tags": ["admin", "api"],
  "okrLink": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Auto-generated (`FEAT001`, `FEAT002`, ...) |
| `title` | `string` | Feature name |
| `category` | `string` | Product domain |
| `moscow` | `enum` | `MUST`, `SHOULD`, `COULD`, `WONT` |
| `priority` | `int \| null` | Numeric priority (lower = higher) |
| `status` | `enum` | `Planned`, `In Progress`, `Done`, `Rejected` |
| `release` | `string \| null` | Target release (e.g. `v1.0`) |
| `tags` | `string[]` | Labels for cross-cutting concerns |
| `okrLink` | `string \| null` | Optional link to an OKR |

Validated by JSON Schema (`schema/feature.schema.json`) on every read and write.

## Feature documentation

Each feature gets a Markdown template on creation with sections for:

- Summary, Problem Statement
- User Stories with acceptance criteria
- Workflow diagrams
- Edge Cases table
- Success Metrics, Out of Scope
- Architecture Notes, Implementation file map
- Testing Notes, Open Questions

The template is created once on `add` and never overwritten.

## Auto-generated files

| File | Trigger | Purpose |
|------|---------|---------|
| `_manifest.json` | Every `add`/`update` | Machine-readable index of all features |
| `features.html` | Every `add`/`update` | Standalone HTML viewer |
| `*.md` (per feature) | On `add` (once) | Rich documentation template |

## Requirements

- Node.js 18+
- TypeScript 5+ (for type checking, not required at runtime with ts-node)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) -- Copyright (c) 2026 [Farzin](https://github.com/zebercut)
