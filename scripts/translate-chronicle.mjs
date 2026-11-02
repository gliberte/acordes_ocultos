#!/usr/bin/env node
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
function loadEnv() {
  const envFiles = [path.join(rootDir, '.env'), path.join(rootDir, 'web', '.env')];
  for (const envPath of envFiles) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('❌ Error: GEMINI_API_KEY no encontrada en .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Load tracker for reference data
const trackerPath = path.join(rootDir, 'scripts', 'data', 'secret_chords_tracker.json');
let tracker = [];
if (fs.existsSync(trackerPath)) {
  try {
    tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
  } catch (e) {
    console.warn('⚠️ No se pudo leer secret_chords_tracker.json');
  }
}

const SYSTEM_PROMPT = `You are the master literary translator and chief music historian for "Secret Chords" (the English-language edition of "Acordes Ocultos").
Your task is to translate an in-depth Spanish music documentary chronicle into breathtaking, cinematic, and emotionally resonant English prose.

STRICT EDITORIAL RULES:
1. VOICE AND TONE:
   - Poetic, humane, vulnerable, and historically rigorous.
   - Avoid flat, generic, or machine-like phrasing. Every paragraph must breathe life, atmosphere, and deep human truth.
   - Do NOT use exaggerated clickbait clichés ("soul-crushing", "epic rollercoaster"). Let the gravity of historical truth and emotional drama carry the impact.
2. PRESERVATION:
   - Preserve all image markdown paths EXACTLY as in the original (e.g. \`![...](images/scene-01.webp)\`, \`images/cover.webp\`).
   - Do NOT translate original song titles (e.g. keep "Redemption Song", "Piece of My Heart", "Another Brick in the Wall", "Time in a Bottle").
   - Do NOT translate original artist names, recording studio names, or cities (e.g. Trenchtown, Muscle Shoals, Abbey Road, Criteria Studios).
3. FRONTMATTER (YAML):
   - Translate frontmatter \`title\` and \`description\` to compelling English.
   - Change \`author\` to "Secret Chords".
   - Keep or update \`slug\` to the English slug if provided.
   - Keep genre, year, date, coverImage, readingTime fields intact.
4. HEADINGS & SECTIONS:
   - Translate Prologue, Acts/Milestones ("### Prólogo" -> "### Prologue", "### Hito I" -> "### Milestone I" or "### Chapter I", "### Epílogo" -> "### Epilogue").
   - Ensure the final documentary archive block is titled "### 📚 Sources and Archival Records".
5. OUTPUT FORMAT:
   - Output ONLY the complete translated markdown document. No introductory remarks, no greetings, no backticks enclosing the entire file. Start directly with \`---\` frontmatter.`;

export async function translateArticle(articleFolder, options = {}) {
  const articleDir = path.join(rootDir, 'articles', articleFolder);
  const esPath = path.join(articleDir, 'article.md');
  const enPath = path.join(articleDir, 'article.en.md');

  if (!fs.existsSync(esPath)) {
    console.error(`❌ No existe el archivo: ${esPath}`);
    return false;
  }

  if (fs.existsSync(enPath) && !options.overwrite) {
    console.log(`⏩ [Saltando] Ya existe ${articleFolder}/article.en.md (usa --force para sobrescribir)`);
    return true;
  }

  const esContent = fs.readFileSync(esPath, 'utf8');

  // Match tracker info if available
  const match = tracker.find(t => 
    t.slug_es === articleFolder || 
    articleFolder.includes(t.slug_es || '____') ||
    (t.song && articleFolder.toLowerCase().includes(t.song.toLowerCase().replace(/[^a-z0-9]/g, '')))
  );

  let guidance = '';
  if (match) {
    guidance = `\nReference metadata for this story:
- Artist: ${match.artist}
- Song: ${match.song}
- English Story Title: ${match.title_en || ''}
- English Hook: ${match.hook_en || ''}
- English Slug: ${match.slug_en || ''}`;
  }

  const candidateModels = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-pro'
  ];

  console.log(`🌐 Traduciendo crónica: ${articleFolder}...`);

  for (const model of candidateModels) {
    try {
      console.log(`   Probando con modelo: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${SYSTEM_PROMPT}\n${guidance}\n\nSPANISH CHRONICLE TO TRANSLATE:\n\n${esContent}` }
            ]
          }
        ]
      });

      let enText = response.text || '';
      if (!enText) {
        throw new Error('Respuesta vacía del modelo');
      }

      // Clean up potential enclosing markdown blockticks
      if (enText.startsWith('```markdown')) {
        enText = enText.slice(11);
      } else if (enText.startsWith('```')) {
        enText = enText.slice(3);
      }
      if (enText.endsWith('```')) {
        enText = enText.slice(0, -3);
      }
      enText = enText.trim();

      fs.writeFileSync(enPath, enText, 'utf8');
      const wordCount = enText.split(/\s+/).length;
      console.log(`✅ [Completado con ${model}] Guardado en ${articleFolder}/article.en.md (${wordCount} palabras)`);
      return true;
    } catch (err) {
      console.warn(`   ⚠️ Fallo con ${model}:`, err.message);
      // Try next model after brief wait
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.error(`❌ No se pudo traducir ${articleFolder} con ningún modelo disponible.`);
  return false;
}

// CLI Execution
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const topFlag = args.includes('--top');
  const slugArg = args.find(a => !a.startsWith('--'));

  if (slugArg) {
    await translateArticle(slugArg, { overwrite: force });
  } else if (topFlag) {
    console.log('🚀 Traduciendo historias prioritarias de Secret Chords...');
    const priorityFolders = [
      'bob-marley-redemption-song-destellos-de-gloria',
      'janis-joplin-piece-of-my-heart-destellos-de-gloria',
      'pink-floyd-another-brick-in-the-wall-part-2',
      'pink-floyd-the-great-gig-in-the-sky',
      'jim-croce-time-in-a-bottle-acordes-ocultos',
      'the-hollies-he-aint-heavy-hes-my-brother-acordes-ocultos',
      'the-rolling-stones-gimme-shelter',
      'minnie-riperton-lovin-you-acordes-ocultos',
      'acdc-its-a-long-way-to-the-top-acordes-ocultos',
      'journey-dont-stop-believin-acordes-ocultos'
    ];

    for (const folder of priorityFolders) {
      await translateArticle(folder, { overwrite: force });
      // Small pause to prevent rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }
  } else {
    console.log(`Uso:
  node scripts/translate-chronicle.mjs <nombre-carpeta-en-articles> [--force]
  node scripts/translate-chronicle.mjs --top [--force]
    `);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
