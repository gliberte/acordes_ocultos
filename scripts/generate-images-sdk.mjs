import { GoogleGenAI } from '@google/genai';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
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

const imagesToGenerate = [
  {
    name: 'scene-02.png',
    prompt: 'A realistic 1974 photograph of a distinguished English producer with neat hair and a smart shirt (representing Sir George Martin) listening intently in AIR Studios London, vintage recording equipment, 9:16 aspect ratio'
  },
  {
    name: 'scene-03.png',
    prompt: 'A dreamlike, cinematic illustration of the metallic Tin Man silhouette standing in a foggy, golden road to Oz, looking down at a glowing red heart shape inside his chest, 9:16 aspect ratio'
  },
  {
    name: 'scene-04.png',
    prompt: 'A realistic 1974 photograph of a young musician with light hair and wire-rimmed glasses (representing Gerry Beckley) playing piano in a London studio, focused expression, 9:16 aspect ratio'
  },
  {
    name: 'scene-05.png',
    prompt: 'A close-up photograph of a vintage Wurlitzer electric piano keys in a 1970s studio booth, warm analogue glow, selective focus, 9:16 aspect ratio'
  },
  {
    name: 'scene-06.png',
    prompt: 'A realistic 1974 photograph of three young long-haired musicians standing close around a single vintage studio microphone, singing in deep harmony, soft studio lighting, 9:16 aspect ratio'
  },
  {
    name: 'scene-07.png',
    prompt: 'A spinning vinyl record on a high-end 1970s turntable, warm ambient light, gold foil accents on the record label, retro aesthetic, 9:16 aspect ratio'
  },
  {
    name: 'cover.png',
    prompt: 'A vertical Instagram Reels cover design. In the center, a realistic 1974 photograph of Sir George Martin directing Gerry Beckley at a grand piano inside AIR Studios London. Overlaid in the middle third is the bold, highly legible retro text \'EL ACORDE QUE SALVÓ A UN CLÁSICO\' in elegant vintage typography. Warm analogue tones, retro album art aesthetic, 9:16 aspect ratio'
  }
];

async function run() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const outputDir = join(rootDir, 'public/videos/tinman');
  mkdirSync(outputDir, { recursive: true });

  for (const item of imagesToGenerate) {
    const targetPath = join(outputDir, item.name);
    if (existsSync(targetPath)) {
      console.log(`${item.name} already exists, skipping.`);
      continue;
    }

    console.log(`Generating ${item.name} with imagen-4.0-fast-generate-001...`);
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: item.prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '9:16',
        },
      });

      const base64Image = response.generatedImages[0].image.imageBytes;
      const imageBuffer = Buffer.from(base64Image, 'base64');
      writeFileSync(targetPath, imageBuffer);
      console.log(`Saved ${item.name} to ${targetPath}`);
    } catch (err) {
      console.error(`Failed to generate ${item.name}:`, err.message);
    }
  }
  console.log("All generation attempts complete!");
}

run().catch(console.error);
