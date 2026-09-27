const base = 'http://playwright-mcp-internal_app:8931/mcp';
const common = {
  host: 'playwright-mcp-internal_app',
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};

function decode(text) {
  if (!text.trim()) return null;
  const lines = text.split('\n').filter(l => l.startsWith('data: '));
  return JSON.parse(lines.length ? lines.at(-1).slice(6) : text);
}

async function post(payload, sid) {
  const headers = { ...common };
  if (sid) headers['mcp-session-id'] = sid;
  const res = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, sid: res.headers.get('mcp-session-id') || sid, body: decode(text) };
}

let r = await post({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'blueops-internal-smoke', version: '1' },
  },
});
if (r.status !== 200 || !r.sid) throw new Error('initialize failed');
const sid = r.sid;
await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sid);

r = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, sid);
const tools = r.body.result?.tools || [];
if (tools.length !== 25) throw new Error('unexpected tool count');
console.log('tools=' + tools.length);
console.log('readonly=' + tools.filter(t => t.annotations?.readOnlyHint === true).length);
console.log('destructive=' + tools.filter(t => t.annotations?.destructiveHint === true).length);

r = await post({
  jsonrpc: '2.0', id: 3, method: 'tools/call',
  params: { name: 'browser_navigate', arguments: { url: 'https://app.conexaoazul.com/web/login' } },
}, sid);
if (r.body.result?.isError) throw new Error('navigate failed');

r = await post({
  jsonrpc: '2.0', id: 4, method: 'tools/call',
  params: { name: 'browser_snapshot', arguments: {} },
}, sid);
const text = (r.body.result?.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n');
const url = text.match(/Page URL: ([^\n]+)/)?.[1] || 'unknown';
const title = text.match(/Page Title: ([^\n]+)/)?.[1] || 'unknown';
console.log('odoo_url=' + url);
console.log('odoo_title=' + title);
