import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateKeys, generateSigningKeyPair, encryptContent,
  wrapSessionKey, buildSignableBytes, signPackage, b64url
} from './crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function generatePackage(options) {
  const {
    examName,
    startTime,
    durationMinutes,
    content,
    stepRateMs = 30,
    maxSteps = Math.ceil((durationMinutes * 60 * 1000) / stepRateMs),
    collapseSteps = 200000
  } = options;

  const { kSession, kEvo0 } = generateKeys();
  const { privateKey, publicKey } = await generateSigningKeyPair();

  const contentBytes = new TextEncoder().encode(content);
  const chunks = await encryptContent(contentBytes, kSession);

  const wrappedKey = await wrapSessionKey(kSession, kEvo0);

  const header = {
    version: '1.0.0',
    examName,
    startTime,
    durationMinutes,
    maxSteps,
    stepRateMs,
    collapseSteps
  };

  const signableBytes = buildSignableBytes(header, wrappedKey, chunks);
  const signature = await signPackage(signableBytes, privateKey);

  const packageJson = {
    header,
    wrappedKey,
    kEvo0: b64url(kEvo0),
    chunks,
    publicKey: b64url(publicKey),
    signature: b64url(signature)
  };

  const templatePath = join(__dirname, 'templates', 'exam.template.html');
  const template = readFileSync(templatePath, 'utf-8');
  const packageB64 = Buffer.from(JSON.stringify(packageJson)).toString('base64');
  const injectedLine = `window.EXAM_PACKAGE = JSON.parse(atob('${packageB64}'));`;
  const examHtml = template.replace('<!-- INJECT_PACKAGE_HERE -->', injectedLine);

  return { examHtml, packageJson };
}
