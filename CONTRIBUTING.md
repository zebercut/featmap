# Contributing to featmap

Thanks for your interest in contributing.

## Development setup

```bash
git clone https://github.com/zebercut/featmap.git
cd featmap
npm install
```

## Type checking

```bash
npm run typecheck
```

## Testing changes

Create a test features directory and run commands against it:

```bash
mkdir -p /tmp/test-features
npx ts-node src/cli.ts add --dir=/tmp/test-features --title="Test" --category="Test" --moscow=MUST
npx ts-node src/cli.ts list --dir=/tmp/test-features
npx ts-node src/cli.ts serve --dir=/tmp/test-features
```

## Pull requests

1. Fork the repo and create your branch from `main`
2. Run `npm run typecheck` and make sure it passes
3. Keep PRs focused — one feature or fix per PR
4. Update the README if you add new CLI commands or API functions
5. Add a CHANGELOG entry under `## Unreleased`

## Code style

- TypeScript strict mode
- No external dependencies beyond `ajv` / `ajv-formats` for the core
- The HTML viewer is a single self-contained file (no external CSS/JS)
- Atomic file writes (temp + rename) for all mutations
- JSON Schema validation on every read and write

## Reporting issues

Open an issue on GitHub. Include:

- What you expected
- What happened
- Steps to reproduce
- Node.js version and OS
