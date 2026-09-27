const base = 'http://terraform-mcp-internal_app:8080/mcp';

async function post(payload, sid) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (sid) headers['mcp-session-id'] = sid;
  const res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  return {
    status: res.status,
    sid: res.headers.get('mcp-session-id') || sid,
    body: text.trim() ? JSON.parse(text) : null,
  };
}

let r = await post({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'blueops-terraform-smoke', version: '1' },
  },
});
if (r.status !== 200 || !r.sid) throw new Error('initialize failed');
const sid = r.sid;
await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sid);

r = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, sid);
const tools = r.body?.result?.tools || [];
const expected = [
  'get_latest_module_version',
  'get_latest_provider_version',
  'get_module_details',
  'get_policy_details',
  'get_provider_capabilities',
  'get_provider_details',
  'search_modules',
  'search_policies',
  'search_providers',
].sort();
const actual = tools.map(t => t.name).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error('unexpected Terraform tool surface: ' + actual.join(','));
}
console.log('tools=' + tools.length);

r = await post({
  jsonrpc: '2.0', id: 3, method: 'tools/call',
  params: {
    name: 'search_providers',
    arguments: {
      provider_namespace: 'oracle',
      provider_name: 'oci',
      service_slug: 'core_instance',
      provider_document_type: 'resources',
      provider_version: 'latest',
    },
  },
}, sid);

if (r.body?.result?.isError) throw new Error('OCI Registry query failed');
const out = (r.body?.result?.content || [])
  .filter(x => x.type === 'text')
  .map(x => x.text)
  .join('\n');
if (!/oracle\/oci/i.test(out) || !/core_instance/i.test(out)) {
  throw new Error('OCI provider result did not contain expected documentation');
}
console.log('oci_registry_query=PASS');
