# featmap

File-per-feature backlog management. Types, CRUD, validation, manifest generation, HTML viewer, live server, and CLI.

Each feature is a folder (e.g. `FEAT001_user_authentication/`) containing a JSON metadata file and a Markdown doc. A `_manifest.json` index and `features.html` viewer are auto-regenerated on every mutation.

## Add to a project

### 1. Add as a git submodule

```bash
git submodule add https://github.com/zebercut/featmap.git packages/featmap
cd packages/featmap && npm install
```

### 2. Create a features directory

```bash
mkdir -p features
```

This is where your feature data lives (inside your project, not inside featmap).

### 3. Set the features path

Pick one:

**Option A — Environment variable:**
```bash
export FEATMAP_DIR=./features
```

**Option B — Pass `--dir` on every command:**
```bash
npx ts-node packages/featmap/src/cli.ts list --dir=./features
```

**Option C — Create a wrapper script** (recommended):

Create an npm script that auto-injects `--dir`:
```json
{
  "scripts": {
    "feat": "ts-node packages/featmap/src/cli.ts --dir=./features"
  }
}
```
Then: `npm run feat -- list`, `npm run feat -- add --title="..." --category="..." --moscow=MUST`

### 4. Start using it

```bash
# Add your first feature
npx ts-node packages/featmap/src/cli.ts add --dir=./features \
  --title="User authentication" --category="Auth" --moscow=MUST --priority=1

# This creates:
#   features/FEAT001_user_authentication/
#     FEAT001_user_authentication.json   — structured metadata
#     FEAT001_user_authentication.md     — rich documentation template
#   features/_manifest.json              — auto-generated index
#   features.html                        — auto-generated HTML viewer
```

### 5. Add to .gitignore (optional)

```gitignore
# Generated files (regenerated on every mutation)
features.html
```

The HTML viewer is auto-generated, so you may not want to track it in git. The `_manifest.json` is also generated but is useful to commit for quick lookups without running code.

## CLI

```bash
# List all features
featmap list [--status=X] [--category=X] [--moscow=X] [--release=X] [--sort=X]

# Show feature detail
featmap show FEAT001

# Add a feature
featmap add --title="..." --category="..." --moscow=MUST [--priority=N] [--release=v1.0] [--tags=admin,api]

# Update a feature
featmap update FEAT001 --status="In Progress" [--priority=N] [--moscow=X] [--release=v1.0] [--tags=admin,api]

# Regenerate manifest + HTML
featmap regen

# Generate HTML viewer manually
featmap html [--out=path]

# Start live server with inline editing
featmap serve [--port=3456]

# Summary stats
featmap stats
```

Replace `featmap` with `npx ts-node packages/featmap/src/cli.ts --dir=./features` or your wrapper script.

## Live server

```bash
featmap serve --port=3456
```

Starts an HTTP server with:

- The HTML viewer with inline editing enabled
- SSE (Server-Sent Events) for real-time updates across browser tabs
- REST API: `GET /api/features`, `POST /api/features/:id`
- File watchers — edits to JSON files on disk are pushed to the browser automatically

## API

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
  buildHtmlFromFeatures,
  startServer,
} from "./packages/featmap/src/index";

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
| `category` | `string` | Product domain (e.g. Auth, Tasks, Platform) |
| `moscow` | `enum` | `MUST`, `SHOULD`, `COULD`, `WONT` |
| `priority` | `int \| null` | Numeric priority (lower = higher) |
| `status` | `enum` | `Planned`, `In Progress`, `Done`, `Rejected` |
| `release` | `string \| null` | Target release (e.g. `v1.0`, `v2.0`) |
| `tags` | `string[]` | Labels for cross-cutting concerns (e.g. `admin`, `api`, `frontend`) |
| `okrLink` | `string \| null` | Optional link to an OKR |

## Feature README

Each feature gets a rich Markdown template on creation with sections for:

- Summary, Problem Statement
- User Stories with acceptance criteria
- Workflow diagrams
- Edge Cases table
- Success Metrics, Out of Scope
- Architecture Notes, Implementation file map
- Testing Notes, Open Questions

The template is created once on `add` and never overwritten — it's yours to edit.

## HTML viewer

Auto-generated `features.html` with:

- Full-text search (ID, title, tags)
- Filter by: status, MoSCoW, category, release, tag
- Sort by clicking column headers
- Group by: status, category, MoSCoW, release, tag
- Dark theme, standalone (no external dependencies)

In live server mode (`featmap serve`), cells become editable inline with toast feedback.

## Auto-generated files

| File | Trigger | Purpose |
|------|---------|---------|
| `_manifest.json` | Every `add`/`update` | Machine-readable index of all features |
| `features.html` | Every `add`/`update` | Human-readable HTML viewer |
| `*.md` (per feature) | On `add` (once) | Rich documentation template |

## Directory structure

```
features/
  _manifest.json
  FEAT001_user_authentication/
    FEAT001_user_authentication.json
    FEAT001_user_authentication.md
  FEAT002_task_dashboard/
    FEAT002_task_dashboard.json
    FEAT002_task_dashboard.md
```

## License

MIT
