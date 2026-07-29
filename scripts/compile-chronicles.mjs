import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, 'articles');
const targetJson = path.join(rootDir, 'web', 'src', 'data', 'chronicles.json');

const chronicles = {};

if (fs.existsSync(articlesDir)) {
  const entries = fs.readdirSync(articlesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'assets') {
      const artPath = path.join(articlesDir, entry.name, 'article.md');
      if (fs.existsSync(artPath)) {
        chronicles[entry.name] = fs.readFileSync(artPath, 'utf8');
      }
    }
  }
}

fs.mkdirSync(path.dirname(targetJson), { recursive: true });
fs.writeFileSync(targetJson, JSON.stringify(chronicles, null, 2), 'utf8');

const count = Object.keys(chronicles).length;
const sizeKb = (fs.statSync(targetJson).size / 1024).toFixed(1);

console.log(`✅ Compiladas ${count} crónicas en web/src/data/chronicles.json (${sizeKb} KB)`);
