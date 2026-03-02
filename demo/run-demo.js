#!/usr/bin/env node
import { generatePackage } from '../authority/packager.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const startTime = new Date(Date.now() + 30_000).toISOString();

const sampleContent = JSON.stringify([
  { q: "What is Newton's Second Law?", options: ["F=ma", "E=mc²", "F=mv", "a=F/m²"], type: "mcq" },
  { q: "The unit of electric charge is?", options: ["Coulomb", "Ampere", "Volt", "Ohm"], type: "mcq" },
  { q: "Which gas is most abundant in Earth's atmosphere?", options: ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon"], type: "mcq" },
  { q: "The speed of light in vacuum is approximately?", options: ["3×10⁸ m/s", "3×10⁶ m/s", "3×10¹⁰ m/s", "3×10⁴ m/s"], type: "mcq" },
  { q: "What is the chemical symbol for Gold?", options: ["Au", "Ag", "Fe", "Cu"], type: "mcq" }
]);

const { examHtml, packageJson } = await generatePackage({
  examName: "FortiExam Demo",
  startTime,
  durationMinutes: 1,
  content: sampleContent,
  stepRateMs: 100,
  maxSteps: 600,
  collapseSteps: 100
});

const outDir = join(__dirname, '../dist');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'exam.html'), examHtml);
writeFileSync(join(outDir, 'exam_package.json'), JSON.stringify(packageJson, null, 2));

console.log('');
console.log('✅ FortiExam Demo Package Generated!');
console.log('');
console.log(`📁 Output: ${outDir}/`);
console.log(`   exam.html          (open this in browser)`);
console.log(`   exam_package.json  (debug info)`);
console.log('');
console.log(`⏱  Exam unlocks at: ${startTime}`);
console.log(`   (30 seconds from now)`);
console.log('');
console.log('🚀 Open exam.html in Chrome/Firefox/Edge');
console.log('   → Wait 30s → Exam unlocks automatically');
console.log('   → After 60s → Cryptographic expiry triggered');
console.log('');
