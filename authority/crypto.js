import { webcrypto } from 'node:crypto';
import * as ed from '@noble/ed25519';

const { subtle } = webcrypto;

const CHUNK_SIZE = 64 * 1024;

export function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function fromB64url(str) {
  return new Uint8Array(Buffer.from(str, 'base64url'));
}

export function generateKeys() {
  const kSession = new Uint8Array(32);
  const kEvo0 = new Uint8Array(32);
  webcrypto.getRandomValues(kSession);
  webcrypto.getRandomValues(kEvo0);
  return { kSession, kEvo0 };
}

export async function encryptContent(contentBytes, kSession) {
  const sessionCryptoKey = await subtle.importKey(
    'raw', kSession, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const chunks = [];
  let offset = 0;
  let chunkIndex = 0;
  while (offset < contentBytes.length) {
    const slice = contentBytes.slice(offset, offset + CHUNK_SIZE);
    const nonce = new Uint8Array(12);
    webcrypto.getRandomValues(nonce);
    const aadStr = `chunk-${chunkIndex}`;
    const aad = new TextEncoder().encode(aadStr);
    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, additionalData: aad },
      sessionCryptoKey,
      slice
    );
    chunks.push({
      id: chunkIndex,
      nonce: b64url(nonce),
      ciphertext: b64url(new Uint8Array(ciphertext)),
      aad: aadStr
    });
    offset += CHUNK_SIZE;
    chunkIndex++;
  }
  return chunks;
}

export async function wrapSessionKey(kSession, kEvo0) {
  const wrappingKey = await subtle.importKey(
    'raw', kEvo0, { name: 'AES-KW' }, false, ['wrapKey']
  );
  const sessionCryptoKey = await subtle.importKey(
    'raw', kSession, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  const wrapped = await subtle.wrapKey('raw', sessionCryptoKey, wrappingKey, 'AES-KW');
  return b64url(new Uint8Array(wrapped));
}

export async function generateSigningKeyPair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKey };
}

export async function signPackage(data, privateKey) {
  return await ed.signAsync(data, privateKey);
}

export function buildSignableBytes(header, wrappedKey, chunks) {
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const wrappedKeyBytes = fromB64url(wrappedKey);
  const chunkBytes = chunks.map(c => fromB64url(c.ciphertext));
  const totalLen = headerBytes.length + wrappedKeyBytes.length + chunkBytes.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  result.set(headerBytes, offset); offset += headerBytes.length;
  result.set(wrappedKeyBytes, offset); offset += wrappedKeyBytes.length;
  for (const cb of chunkBytes) {
    result.set(cb, offset); offset += cb.length;
  }
  return result;
}
