#!/usr/bin/env node
import { program } from 'commander';
import { generatePackage } from './packager.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

program
  .name('fortiexam')
  .description('FortiExam Authority CLI');

program
  .command('generate')
  .description('Generate an encrypted exam package')
  .option('-n, --name <name>', 'Exam name', 'Demo Exam')
  .option('-s, --start <datetime>', 'Start time ISO 8601', () => new Date(Date.now() + 2 * 60 * 1000).toISOString())
  .option('-d, --duration <minutes>', 'Duration in minutes', '3')
  .option('-c, --content <text>', 'Exam content JSON', null)
  .option('-r, --rate <ms>', 'Step rate in ms', '30')
  .option('-m, --max-steps <n>', 'Max evolution steps', null)
  .option('-o, --out <dir>', 'Output directory', './dist')
  .option('--demo', 'Quick demo mode')
  .action(async (opts) => {
    let { name, start, duration, content, rate, maxSteps, out } = opts;

    if (opts.demo) {
      duration = 1;
      rate = 100;
      maxSteps = 600;
      start = new Date(Date.now() + 30_000).toISOString();
    }

    if (!content) {
      content = JSON.stringify([
        { q: "What is Newton's Second Law?", options: ["F=ma", "E=mc²", "F=mv", "a=F/m²"], type: "mcq" },
        { q: "The unit of electric charge is?", options: ["Coulomb", "Ampere", "Volt", "Ohm"], type: "mcq" },
        { q: "Which gas is most abundant in Earth's atmosphere?", options: ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon"], type: "mcq" },
        { q: "The speed of light in vacuum is approximately?", options: ["3×10⁸ m/s", "3×10⁶ m/s", "3×10¹⁰ m/s", "3×10⁴ m/s"], type: "mcq" },
        { q: "What is the chemical symbol for Gold?", options: ["Au", "Ag", "Fe", "Cu"], type: "mcq" }
      ]);
    }

    const durationMinutes = parseInt(duration);
    const stepRateMs = parseInt(rate);
    const maxStepsNum = maxSteps ? parseInt(maxSteps) : Math.ceil((durationMinutes * 60 * 1000) / stepRateMs);

    console.log('🔐 Generating encrypted exam package...');

    const { examHtml, packageJson } = await generatePackage({
      examName: name,
      startTime: start,
      durationMinutes,
      content,
      stepRateMs,
      maxSteps: maxStepsNum,
      collapseSteps: 200000
    });

    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'exam.html'), examHtml);
    writeFileSync(join(out, 'exam_package.json'), JSON.stringify(packageJson, null, 2));

    console.log('');
    console.log('✅ Exam package generated successfully!');
    console.log('');
    console.log(`📁 Output: ${out}/`);
    console.log(`   exam.html          → open in browser`);
    console.log(`   exam_package.json  → debug info`);
    console.log('');
    console.log(`⏱  Exam starts at: ${start}`);
    console.log('');
    console.log('🚀 Open exam.html in Chrome/Firefox/Edge');
  });

program.parse();
