# featmap

File-per-feature backlog management. Types, CRUD, validation, manifest generation, and CLI.

Each feature is a folder containing `feature.json` (structured metadata) and `README.md` (notes). A `_manifest.json` index is auto-regenerated on every mutation.

## Install

```bash
npm install
```

## CLI

```bash
# List all features
npx ts-node src/cli.ts list --dir=./path/to/features

# Add a feature
npx ts-node src/cli.ts add --dir=./features --title="New feature" --category="Tasks" --moscow=MUST

# Update a feature
npx ts-node src/cli.ts update --dir=./features F01 --status="In Progress"

# Show feature detail
npx ts-node src/cli.ts show --dir=./features F01

# Regenerate manifest
npx ts-node src/cli.ts regen --dir=./features

# Summary stats
npx ts-node src/cli.ts stats --dir=./features
```

Set `FEATMAP_DIR` environment variable to avoid passing `--dir` every time.

## API

```typescript
import {
  loadAllFeatures,
  writeFeature,
  updateFeature,
  filterFeatures,
  sortFeatures,
  nextFeatureId,
  generateManifest,
} from "featmap";

const features = loadAllFeatures("/path/to/features");
const planned = filterFeatures(features, { status: "Planned" });
```

## Feature Schema

Each `feature.json`:

```json
{
  "id": "F01",
  "title": "Feature title",
  "category": "Tasks",
  "moscow": "MUST",
  "priority": 1,
  "status": "Planned",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "tags": [],
  "okrLink": null
}
```

## License

MIT
