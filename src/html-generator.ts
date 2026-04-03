import * as fs from "fs";
import { loadAllFeatures } from "./loader";
import { Feature } from "./types";

export interface HtmlOptions {
  live?: boolean;   // Enable SSE + inline editing (server mode)
}

export function generateHtml(featuresDir: string, outPath: string): void {
  const features = loadAllFeatures(featuresDir);
  const html = buildHtmlFromFeatures(features, { live: false });
  fs.writeFileSync(outPath, html, "utf-8");
}

export function buildHtmlFromFeatures(features: Feature[], opts: HtmlOptions = {}): string {
  const json = JSON.stringify(features);
  const live = opts.live ?? false;
  return buildHtml(json, live);
}

function buildHtml(json: string, live: boolean): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>featmap</title>
<style>
  [data-theme="dark"] {
    --bg: #0d1117; --bg2: #161b22; --bg3: #21262d;
    --border: #30363d; --text: #e6edf3; --text2: #8b949e; --text3: #6e7681;
    --accent: #58a6ff; --green: #3fb950; --yellow: #d29922; --red: #f85149; --blue: #58a6ff; --gray: #6e7681;
  }
  [data-theme="light"] {
    --bg: #ffffff; --bg2: #f6f8fa; --bg3: #e1e4e8;
    --border: #d0d7de; --text: #1f2328; --text2: #656d76; --text3: #8b949e;
    --accent: #0969da; --green: #1a7f37; --yellow: #9a6700; --red: #cf222e; --blue: #0969da; --gray: #6e7681;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); padding: 24px; transition: background 0.2s, color 0.2s; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
  h1 .live { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #3fb95022; color: var(--green); font-weight: 500; }

  .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .search { background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 6px; font-size: 14px; width: 260px; }
  .search:focus { outline: none; border-color: var(--accent); }
  select { background: var(--bg2); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-size: 13px; cursor: pointer; }
  select:focus { outline: none; border-color: var(--accent); }

  .stats { display: flex; gap: 16px; margin-bottom: 16px; font-size: 13px; color: var(--text2); }
  .stats span { background: var(--bg2); padding: 4px 10px; border-radius: 4px; }

  .group-header { font-size: 14px; font-weight: 600; color: var(--text2); padding: 12px 0 6px; border-bottom: 1px solid var(--border); margin-top: 12px; display: flex; align-items: center; gap: 8px; }
  .group-header .count { font-weight: 400; color: var(--text3); font-size: 12px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; color: var(--text2); font-weight: 600; border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; white-space: nowrap; }
  th:hover { color: var(--accent); }
  th.sorted { color: var(--accent); }
  th.sorted::after { content: ' \\25B2'; font-size: 10px; }
  th.sorted.desc::after { content: ' \\25BC'; }
  td { padding: 8px 12px; border-bottom: 1px solid var(--bg3); vertical-align: top; }
  tr:hover td { background: var(--bg2); }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-planned { background: #58a6ff22; color: var(--blue); }
  .badge-inprogress { background: #d2992222; color: var(--yellow); }
  .badge-done { background: #3fb95022; color: var(--green); }
  .badge-rejected { background: #f8514922; color: var(--red); }

  .moscow-must { color: var(--red); font-weight: 700; }
  .moscow-should { color: var(--yellow); font-weight: 600; }
  .moscow-could { color: var(--blue); }
  .moscow-wont { color: var(--gray); }

  .tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; background: var(--bg3); color: var(--text2); margin: 1px 2px; }
  .release-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #8b5cf622; color: #a78bfa; }

  .id-col { font-family: monospace; color: var(--text3); white-space: nowrap; }
  .title-col { font-weight: 500; }
  .title-link { color: var(--accent); cursor: pointer; text-decoration: none; }
  .title-link:hover { text-decoration: underline; }
  .empty { text-align: center; padding: 40px; color: var(--text3); }

  /* Theme toggle */
  .theme-toggle { background: var(--bg2); border: 1px solid var(--border); color: var(--text2); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-left: auto; }
  .theme-toggle:hover { border-color: var(--accent); color: var(--text); }

  /* Doc panel */
  .doc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 500; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
  .doc-overlay.open { opacity: 1; pointer-events: auto; }
  .doc-panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(720px, 85vw); background: var(--bg); border-left: 1px solid var(--border); z-index: 600; transform: translateX(100%); transition: transform 0.25s ease; overflow-y: auto; padding: 32px; }
  .doc-panel.open { transform: translateX(0); }
  .doc-close { position: sticky; top: 0; float: right; background: var(--bg2); border: 1px solid var(--border); color: var(--text2); width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; z-index: 1; }
  .doc-close:hover { border-color: var(--accent); color: var(--text); }
  .doc-loading { color: var(--text3); padding: 40px; text-align: center; }

  /* Rendered markdown */
  .md h1 { font-size: 22px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .md h2 { font-size: 18px; font-weight: 600; margin: 20px 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
  .md h3 { font-size: 15px; font-weight: 600; margin: 16px 0 6px; }
  .md p { margin: 8px 0; line-height: 1.6; }
  .md ul, .md ol { margin: 8px 0 8px 24px; line-height: 1.6; }
  .md li { margin: 4px 0; }
  .md code { background: var(--bg3); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'SFMono-Regular', Consolas, monospace; }
  .md pre { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 16px; overflow-x: auto; margin: 12px 0; }
  .md pre code { background: none; padding: 0; }
  .md blockquote { border-left: 3px solid var(--accent); padding-left: 16px; color: var(--text2); margin: 12px 0; }
  .md hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  .md table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  .md th, .md td { padding: 8px 12px; border: 1px solid var(--border); text-align: left; }
  .md th { background: var(--bg2); font-weight: 600; }
  .md strong { font-weight: 600; }
  .md em { font-style: italic; color: var(--text2); }
  .md a { color: var(--accent); text-decoration: none; }
  .md a:hover { text-decoration: underline; }
  .md input[type="checkbox"] { margin-right: 6px; }

  /* Editable cells (live mode only) */
  .editable { cursor: pointer; position: relative; }
  .editable:hover { outline: 1px dashed var(--border); outline-offset: 2px; border-radius: 3px; }
  .edit-input { background: var(--bg2); border: 1px solid var(--accent); color: var(--text); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: inherit; width: 100%; }
  .edit-select { background: var(--bg2); border: 1px solid var(--accent); color: var(--text); padding: 4px 6px; border-radius: 4px; font-size: 12px; }

  /* Toast */
  .toast { position: fixed; bottom: 20px; right: 20px; padding: 10px 16px; border-radius: 8px; font-size: 13px; z-index: 1000; transition: opacity 0.3s; }
  .toast-ok { background: #3fb95033; color: var(--green); border: 1px solid #3fb95044; }
  .toast-err { background: #f8514933; color: var(--red); border: 1px solid #f8514944; }
</style>
</head>
<body>
<h1>featmap${live ? ' <span class="live">live</span>' : ''} <button class="theme-toggle" id="themeToggle" title="Toggle theme">☀️</button></h1>

<div class="toolbar">
  <input class="search" id="search" type="text" placeholder="Search features...">
  <select id="filterStatus"><option value="">All statuses</option></select>
  <select id="filterMoscow"><option value="">All MoSCoW</option></select>
  <select id="filterCategory"><option value="">All categories</option></select>
  <select id="filterRelease"><option value="">All releases</option></select>
  <select id="filterTag"><option value="">All tags</option></select>
  <select id="groupBy">
    <option value="">No grouping</option>
    <option value="status">Group by Status</option>
    <option value="category">Group by Category</option>
    <option value="moscow">Group by MoSCoW</option>
    <option value="release">Group by Release</option>
    <option value="tags">Group by Tag</option>
  </select>
</div>

<div class="stats" id="stats"></div>
<div id="content"></div>
<div id="toasts"></div>
<div class="doc-overlay" id="docOverlay"></div>
<div class="doc-panel" id="docPanel">
  <button class="doc-close" id="docClose">&times;</button>
  <div class="md" id="docContent"></div>
</div>

<script>
let DATA = ` + json + `;
const LIVE = ${live};
const statusClass = s => 'badge-' + s.toLowerCase().replace(/\\s+/g, '');
const moscowClass = m => 'moscow-' + m.toLowerCase();
let sortField = 'id', sortDir = 'asc';

// --- Theme toggle ---
const themeBtn = document.getElementById('themeToggle');
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('featmap-theme', t); } catch {}
}
themeBtn.addEventListener('click', () => {
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});
try { const saved = localStorage.getItem('featmap-theme'); if (saved) setTheme(saved); } catch {}

// --- Doc panel ---
const docOverlay = document.getElementById('docOverlay');
const docPanel = document.getElementById('docPanel');
const docContent = document.getElementById('docContent');
const docClose = document.getElementById('docClose');

function openDoc(featureId) {
  if (!LIVE) return;
  docContent.innerHTML = '<div class="doc-loading">Loading...</div>';
  docOverlay.classList.add('open');
  docPanel.classList.add('open');
  fetch('/api/features/' + featureId + '/doc')
    .then(r => { if (!r.ok) throw new Error('Not found'); return r.text(); })
    .then(html => { docContent.innerHTML = html; })
    .catch(() => { docContent.innerHTML = '<div class="doc-loading">No documentation found for ' + esc(featureId) + '</div>'; });
}

function closeDoc() {
  docOverlay.classList.remove('open');
  docPanel.classList.remove('open');
}

docClose.addEventListener('click', closeDoc);
docOverlay.addEventListener('click', closeDoc);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDoc(); });

const STATUSES = ['Planned', 'In Progress', 'Done', 'Rejected'];
const MOSCOWS = ['MUST', 'SHOULD', 'COULD', 'WONT'];

// --- SSE: auto-refresh on file changes (live mode only) ---
if (LIVE) {
  const evtSource = new EventSource('/api/events');
  evtSource.onmessage = async (e) => {
    if (e.data === 'refresh') {
      try {
        const res = await fetch('/api/features');
        DATA = await res.json();
        populateFilters();
        render();
      } catch { /* ignore fetch errors during refresh */ }
    }
  };
}

// --- Toast ---
function toast(msg, ok) {
  const el = document.createElement('div');
  el.className = 'toast ' + (ok ? 'toast-ok' : 'toast-err');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
}

// --- API update (live mode only) ---
async function apiUpdate(id, updates) {
  if (!LIVE) return;
  try {
    const res = await fetch('/api/features/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    toast(id + ' updated', true);
  } catch (e) {
    toast('Error: ' + e.message, false);
  }
}

// --- Inline editing ---
function makeEditable(td, featureId, field, currentValue, type) {
  if (!LIVE) return;
  td.classList.add('editable');
  td.addEventListener('click', function handler(e) {
    if (td.querySelector('input,select')) return;
    e.stopPropagation();

    if (type === 'select-status') {
      const sel = document.createElement('select');
      sel.className = 'edit-select';
      STATUSES.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; if (s === currentValue) o.selected = true; sel.appendChild(o); });
      td.innerHTML = '';
      td.appendChild(sel);
      sel.focus();
      sel.addEventListener('change', () => { apiUpdate(featureId, { [field]: sel.value }); });
      sel.addEventListener('blur', () => { render(); });
    } else if (type === 'select-moscow') {
      const sel = document.createElement('select');
      sel.className = 'edit-select';
      MOSCOWS.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if (m === currentValue) o.selected = true; sel.appendChild(o); });
      td.innerHTML = '';
      td.appendChild(sel);
      sel.focus();
      sel.addEventListener('change', () => { apiUpdate(featureId, { [field]: sel.value }); });
      sel.addEventListener('blur', () => { render(); });
    } else if (type === 'tags') {
      const input = document.createElement('input');
      input.className = 'edit-input';
      input.value = (currentValue || []).join(', ');
      input.placeholder = 'tag1, tag2, ...';
      td.innerHTML = '';
      td.appendChild(input);
      input.focus();
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          const tags = input.value.split(',').map(t => t.trim()).filter(Boolean);
          apiUpdate(featureId, { tags });
        }
        if (ev.key === 'Escape') render();
      });
      input.addEventListener('blur', () => { render(); });
    } else {
      const input = document.createElement('input');
      input.className = 'edit-input';
      input.value = currentValue ?? '';
      td.innerHTML = '';
      td.appendChild(input);
      input.focus();
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { apiUpdate(featureId, { [field]: input.value || null }); }
        if (ev.key === 'Escape') render();
      });
      input.addEventListener('blur', () => { render(); });
    }
  });
}

function populateFilters() {
  const ids = ['filterStatus','filterMoscow','filterCategory','filterRelease','filterTag'];
  const saved = {};
  ids.forEach(id => { saved[id] = document.getElementById(id).value; });
  ids.forEach(id => {
    const sel = document.getElementById(id);
    while (sel.options.length > 1) sel.remove(1);
  });
  const statuses = [...new Set(DATA.map(f => f.status))].sort();
  const moscows = [...new Set(DATA.map(f => f.moscow))];
  const categories = [...new Set(DATA.map(f => f.category))].sort();
  const releases = [...new Set(DATA.map(f => f.release).filter(Boolean))].sort();
  const tags = [...new Set(DATA.flatMap(f => f.tags))].sort();

  statuses.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; document.getElementById('filterStatus').appendChild(o); });
  moscows.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; document.getElementById('filterMoscow').appendChild(o); });
  categories.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; document.getElementById('filterCategory').appendChild(o); });
  releases.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; document.getElementById('filterRelease').appendChild(o); });
  tags.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; document.getElementById('filterTag').appendChild(o); });

  ids.forEach(id => { document.getElementById(id).value = saved[id]; });
}

function getFiltered() {
  const q = document.getElementById('search').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const moscow = document.getElementById('filterMoscow').value;
  const category = document.getElementById('filterCategory').value;
  const release = document.getElementById('filterRelease').value;
  const tag = document.getElementById('filterTag').value;

  return DATA.filter(f => {
    if (q && !f.id.toLowerCase().includes(q) && !f.title.toLowerCase().includes(q) && !f.tags.some(t => t.toLowerCase().includes(q))) return false;
    if (status && f.status !== status) return false;
    if (moscow && f.moscow !== moscow) return false;
    if (category && f.category !== category) return false;
    if (release && f.release !== release) return false;
    if (tag && !f.tags.includes(tag)) return false;
    return true;
  });
}

function sortData(features) {
  return [...features].sort((a, b) => {
    let va, vb;
    switch (sortField) {
      case 'priority': va = a.priority ?? 999; vb = b.priority ?? 999; break;
      case 'release': va = a.release ?? ''; vb = b.release ?? ''; break;
      default: va = a[sortField] ?? ''; vb = b[sortField] ?? '';
    }
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function renderTable(features) {
  const headers = [
    { key: 'id', label: '#' },
    { key: 'title', label: 'Feature' },
    { key: 'category', label: 'Category' },
    { key: 'moscow', label: 'MoSCoW' },
    { key: 'priority', label: 'Prio' },
    { key: 'status', label: 'Status' },
    { key: 'release', label: 'Release' },
    { key: 'tags', label: 'Tags' },
  ];

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.label;
    th.dataset.sort = h.key;
    if (sortField === h.key) { th.classList.add('sorted'); if (sortDir === 'desc') th.classList.add('desc'); }
    th.addEventListener('click', () => {
      if (h.key === 'tags') return;
      if (sortField === h.key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
      else { sortField = h.key; sortDir = 'asc'; }
      render();
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (features.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'empty';
    td.textContent = 'No features match';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    features.forEach(f => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.className = 'id-col';
      tdId.textContent = f.id;
      tr.appendChild(tdId);

      const tdTitle = document.createElement('td');
      tdTitle.className = 'title-col';
      if (LIVE) {
        const link = document.createElement('a');
        link.className = 'title-link';
        link.textContent = f.title;
        link.href = '#';
        link.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDoc(f.id); });
        tdTitle.appendChild(link);
      } else {
        tdTitle.textContent = f.title;
      }
      makeEditable(tdTitle, f.id, 'title', f.title, 'text');
      tr.appendChild(tdTitle);

      const tdCat = document.createElement('td');
      tdCat.textContent = f.category;
      makeEditable(tdCat, f.id, 'category', f.category, 'text');
      tr.appendChild(tdCat);

      const tdMoscow = document.createElement('td');
      const moscowSpan = document.createElement('span');
      moscowSpan.className = moscowClass(f.moscow);
      moscowSpan.textContent = f.moscow;
      tdMoscow.appendChild(moscowSpan);
      makeEditable(tdMoscow, f.id, 'moscow', f.moscow, 'select-moscow');
      tr.appendChild(tdMoscow);

      const tdPrio = document.createElement('td');
      tdPrio.textContent = f.priority !== null ? String(f.priority) : '\\u2014';
      makeEditable(tdPrio, f.id, 'priority', f.priority, 'text');
      tr.appendChild(tdPrio);

      const tdStatus = document.createElement('td');
      const statusSpan = document.createElement('span');
      statusSpan.className = 'badge ' + statusClass(f.status);
      statusSpan.textContent = f.status;
      tdStatus.appendChild(statusSpan);
      makeEditable(tdStatus, f.id, 'status', f.status, 'select-status');
      tr.appendChild(tdStatus);

      const tdRel = document.createElement('td');
      if (f.release) {
        const relSpan = document.createElement('span');
        relSpan.className = 'release-badge';
        relSpan.textContent = f.release;
        tdRel.appendChild(relSpan);
      } else {
        tdRel.textContent = '\\u2014';
      }
      makeEditable(tdRel, f.id, 'release', f.release, 'text');
      tr.appendChild(tdRel);

      const tdTags = document.createElement('td');
      if (f.tags.length > 0) {
        f.tags.forEach(t => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = t;
          tdTags.appendChild(span);
        });
      } else {
        tdTags.textContent = '\\u2014';
      }
      makeEditable(tdTags, f.id, 'tags', f.tags, 'tags');
      tr.appendChild(tdTags);

      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  return table;
}

function render() {
  const filtered = getFiltered();
  const sorted = sortData(filtered);
  const groupByVal = document.getElementById('groupBy').value;
  const content = document.getElementById('content');

  const done = filtered.filter(f => f.status === 'Done').length;
  const inProg = filtered.filter(f => f.status === 'In Progress').length;
  const planned = filtered.filter(f => f.status === 'Planned').length;
  document.getElementById('stats').innerHTML =
    '<span>' + filtered.length + ' features</span>' +
    '<span>Done: ' + done + '</span>' +
    '<span>In Progress: ' + inProg + '</span>' +
    '<span>Planned: ' + planned + '</span>';

  content.innerHTML = '';

  if (!groupByVal) {
    content.appendChild(renderTable(sorted));
  } else {
    const groups = {};
    for (const f of sorted) {
      let keys;
      if (groupByVal === 'tags') {
        keys = f.tags.length > 0 ? f.tags : ['(untagged)'];
      } else {
        keys = [f[groupByVal] ?? '(none)'];
      }
      for (const k of keys) {
        if (!groups[k]) groups[k] = [];
        groups[k].push(f);
      }
    }
    Object.keys(groups).sort().forEach(k => {
      const header = document.createElement('div');
      header.className = 'group-header';
      header.innerHTML = esc(k) + ' <span class="count">(' + groups[k].length + ')</span>';
      content.appendChild(header);
      content.appendChild(renderTable(groups[k]));
    });
  }
}

populateFilters();
render();

document.getElementById('search').addEventListener('input', render);
document.querySelectorAll('select').forEach(s => s.addEventListener('change', render));
` + "<" + "/script>" + `
</body>
</html>`;
}
