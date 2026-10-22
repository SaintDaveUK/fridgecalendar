// Cloudflare Worker: lets the fridge page ask GitHub to tick an AnyList item off, without putting any
// token in the public page. The Worker holds a GitHub token (secret GITHUB_TOKEN) that can only run workflows.
// Env: GITHUB_TOKEN (secret), REPO (e.g. "SaintDaveUK/fridgecalendar"), ALLOWED_ORIGIN (e.g. "https://saintdaveuk.github.io")
export default {
  async fetch(request, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response('forbidden', { status: 403, headers: cors });

    let body;
    try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400, headers: cors }); }
    const { list, name } = body || {};
    if (typeof list !== 'string' || typeof name !== 'string' || !list || !name || list.length > 200 || name.length > 500) {
      return new Response('bad request', { status: 400, headers: cors });
    }

    const res = await fetch('https://api.github.com/repos/' + env.REPO + '/actions/workflows/anylist-resolve.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'fridge-resolve-worker',
      },
      body: JSON.stringify({ ref: 'main', inputs: { list, name } }),
    });
    return new Response(res.ok ? 'ok' : 'github error ' + res.status, { status: res.ok ? 200 : 502, headers: cors });
  },
};
