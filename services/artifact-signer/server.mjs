/** Separate development Artifact signer. Only this service can read its key. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';

if (process.env.APP_ENV !== 'development') throw new Error('artifact_signer_development_only');
const socket = process.env.ARTIFACT_SIGNER_SOCKET;
const keyPath = process.env.ARTIFACT_SIGNER_PRIVATE_KEY;
const keyVersion = process.env.ARTIFACT_SIGNER_KEY_VERSION;
if (!socket || !keyPath || !keyVersion?.startsWith('development/artifact/')) throw new Error('artifact_signer_configuration_required');
if ((fs.statSync(keyPath).mode & 0o077) !== 0) throw new Error('artifact_signer_private_permissions');
const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('artifact_signer_key_type');
const publicKey = crypto.createPublicKey(privateKey).export({format:'pem',type:'spki'}).toString();
const server = http.createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/sign') { response.writeHead(404).end(); return; }
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 4*1024*1024) { response.writeHead(413).end(); request.destroy(); return; }
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof input.canonical_payload !== 'string' || Object.keys(input).length !== 1) throw new Error('invalid_contract');
    const manifest = JSON.parse(input.canonical_payload);
    if (manifest.schema_version !== '1.0.0' || manifest.engine?.name !== 'libreoffice.calc' || manifest.engine?.acceptance_profile !== 'development_foss_v1' || !Array.isArray(manifest.members)
      || manifest.claims?.deployment_origin_and_integrity_only !== true || manifest.claims?.external_use_authorization !== false) throw new Error('invalid_manifest');
    const bytes = Buffer.from(input.canonical_payload);
    response.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify({
      key_version:keyVersion, algorithm:'EC_SIGN_ED25519', custody:'development_host_service',
      signature:crypto.sign(null,bytes,privateKey).toString('base64'), public_key_pem:publicKey,
      canonical_sha256:crypto.createHash('sha256').update(bytes).digest('hex')
    }));
  } catch { response.writeHead(400).end(); }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
if (fs.existsSync(socket)) {
  if (!fs.lstatSync(socket).isSocket()) throw new Error('artifact_signer_socket_invalid');
  fs.unlinkSync(socket);
}
server.listen(socket, () => { fs.chmodSync(socket,0o660); process.stdout.write('Artifact signer ready\n'); });
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
