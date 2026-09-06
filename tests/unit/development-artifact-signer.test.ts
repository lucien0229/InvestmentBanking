import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { canonicalJson, makeManifest, verifyManifest } from '../../apps/api/src/artifact-integrity.js';
import { DevelopmentArtifactSigner } from '../../apps/api/src/development-artifact-signer.js';

test('separate development signer binds exact manifest bytes and cannot be selected in production', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ib-sign-'));
  const key = crypto.generateKeyPairSync('ed25519');
  const privatePath = path.join(directory, 'private.pem');
  await fs.writeFile(privatePath, key.privateKey.export({format:'pem',type:'pkcs8'}), {mode:0o600});
  const socket = path.join(directory, 'sign.sock');
  const child = spawn(process.execPath, ['services/artifact-signer/server.mjs'], {env:{...process.env,APP_ENV:'development',ARTIFACT_SIGNER_SOCKET:socket,ARTIFACT_SIGNER_PRIVATE_KEY:privatePath,ARTIFACT_SIGNER_KEY_VERSION:'development/artifact/1'},stdio:['ignore','pipe','pipe']});
  try {
    await Promise.race([once(child.stdout!, 'data'), once(child,'exit').then(()=>{throw new Error('signer startup failed');})]);
    const manifest = makeManifest({revisionId:'33333333-3333-4333-8333-333333333333',purpose:'Synthetic internal acceptance',audience:'Banker',dependencies:[],engine:{name:'libreoffice.calc',acceptance_profile:'development_foss_v1',version:'test',template:'1'},limitations:[],members:[{id:'native',role:'native',path:'analysis.xlsx',bytes:Buffer.from('exact member')}],lineage:[],qc:[]});
    const signed = await new DevelopmentArtifactSigner(socket, 'development').sign(canonicalJson(manifest));
    assert.equal(verifyManifest(manifest,signed.signature,signed.public_key_pem,[{id:'native',bytes:Buffer.from('exact member')}]),true);
    assert.equal(verifyManifest({...manifest,purpose:'changed'},signed.signature,signed.public_key_pem,[{id:'native',bytes:Buffer.from('exact member')}]),false);
    await assert.rejects(new DevelopmentArtifactSigner(socket,'production').sign(canonicalJson(manifest)),/development_only/);
  } finally {
    child.kill();
    await once(child,'exit');
    await fs.rm(directory,{recursive:true,force:true});
  }
});
