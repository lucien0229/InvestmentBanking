// This service receives a public URL only. It has no application or provider credentials.
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

const maxBytes = 10 * 1024 * 1024;
const cidrs = [[0,8],[0x0a000000,8],[0x64400000,10],[0x7f000000,8],[0xa9fe0000,16],[0xac100000,12],[0xc0000000,24],[0xc0000200,24],[0xc0a80000,16],[0xc6120000,15],[0xc6336400,24],[0xcb007100,24],[0xe0000000,4],[0xf0000000,4]];
function publicIpv4(address) {
  if (net.isIP(address) !== 4) return false;
  const number = address.split('.').reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
  return !cidrs.some(([network, bits]) => (number >>> (32 - bits)) === (network >>> (32 - bits)));
}
async function retrieve(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port && url.port !== '443' || url.username || url.password || url.hostname.endsWith('.local') || url.hostname === 'localhost') throw new Error('public_https_required');
  let timer;
  const addresses = await Promise.race([dns.lookup(url.hostname, { all: true, family: 4 }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('public_dns_timeout')), 5000); })]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(({ address }) => !publicIpv4(address))) throw new Error('non_public_address');
  const pinned = addresses[0].address;
  return new Promise((resolve, reject) => {
    // Resolve once and pin the connection; keep TLS hostname/certificate verification.
    const request = https.get(url, { agent: false, timeout: 10000, lookup: (_hostname, options, callback) => options.all ? callback(null, [{ address: pinned, family: 4 }]) : callback(null, pinned, 4), headers: { 'user-agent': 'InvestmentBanking-PublicObservation/1.0', 'accept': 'text/html,text/plain,application/pdf', 'accept-encoding': 'identity' } }, (response) => {
      const chunks = []; let size = 0;
      if (Number(response.headers['content-length'] ?? 0) > maxBytes || response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { request.destroy(new Error('public_response_limit')); return; }
      response.on('data', (chunk) => { size += chunk.length; if (size > maxBytes) response.destroy(new Error('public_response_limit')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => { const headers = {}; for (const key of ['content-type','content-length','etag','last-modified','cache-control']) if (typeof response.headers[key] === 'string') headers[key] = response.headers[key]; resolve({ status: response.statusCode, headers, content_base64: Buffer.concat(chunks).toString('base64') }); });
    });
    request.on('timeout', () => request.destroy(new Error('public_fetch_timeout')));
    request.on('error', reject);
  });
}
// One request per disposable container. The supervisor supplies stdin only.
try {
  let text = ''; for await (const chunk of process.stdin) { text += chunk.toString('utf8'); if (Buffer.byteLength(text) > 4096) throw new Error('input_limit'); }
  const input = JSON.parse(text);
  if (Object.keys(input).length !== 1 || typeof input.url !== 'string' || input.url.length > 2048) throw new Error('input_contract');
  process.stdout.write(JSON.stringify(await retrieve(input.url)));
} catch { process.exitCode = 1; }
