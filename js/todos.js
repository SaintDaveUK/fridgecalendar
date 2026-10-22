// Bottom row of todo post-its: every unchecked AnyList item, in a stable order, coloured and decorated by a hash of its text.
// Fed by todos.json (written by relay/anylist-sync.js).
window.Todos = (function () {
  const CACHE_KEY = 'todos_cache';
  const GAP = 8;
  // Endpoint that resolves an item in AnyList (see relay/worker.js). Empty = tapping a note does nothing.
  const RESOLVE_URL = 'https://fridge-resolve.bananabork.workers.dev';
  const RESOLVED_KEY = 'todos_resolved';
  const RESOLVED_MS = 15 * 60 * 1000;   // hide a resolved item until the next syncs catch up
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
      items = (data.items || []).filter(i => i && i.name && !isResolved(i));
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
    let h = 2166136261;
    for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
    return h >>> 0;
  }
  function readResolved() {
    try { return JSON.parse(localStorage.getItem(RESOLVED_KEY) || '{}'); } catch (e) { return {}; }
  }
  function isResolved(i) {
    const t = readResolved()[keyOf(i)];
    return !!t && Date.now() - t < RESOLVED_MS;
  }
  function markResolved(i) {
    const r = readResolved();
    r[keyOf(i)] = Date.now();
    try { localStorage.setItem(RESOLVED_KEY, JSON.stringify(r)); } catch (e) {}
  }
  function isNew(i) { return i.added && Date.now() - Date.parse(i.added) < NEW_MS; }

  // Stable order: newest first, then by list and name, so a refresh never reshuffles the notes
  function ordered() {
    return items.slice().sort((a, b) =>
      (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0) ||
      (a.list < b.list ? -1 : a.list > b.list ? 1 : 0) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  // Each note gets the largest font that fits its own text with whole words (no mid-word breaks), capped so
  // short items don't dwarf the rest. Measured with offsetWidth/offsetHeight of an inner span rather than
  // scrollWidth/clientWidth, which are unreliable on the fridge's older browser.
  function fitAll(notes, side) {
    const avail = side - 14;   // note padding + rotation slack
    const cap = Math.floor(side * 0.32);
    notes.forEach(el => {
      const inner = el.firstChild;
      const text = inner.textContent;
      inner.style.width = avail + 'px';

      // The longest word must fit on one line: measure it once at 100px, font scales linearly
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font-size:100px;';
      const longest = text.split(/\s+/).reduce((m, w) => (w.length > m.length ? w : m), '');
      probe.textContent = longest;
      el.appendChild(probe);
      const w100 = probe.offsetWidth;
      el.removeChild(probe);
      const byWord = w100 > 0 ? Math.floor(avail / w100 * 100) : cap;

      let lo = 8, hi = Math.max(lo, Math.min(cap, byWord));
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        inner.style.fontSize = mid + 'px';
        if (inner.offsetHeight <= avail) lo = mid; else hi = mid - 1;
      }
      inner.style.fontSize = lo + 'px';
    });
  }

  const STICKERS = ['\u2B50', '\u2764\uFE0F', '\uD83C\uDF40', '\uD83C\uDF1F', '\uD83C\uDF3C', '\uD83D\uDD25', '\uD83C\uDF08', '\uD83D\uDC1E', '\uD83C\uDF4E', '\u26A1', '\uD83C\uDF19', '\uD83C\uDF88'];
  const DECOS = ['pin', 'tape', 'fold', 'stripe', 'dots'];

  // Confirm dialog, then ask the relay to tick the item off in AnyList
  function askResolve(it) {
    if (!RESOLVE_URL || document.getElementById('todo-dialog')) return;
    const ov = document.createElement('div');
    ov.id = 'todo-dialog';
    const box = document.createElement('div');
    box.className = 'todo-dialog-box';
    const q = document.createElement('div');
    q.className = 'todo-dialog-q';
    q.textContent = 'Do you want to resolve \u201C' + it.name + '\u201D?';
    const yes = document.createElement('button');
    yes.textContent = 'Yes';
    const no = document.createElement('button');
    no.textContent = 'No';
    const close = () => ov.remove();
    no.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    yes.addEventListener('click', function () {
      markResolved(it);
      items = items.filter(i => keyOf(i) !== keyOf(it));
      render();
      close();
      fetch(RESOLVE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ list: it.list, name: it.name }) })
        .catch(function () {});
    });
    const btns = document.createElement('div');
    btns.className = 'todo-dialog-btns';
    btns.appendChild(yes); btns.appendChild(no);
    box.appendChild(q); box.appendChild(btns);
    ov.appendChild(box);
    document.body.appendChild(ov);
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

  // Re-fit once web fonts and layout are settled (the first render can run before they are)
  function refitLater() {
    window.addEventListener('load', function () { render(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(); });
    setTimeout(function () { render(); }, 2000);
  }

  function render(advance) {
    const row = document.getElementById('todo-row');
    if (!row) return;
    ensureEye();
    row.innerHTML = '';
    applyHidden();
    if (!items.length || isHidden()) return;

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

    const notes = [];
    deck.slice(pos, pos + perPage).forEach(it => {
      const h = hash(it.name);
      const hue = h % 360;
      const el = document.createElement('div');
      el.className = 'todo-note deco-' + DECOS[(h >>> 9) % DECOS.length] + (isNew(it) ? ' todo-new' : '');
      const inner = document.createElement('span');
      inner.className = 'todo-text';
      inner.textContent = it.name;
      el.appendChild(inner);
      el.title = it.list;
      el.dataset.sticker = STICKERS[(h >>> 13) % STICKERS.length];
      el.style.width = side + 'px';
      el.style.height = side + 'px';
      el.style.background = 'linear-gradient(' + (150 + (h >>> 5) % 60) + 'deg, hsl(' + hue + ',70%,80%), hsl(' + hue + ',68%,68%))';
      el.style.transform = 'rotate(' + ((h >>> 3) % 70 / 10 - 3.5) + 'deg)';
      el.addEventListener('click', function () { askResolve(it); });
      row.appendChild(el);
      notes.push(el);
    });
    fitAll(notes, side);
  }

  function start() {
    load();
    render();
    refresh();
    refitLater();
    setInterval(refresh, 10 * 60 * 1000);
    setInterval(function () { render(true); }, PAGE_MS);   // next page of the shuffled deck
  }

  return { start: start, render: render };
})();
