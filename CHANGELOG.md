# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-03

### Added

- File-per-feature backlog system with `FEAT001_slug/` directory convention
- CLI commands: `list`, `show`, `add`, `update`, `regen`, `html`, `serve`, `stats`, `help`
- JSON Schema validation (ajv) on every read and write
- Auto-generated `_manifest.json` index on every mutation
- Auto-generated `features.html` standalone viewer
- Rich Markdown template per feature (created on `add`, never overwritten)
- Live server with SSE, inline editing, combobox dropdowns, doc panel
- Dark/light theme toggle (persisted to localStorage)
- Pagination with configurable page size
- Sortable columns with sticky headers
- Grouping by status, category, MoSCoW, release, tag
- Filtering by status, MoSCoW, category, release, tag
- Full-text search across ID, title, and tags
- Auto-port: if default port is busy, tries next available (up to 10)
- TypeScript API: load, filter, sort, write, update, validate
- Atomic file writes (temp + rename)
- Server-side Markdown rendering for feature docs
- XSS protection: HTML escaping, JSON injection prevention
