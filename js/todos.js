// Bottom row of todo post-its: every unchecked AnyList item, in a stable order, coloured by its list.
// Fed by todos.json (written by relay/anylist-sync.js).
window.Todos = (function () {
  const CACHE_KEY = 'todos_cache';
  const GAP = 8;
  let items = [];   // [{ name, list, added? }]

  function load() {
    try { items = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch (e) { items = []; }
  }

  async function refresh() {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch('todos.json?ts=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      items = (data.items || []).filter(i => i && i.name);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch (e) {}
    } catch (e) { /* keep cached/previous items */ }
    render();
  }

  // Notes are square, as big as fit; the whole list is paged through in a stable order
  const PAGE_MS = 30 * 1000;
  const MAX_ROWS = 3, MIN_SIDE = 90;
  const NEW_MS = 48 * 60 * 60 * 1000;   // items added in the last 48h flash
  const HIDE_KEY = 'todos_hidden';
  let pos = 0;

  const keyOf = i => i.list + '\u0001' + i.name;
  function hash(str) {
    let h = 0;
    for (let k = 0; k < str.length; k++) h = (h * 31 + str.charCodeAt(k)) | 0;
    return Math.abs(h);
  }
  function isNew(i) { return i.added && Date.now() - Date.parse(i.added) < NEW_MS; }

  // Stable order: newest first, then by list and name, so a refresh never reshuffles the notes
  function ordered() {
    return items.slice().sort((a, b) =>
      (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0) ||
      (a.list < b.list ? -1 : a.list > b.list ? 1 : 0) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  // Largest font (px) at which the text still fits inside the square note
  function fitFont(el, side) {
    let lo = 10, hi = Math.floor(side * 0.5);
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      el.style.fontSize = mid + 'px';
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) lo = mid; else hi = mid - 1;
    }
    el.style.fontSize = lo + 'px';
  }

  function isHidden() { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } }

  function applyHidden() {
    const row = document.getElementById('todo-row');
    const btn = document.getElementById('todo-eye');
    const hidden = isHidden();
    if (row) row.style.display = hidden || !items.length ? 'none' : '';
    if (btn) { btn.textContent = hidden ? '🙈' : '👁'; btn.title = hidden ? 'Show todos' : 'Hide todos'; btn.style.opacity = hidden ? '0.35' : '0.6'; }
  }

  function ensureEye() {
    if (document.getElementById('todo-eye')) return;
    const btn = document.createElement('button');
    btn.id = 'todo-eye';
    btn.addEventListener('click', function () {
      try { localStorage.setItem(HIDE_KEY, isHidden() ? '0' : '1'); } catch (e) {}
      render();
    });
    document.body.appendChild(btn);
  }

  function render(advance) {
    const row = document.getElementById('todo-row');
    if (!row) return;
    ensureEye();
    row.innerHTML = '';
    applyHidden();
    if (!items.length || isHidden()) return;

    // One distinct hue per list, evenly spaced (stable: lists sorted by name)
    const lists = Array.from(new Set(items.map(i => i.list))).sort();
    const hueOf = {};
    lists.forEach((l, idx) => { hueOf[l] = Math.round((idx * 360 / lists.length + 40) % 360); });

    // Square notes: fewest rows that hold everything (biggest notes), else MAX_ROWS rows paged
    const W = row.clientWidth - 16, H = row.clientHeight;
    let rows = 1, side = 0, perRow = 1;
    for (rows = 1; rows <= MAX_ROWS; rows++) {
      side = Math.max(MIN_SIDE, Math.min((H - GAP * (rows - 1)) / rows, W));
      perRow = Math.max(1, Math.floor((W + GAP) / (side + GAP)));
      if (rows * perRow >= items.length) break;
    }
    rows = Math.min(rows, MAX_ROWS);
    side = Math.floor(Math.max(MIN_SIDE, Math.min((H - GAP * (rows - 1)) / rows, W)));
    const perPage = Math.min(items.length, rows * perRow);

    // Page through the stable list; wrap around (also if items were removed)
    const deck = ordered();
    if (advance) pos += perPage;
    if (pos >= deck.length) pos = 0;

    deck.slice(pos, pos + perPage).forEach(it => {
      const hue = hueOf[it.list];
      const h = hash(keyOf(it));
      const el = document.createElement('div');
      el.className = 'todo-note' + (isNew(it) ? ' todo-new' : '');
      el.textContent = it.name;
      el.title = it.list;
      el.style.width = side + 'px';
      el.style.height = side + 'px';
      el.style.background = 'linear-gradient(' + (150 + h % 60) + 'deg, hsl(' + hue + ',70%,78%), hsl(' + hue + ',68%,66%))';
      el.style.transform = 'rotate(' + ((h % 70) / 10 - 3.5) + 'deg)';
      row.appendChild(el);
      fitFont(el, side);
    });
  }

  function start() {
    load();
    render();
    refresh();
    setInterval(refresh, 10 * 60 * 1000);
    setInterval(function () { render(true); }, PAGE_MS);   // next page of the shuffled deck
  }

  return { start: start, render: render };
})();
