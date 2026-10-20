// Bottom row of todo post-its: every unchecked AnyList item, in random order, coloured by its list.
// Fed by todos.json (written by relay/anylist-sync.js).
window.Todos = (function () {
  const CACHE_KEY = 'todos_cache';
  const GAP = 8;
  let items = [];   // [{ name, list }]

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

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Notes that fit legibly at once; the full shuffled deck is paged through so every item appears
  const PAGE_MS = 30 * 1000;
  const MIN_W = 120, MAX_W = 190, MAX_ROWS = 3;
  let deck = [], pos = 0;

  function render(advance) {
    const row = document.getElementById('todo-row');
    if (!row) return;
    row.innerHTML = '';
    row.style.display = items.length ? '' : 'none';
    if (!items.length) return;

    // One distinct hue per list, evenly spaced (stable: lists sorted by name)
    const lists = Array.from(new Set(items.map(i => i.list))).sort();
    const hueOf = {};
    lists.forEach((l, idx) => { hueOf[l] = Math.round((idx * 360 / lists.length + 40) % 360); });

    // Layout: biggest notes that fit, up to MAX_ROWS rows of at least MIN_W wide
    const W = row.clientWidth - 16, H = row.clientHeight;
    const rows = Math.min(MAX_ROWS, Math.max(1, Math.ceil(items.length / Math.floor(W / (MAX_W + GAP)))));
    const perRow = Math.max(1, Math.floor(W / (MIN_W + GAP)));
    const noteH = Math.min(MAX_W * 0.75, (H - GAP * rows) / rows);
    const perPage = Math.min(items.length, rows * perRow);
    const noteW = Math.min(MAX_W, (W - GAP * Math.ceil(perPage / rows)) / Math.ceil(perPage / rows));
    const font = Math.max(11, Math.min(18, noteH * 0.26));

    // Rebuild the shuffled deck when items change or it runs out
    if (deck.length !== items.length) {
      deck = shuffle(items.slice()); pos = 0;
    } else if (advance) {
      pos += perPage;
      if (pos >= deck.length) { deck = shuffle(items.slice()); pos = 0; }
    }

    deck.slice(pos, pos + perPage).forEach(it => {
      const hue = hueOf[it.list];
      const el = document.createElement('div');
      el.className = 'todo-note';
      el.textContent = it.name;
      el.title = it.list;
      el.style.width = noteW + 'px';
      el.style.height = noteH + 'px';
      el.style.fontSize = font + 'px';
      el.style.background = 'linear-gradient(' + (150 + Math.random() * 60) + 'deg, hsl(' + hue + ',70%,78%), hsl(' + hue + ',68%,66%))';
      el.style.transform = 'translateY(' + (Math.random() * 8 - 4) + 'px) rotate(' + (Math.random() * 7 - 3.5) + 'deg)';
      row.appendChild(el);
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
