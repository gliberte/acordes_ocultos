import { GoogleGenAI } from '@google/genai';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const envPath = join(rootDir, '.env');

const loadEnv = () => {
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
};

async function run() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  console.log("Listing models...");
  const response = await ai.models.list();
  console.log("Keys in response:", Object.keys(response));
  console.log(JSON.stringify(response, null, 2));
}

run().catch(console.error);
