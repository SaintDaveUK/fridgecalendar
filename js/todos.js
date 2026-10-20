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

  function render() {
    const row = document.getElementById('todo-row');
    if (!row) return;
    row.innerHTML = '';
    row.style.display = items.length ? '' : 'none';
    if (!items.length) return;

    // One distinct hue per list, evenly spaced (stable: lists sorted by name)
    const lists = Array.from(new Set(items.map(i => i.list))).sort();
    const hueOf = {};
    lists.forEach((l, idx) => { hueOf[l] = Math.round((idx * 360 / lists.length + 40) % 360); });

    // Pick the number of rows so every note fits: widest notes that still fit all items
    const n = items.length;
    const W = row.clientWidth - 16, H = row.clientHeight;
    let best = { rows: 1, w: 0, h: 0 };
    for (let r = 1; r <= 6; r++) {
      const perRow = Math.ceil(n / r);
      const w = Math.min(190, (W - GAP * perRow) / perRow);
      const h = Math.min(w * 0.75, (H - GAP * r) / r);
      if (Math.min(w, h * 1.33) > Math.min(best.w, best.h * 1.33)) best = { rows: r, w: w, h: h };
    }
    const font = Math.max(9, Math.min(18, best.h * 0.26));

    shuffle(items.slice()).forEach(it => {
      const hue = hueOf[it.list];
      const el = document.createElement('div');
      el.className = 'todo-note';
      el.textContent = it.name;
      el.title = it.list;
      el.style.width = best.w + 'px';
      el.style.height = best.h + 'px';
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
    setInterval(render, 3 * 60 * 1000);   // fresh random order every few minutes
  }

  return { start: start, render: render };
})();
