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

const candidateModels = [
  'imagen-3.0-generate-002',
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-002',
  'gemini-3.1-flash-image', // Let's check if the SDK itself says 429 quota or 404
];

async function run() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  for (const model of candidateModels) {
    console.log(`Testing model: ${model}...`);
    try {
      const response = await ai.models.generateImages({
        model,
        prompt: 'A simple line drawing of a heart, white background, 9:16 aspect ratio',
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '9:16',
        },
      });
      console.log(`SUCCESS with model ${model}! Generated images count:`, response.generatedImages?.length);
      break;
    } catch (err) {
      console.log(`FAIL with ${model}:`, err.message);
    }
  }
}

run().catch(console.error);
