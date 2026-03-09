/**
 * FortiExam Phase 1 Crypto Pipeline
 * Steps 1.2 → 1.5: K0 gen, AES-GCM encrypt, HMAC-SHA256 chain,
 *                   nested wrappers, Merkle tree, PBKDF2 binding, ECDSA sign
 */

import { webcrypto } from 'node:crypto';
const { subtle } = webcrypto;
const getRandomValues = (arr) => webcrypto.getRandomValues(arr);

// ── Helpers ────────────────────────────────────────────────────────────────

function buf2hex(buf) {
  return Buffer.from(buf).toString('hex');
}

function buf2b64(buf) {
  return Buffer.from(buf).toString('base64');
}

function b642buf(str) {
  return Uint8Array.from(Buffer.from(str, 'base64'));
}

function numToBytes(n) {
  // encode counter as 4-byte big-endian for HMAC data
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, n, false);
  return buf;
}

// ── Step 1.2: Content Encryption with Root Key K0 ─────────────────────────

/**
 * Generate 256-bit K0 and encrypt paperBytes with AES-GCM.
 * Returns { ciphertext_b64, nonce_b64, k0_raw }
 */
export async function encryptContent(paperBytes) {
  // Generate K0
  const k0Key = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const nonce = getRandomValues(new Uint8Array(12));

  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    k0Key,
    paperBytes
  );

  const k0Raw = await subtle.exportKey('raw', k0Key);

  return {
    ciphertext_b64: buf2b64(ciphertext),
    nonce_b64: buf2b64(nonce),
    k0_raw: new Uint8Array(k0Raw),
  };
}

// ── Step 1.3: Forward Counter-Hash Chain K0 → K1 → ... → K10 ─────────────

/**
 * Build HMAC-SHA256 chain: K_{i} = HMAC_SHA256(K_{i-1}, i)
 * Returns array [K0, K1, ..., K_nStages] as Uint8Array[]
 */
export async function buildKeyChain(k0Raw, nStages) {
  const chain = [k0Raw];

  for (let i = 1; i <= nStages; i++) {
    const prev = chain[i - 1];
    const hmacKey = await subtle.importKey(
      'raw', prev,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await subtle.sign('HMAC', hmacKey, numToBytes(i));
    chain.push(new Uint8Array(sig));
  }

  return chain; // chain[0]=K0, chain[1]=K1, ..., chain[nStages]=Kn
}

// ── Step 1.4: Nested Encrypted Wrappers ────────────────────────────────────

/**
 * Create wrappers: wrapper[i] = AES-GCM( K[i+1], K[i] )
 * so wrapper[9] = AES-GCM(K10, K9), ..., wrapper[0] = AES-GCM(K1, K0)
 * Returns wrappers as base64 strings with embedded nonce.
 * Format: nonce(12B) || ciphertext  →  base64
 */
export async function buildWrappers(chain) {
  const nStages = chain.length - 1; // e.g. 10
  const wrappers = [];

  for (let i = 0; i < nStages; i++) {
    const encKey = await subtle.importKey(
      'raw', chain[i + 1],
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const nonce = getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      encKey,
      chain[i]
    );
    // pack as nonce || ciphertext
    const packed = new Uint8Array(12 + ct.byteLength);
    packed.set(nonce, 0);
    packed.set(new Uint8Array(ct), 12);
    wrappers.push(buf2b64(packed));
  }

  return wrappers; // wrappers[0]=wrapper0(AES-GCM(K1,K0)), ..., wrappers[9]=wrapper9(AES-GCM(K10,K9))
}

// ── Step 1.4: Merkle Tree ──────────────────────────────────────────────────

/**
 * leaf_i = SHA256(wrapper_i bytes)
 * root   = SHA256(leaf0 || leaf1 || ... || leaf_{n-1})
 */
export async function buildMerkleTree(wrappers) {
  const leaves = await Promise.all(
    wrappers.map(async (w) => {
      const hash = await subtle.digest('SHA-256', b642buf(w));
      return new Uint8Array(hash);
    })
  );

  // Concatenate all leaves then hash
  const combined = new Uint8Array(leaves.length * 32);
  leaves.forEach((leaf, i) => combined.set(leaf, i * 32));
  const rootHash = await subtle.digest('SHA-256', combined);

  return {
    leaves: leaves.map(buf2hex),
    merkle_root: buf2hex(rootHash),
  };
}

// ── Step 1.5: Device Binding ───────────────────────────────────────────────

/**
 * binding_key = PBKDF2(machine_hash, exam_salt, 100000, SHA-256, 256-bit)
 * bound_kfinal = AES-GCM(binding_key, K_final)
 * Returns bound_kfinal_b64
 */
export async function bindToDevice(kFinalRaw, machineFingerprint, examSalt) {
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw', enc.encode(machineFingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const bindingKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(examSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const nonce = getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    bindingKey,
    kFinalRaw
  );

  const packed = new Uint8Array(12 + ct.byteLength);
  packed.set(nonce, 0);
  packed.set(new Uint8Array(ct), 12);

  return buf2b64(packed);
}

// ── Step 1.5: ECDSA-SHA256 Signing ────────────────────────────────────────

/** Generate ECDSA P-256 key pair for the authority. */
export async function generateSigningKeyPair() {
  const pair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const privateJwk = await subtle.exportKey('jwk', pair.privateKey);
  const publicJwk = await subtle.exportKey('jwk', pair.publicKey);
  return { privateJwk, publicJwk };
}

/**
 * Sign the exam package payload with ECDSA-SHA256.
 * Signed data: JSON-stringified canonical package (without admin_signature field).
 */
export async function signPackage(packagePayload, privateJwk) {
  const privKey = await subtle.importKey(
    'jwk', privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const data = new TextEncoder().encode(JSON.stringify(packagePayload));
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, data);

  return buf2b64(sig);
}

// ── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Run the full Phase 1 crypto pipeline for one student.
 *
 * @param {Uint8Array} paperBytes       Raw bytes of the question paper
 * @param {object}     examConfig       { exam_id, n_stages, exam_salt }
 * @param {string}     machineFingerprint  Student's device fingerprint
 * @param {object}     signingKeys      { privateJwk, publicJwk }
 * @returns {object}  Final exam package
 */
export async function runPipeline(paperBytes, examConfig, machineFingerprint, signingKeys) {
  const { exam_id, n_stages, exam_salt } = examConfig;

  // Step 1.2
  const { ciphertext_b64, nonce_b64, k0_raw } = await encryptContent(paperBytes);

  // Step 1.3
  const chain = await buildKeyChain(k0_raw, n_stages);
  const kFinal = chain[n_stages]; // K10

  // Step 1.4
  const wrappers = await buildWrappers(chain);
  const { merkle_root, leaves } = await buildMerkleTree(wrappers);

  // Step 1.5
  const bound_kfinal = await bindToDevice(kFinal, machineFingerprint, exam_salt);

  const packagePayload = {
    exam_id,
    n_stages,
    counter_seed: 0,
    ciphertext: ciphertext_b64,
    nonce: nonce_b64,
    bound_kfinal,
    wrappers,
    merkle_root,
    public_key: signingKeys.publicJwk,
  };

  const admin_signature = await signPackage(packagePayload, signingKeys.privateJwk);

  return {
    ...packagePayload,
    admin_signature,
    _debug: { merkle_leaves: leaves },
  };
}
