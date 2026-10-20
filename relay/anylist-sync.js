// Fetches every AnyList list and writes all unchecked items (tagged with their list) to todos.json.
// Env: ANYLIST_EMAIL, ANYLIST_PASSWORD, optional ANYLIST_LISTS (comma-separated names to include), OUT (default todos.json)
// Only item and list names are published — the file is public on GitHub Pages.
const fs = require('fs');
const AnyList = require('anylist');

(async () => {
  const { ANYLIST_EMAIL, ANYLIST_PASSWORD, ANYLIST_LISTS } = process.env;
  const out = process.env.OUT || 'todos.json';
  if (!ANYLIST_EMAIL || !ANYLIST_PASSWORD) throw new Error('Set ANYLIST_EMAIL and ANYLIST_PASSWORD');
  const only = (ANYLIST_LISTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const any = new AnyList({ email: ANYLIST_EMAIL, password: ANYLIST_PASSWORD });
  await any.login();
  const lists = await any.getLists();

  const items = [];
  lists.forEach(list => {
    if (only.length && !only.includes(list.name.toLowerCase())) return;
    list.items.forEach(i => {
      if (!i.checked && i.name && i.name.trim()) items.push({ name: i.name.trim(), list: list.name });
    });
  });

  fs.writeFileSync(out, JSON.stringify({ items }, null, 2) + '\n');
  console.log('Wrote ' + items.length + ' items from ' + new Set(items.map(i => i.list)).size + ' lists to ' + out);
  any.teardown();
})().catch(err => { console.error(err.message); process.exit(1); });
