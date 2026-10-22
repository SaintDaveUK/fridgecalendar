// Ticks one item off in AnyList. Env: ANYLIST_EMAIL, ANYLIST_PASSWORD, ITEM_LIST, ITEM_NAME
const AnyList = require('anylist');

(async () => {
  const { ANYLIST_EMAIL, ANYLIST_PASSWORD, ITEM_LIST, ITEM_NAME } = process.env;
  if (!ANYLIST_EMAIL || !ANYLIST_PASSWORD) throw new Error('Set ANYLIST_EMAIL and ANYLIST_PASSWORD');
  if (!ITEM_LIST || !ITEM_NAME) throw new Error('Set ITEM_LIST and ITEM_NAME');

  const any = new AnyList({ email: ANYLIST_EMAIL, password: ANYLIST_PASSWORD });
  await any.login();
  const lists = await any.getLists();
  const list = lists.find(l => l.name === ITEM_LIST);
  const item = list && list.items.find(i => !i.checked && i.name && i.name.trim() === ITEM_NAME);
  if (!item) {
    console.log('No matching unchecked item (already resolved?)');
  } else {
    item.checked = true;
    await item.save();
    console.log('Resolved "' + ITEM_NAME + '" in "' + ITEM_LIST + '"');
  }
  any.teardown();
})().catch(err => { console.error(err.message); process.exit(1); });
