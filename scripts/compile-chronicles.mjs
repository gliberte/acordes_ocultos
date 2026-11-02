import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, 'articles');
const targetJsonEs = path.join(rootDir, 'web', 'src', 'data', 'chronicles.json');
const targetJsonEn = path.join(rootDir, 'web', 'src', 'data', 'chronicles_en.json');
const trackerSource = path.join(rootDir, 'scripts', 'data', 'secret_chords_tracker.json');
const trackerTarget = path.join(rootDir, 'web', 'src', 'data', 'secret_chords_tracker.json');

if (fs.existsSync(trackerSource)) {
  fs.mkdirSync(path.dirname(trackerTarget), { recursive: true });
  fs.copyFileSync(trackerSource, trackerTarget);
}

const chroniclesEs = {};
const chroniclesEn = {};

if (fs.existsSync(articlesDir)) {
  const entries = fs.readdirSync(articlesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'assets') {
      const artPathEs = path.join(articlesDir, entry.name, 'article.md');
      if (fs.existsSync(artPathEs)) {
        chroniclesEs[entry.name] = fs.readFileSync(artPathEs, 'utf8');
      }

      const artPathEn = path.join(articlesDir, entry.name, 'article.en.md');
      if (fs.existsSync(artPathEn)) {
        chroniclesEn[entry.name] = fs.readFileSync(artPathEn, 'utf8');
      }
    }
  }
}

fs.mkdirSync(path.dirname(targetJsonEs), { recursive: true });
fs.writeFileSync(targetJsonEs, JSON.stringify(chroniclesEs, null, 2), 'utf8');
fs.writeFileSync(targetJsonEn, JSON.stringify(chroniclesEn, null, 2), 'utf8');

const countEs = Object.keys(chroniclesEs).length;
const sizeKbEs = (fs.statSync(targetJsonEs).size / 1024).toFixed(1);
const countEn = Object.keys(chroniclesEn).length;
const sizeKbEn = (fs.statSync(targetJsonEn).size / 1024).toFixed(1);

console.log(`✅ Compiladas ${countEs} crónicas en español (${sizeKbEs} KB)`);
console.log(`✅ Compiladas ${countEn} crónicas en inglés (${sizeKbEn} KB)`);
