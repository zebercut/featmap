import * as fs from "fs";
import { loadAllFeatures } from "./loader";

export function generateHtml(featuresDir: string, outPath: string): void {
  const features = loadAllFeatures(featuresDir);
  const json = JSON.stringify(features, null, 2);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>featmap</title>
<style>
  :root {
    --bg: #0d1117; --bg2: #161b22; --bg3: #21262d;
    --border: #30363d; --text: #e6edf3; --text2: #8b949e; --text3: #6e7681;
    --accent: #58a6ff; --green: #3fb950; --yellow: #d29922; --red: #f85149; --blue: #58a6ff; --gray: #6e7681;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); padding: 24px; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 16px; }

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
  .empty { text-align: center; padding: 40px; color: var(--text3); }
</style>
</head>
<body>
<h1>featmap</h1>

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

<script>
const DATA = ` + json + `;

const statusClass = s => 'badge-' + s.toLowerCase().replace(/\\s+/g, '');
const moscowClass = m => 'moscow-' + m.toLowerCase();

let sortField = 'id', sortDir = 'asc';

function populateFilters() {
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

function renderRow(f) {
  const prio = f.priority !== null ? f.priority : '\\u2014';
  const rel = f.release ? '<span class="release-badge">' + esc(f.release) + '</span>' : '\\u2014';
  const tags = f.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('');
  return '<tr>'
    + '<td class="id-col">' + esc(f.id) + '</td>'
    + '<td class="title-col">' + esc(f.title) + '</td>'
    + '<td>' + esc(f.category) + '</td>'
    + '<td><span class="' + moscowClass(f.moscow) + '">' + esc(f.moscow) + '</span></td>'
    + '<td>' + prio + '</td>'
    + '<td><span class="badge ' + statusClass(f.status) + '">' + esc(f.status) + '</span></td>'
    + '<td>' + rel + '</td>'
    + '<td>' + (tags || '\\u2014') + '</td>'
    + '</tr>';
}

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

  const ths = headers.map(h => {
    const cls = sortField === h.key ? (sortDir === 'desc' ? 'sorted desc' : 'sorted') : '';
    return '<th class="' + cls + '" data-sort="' + h.key + '">' + h.label + '</th>';
  }).join('');

  const rows = features.map(renderRow).join('');
  return '<table><thead><tr>' + ths + '</tr></thead><tbody>' + (rows || '<tr><td colspan="8" class="empty">No features match</td></tr>') + '</tbody></table>';
}

function render() {
  const filtered = getFiltered();
  const sorted = sortData(filtered);
  const groupBy = document.getElementById('groupBy').value;
  const content = document.getElementById('content');

  const done = filtered.filter(f => f.status === 'Done').length;
  const inProg = filtered.filter(f => f.status === 'In Progress').length;
  const planned = filtered.filter(f => f.status === 'Planned').length;
  document.getElementById('stats').innerHTML =
    '<span>' + filtered.length + ' features</span>' +
    '<span>Done: ' + done + '</span>' +
    '<span>In Progress: ' + inProg + '</span>' +
    '<span>Planned: ' + planned + '</span>';

  if (!groupBy) {
    content.innerHTML = renderTable(sorted);
  } else {
    const groups = {};
    for (const f of sorted) {
      let keys;
      if (groupBy === 'tags') {
        keys = f.tags.length > 0 ? f.tags : ['(untagged)'];
      } else {
        keys = [f[groupBy] ?? '(none)'];
      }
      for (const k of keys) {
        if (!groups[k]) groups[k] = [];
        groups[k].push(f);
      }
    }
    const sortedKeys = Object.keys(groups).sort();
    content.innerHTML = sortedKeys.map(k =>
      '<div class="group-header">' + esc(k) + ' <span class="count">(' + groups[k].length + ')</span></div>' + renderTable(groups[k])
    ).join('');
  }

  content.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (field === 'tags') return;
      if (sortField === field) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
      else { sortField = field; sortDir = 'asc'; }
      render();
    });
  });
}

populateFilters();
render();

document.getElementById('search').addEventListener('input', render);
document.querySelectorAll('select').forEach(s => s.addEventListener('change', render));
<\/script>
</body>
</html>`;

  fs.writeFileSync(outPath, html, "utf-8");
}
