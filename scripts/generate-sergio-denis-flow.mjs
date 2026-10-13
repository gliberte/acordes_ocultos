#!/usr/bin/env node
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const USER_DATA_DIR = join(os.homedir(), '.config', 'acordes-ocultos', 'chrome-flow-profile');
const force = process.argv.includes('--force');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/cover_bg.png'),
    prompt: 'Vertical 9:16 authentic documentary portrait of young Sergio Denis (Héctor Omar Hoffmann) in early 1970: handsome young Argentine singer in his early 20s with soft wavy light-brown hair, expressive soulful eyes, gentle charismatic smile, wearing a stylish dark turtleneck sweater and tailored corduroy jacket, warm vintage recording studio lighting behind him with soft amber bokeh, rich 35mm Kodachrome film grain, generous negative space at top and bottom for typography, vertical framing, no text.'
  },
  {
    name: 'scene-01.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-01.png'),
    prompt: 'Vertical 9:16 candid documentary scene. Buenos Aires November 1969, outside the CBS Columbia recording studios entrance on Calle Paraguay, a 20-year-old Hector Hoffmann (young Sergio Denis) with natural wavy hair carrying a vintage guitar case and wearing a modest late-1960s jacket, looking up at the studio building with quiet hope and determination, nostalgic late-60s street atmosphere with vintage Argentine cars in soft focus, warm daylight, 35mm film grain, vertical framing, no text.'
  },
  {
    name: 'scene-02.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-02.png'),
    prompt: 'Vertical 9:16 vintage recording studio control room. Inside CBS studios Buenos Aires 1969, legendary composer and producer Francis Smith in a sharp late-60s dark suit sitting before an analog mixing console, handing the sheet music of Te llamo para despedirme to young Sergio Denis, warm amber lamps, vintage reel-to-reel tape recorders turning in the background, candid documentary moment, rich 35mm film grain, vertical framing, no text.'
  },
  {
    name: 'scene-03.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-03.png'),
    prompt: 'Vertical 9:16 intimate recording booth performance. Young Sergio Denis at age 20 standing behind a vintage Neumann U47 tube microphone in the studio booth, wearing large retro studio headphones, singing with genuine warmth and closed eyes, pouring his heart into the ballad, soft warm spotlight through soundproof glass, authentic late-1969 recording session, 35mm Kodachrome grain, vertical framing, no text.'
  },
  {
    name: 'scene-04.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-04.png'),
    prompt: 'Vertical 9:16 vibrant 1970 urban music scene. Early 1970 in downtown Buenos Aires, a bustling classic record store window showcasing the CBS 7-inch vinyl single Te llamo para despedirme by Sergio Denis with excited fans admiring it, vintage radio broadcast equipment nearby, authentic retro 1970 Argentine street energy, warm natural lighting, 35mm film texture, vertical framing, no text.'
  },
  {
    name: 'scene-05.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-05.png'),
    prompt: 'Vertical 9:16 grand concert retrospective. A massive Argentine theater stage during the 1980s or 1990s, charismatic adult Sergio Denis with his signature radiant smile and open arms holding a wireless microphone, thousands of fans singing along emotionally from the tiered balconies and stalls, golden stage spotlights cutting through atmospheric haze, deep human connection, documentary concert realism, 35mm grain, vertical framing, no text.'
  },
  {
    name: 'scene-06.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-06.png'),
    prompt: 'Vertical 9:16 respectful documentary backstage scene. San Miguel de Tucumán, March 11 2019, inside the historic Teatro Mercedes Sosa, 70-year-old Sergio Denis with distinguished silver hair, warm luminous smile, dressed in an elegant black suit and crisp white shirt, checking his microphone backstage with quiet serenity before stepping onto the brightly lit stage, dignified tender presence, cinematic documentary photography, vertical framing, no text.'
  },
  {
    name: 'scene-07.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-07.png'),
    prompt: 'Vertical 9:16 poignant live concert scene. On the illuminated proscenium of Teatro Mercedes Sosa in Tucumán, Sergio Denis walking gracefully along the stage catwalk toward the cheering front-row audience, singing with heartfelt joy and open-handed gesture, warm theater footlights illuminating his silver hair, crowded theater hall in soft background bokeh, respectful documentary realism, vertical framing, no text.'
  },
  {
    name: 'scene-08.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-08.png'),
    prompt: 'Vertical 9:16 solemn theatrical proscenium scene. A sudden freeze-frame of dramatic theatrical tension: the edge of the dark theater orchestra pit in high contrast shadows, the fallen microphone resting on the stage floorboards under a spotlight, theater lights cutting through soft atmospheric haze, audience rising in stunned breathless concern in the distance, dramatic respectful cinematography, no graphic injuries, rich 35mm grain, vertical framing, no text.'
  },
  {
    name: 'scene-09.png',
    target: join(rootDir, 'public/videos/sergio-denis-te-llamo-para-despedirme-acordes-ocultos/scene-09.png'),
    prompt: 'Vertical 9:16 poetic closing metaphor. An empty historic theater stage bathed in silent golden amber dusk light, a lone vintage microphone stand in the center surrounded by white flowers and rose petals resting on the polished wooden floorboards, tranquil velvet curtains framing the silence, deep poetic dignity, no turntable, no vinyl, rich 35mm film grain, vertical framing, no text.'
  }
];

async function main() {
  console.log('🚀 Iniciando generador de imágenes con Google Flow para Sergio Denis...');
  const pending = itemsToGenerate.filter(item => force || !existsSync(item.target));

  if (pending.length === 0) {
    console.log('✅ Todas las imágenes ya existen. Usa --force para regenerar.');
    return;
  }

  console.log(`📋 Imágenes pendientes por generar: ${pending.length} de ${itemsToGenerate.length}`);

  mkdirSync(dirname(itemsToGenerate[0].target), { recursive: true });

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = context.pages()[0] || await context.newPage();
  console.log('🌐 Navegando a Google Labs Flow...');
  await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle', timeout: 60000 });

  await page.waitForTimeout(3000);

  // Check login
  const isLoginPage = page.url().includes('accounts.google.com');
  if (isLoginPage) {
    console.log('⚠️ Requiere inicio de sesión. Por favor inicia sesión en la ventana de Chrome.');
    await page.waitForURL('**/labs.google/fx/**', { timeout: 120000 });
  }

  console.log('🎯 En la plataforma Flow.');

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${pending.length}] Generando: ${item.name}`);
    console.log(`📝 Prompt: "${item.prompt.slice(0, 100)}..."`);

    let promptArea = await page.$('textarea');
    if (!promptArea) {
      promptArea = await page.$('div[contenteditable="true"]');
    }

    if (!promptArea) {
      console.log('🔍 Buscando área de texto...');
      await page.waitForTimeout(2000);
      promptArea = await page.$('textarea, div[contenteditable="true"], input[type="text"]');
    }

    if (!promptArea) {
      console.error(`❌ No se encontró el campo de prompt para ${item.name}`);
      continue;
    }

    // Set 9:16 aspect ratio if buttons exist
    try {
      const portraitBtn = await page.$('button:has-text("9:16"), [aria-label*="9:16"]');
      if (portraitBtn) {
        await portraitBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (_) {}

    await promptArea.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await promptArea.fill(item.prompt);
    await page.waitForTimeout(800);

    // Submit prompt
    const generateBtn = await page.$('button[type="submit"], button:has-text("Generate"), button:has-text("Create"), button[aria-label*="Generate"]');
    if (generateBtn) {
      await generateBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log('⏳ Esperando renderizado de la imagen en Flow (~15-25s)...');

    let downloaded = false;
    const startTime = Date.now();
    const maxWaitMs = 60000;

    while (Date.now() - startTime < maxWaitMs && !downloaded) {
      await page.waitForTimeout(3000);

      // Search for images in the feed
      const candidateImages = await page.$$('img[src^="http"], img[src^="blob:"]');
      for (const img of candidateImages.reverse()) {
        const src = await img.getAttribute('src');
        if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('profile')) {
          try {
            const box = await img.boundingBox();
            if (box && box.width > 200 && box.height > 250) {
              // Valid large image rendered
              const imageResponse = await page.request.get(src);
              if (imageResponse.ok()) {
                const buffer = await imageResponse.body();
                if (buffer.length > 50000) {
                  writeFileSync(item.target, buffer);
                  console.log(`💾 Guardada exitosamente: ${item.name} (${(buffer.length / 1024).toFixed(1)} KB)`);
                  downloaded = true;
                  break;
                }
              }
            }
          } catch (_) {}
        }
      }
    }

    if (!downloaded) {
      console.warn(`⚠️ No se pudo descargar automáticamente ${item.name}. Intentando captura o fallback...`);
    }

    await page.waitForTimeout(2000);
  }

  await context.close();
  console.log('\n✨ Proceso de generación finalizado.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
