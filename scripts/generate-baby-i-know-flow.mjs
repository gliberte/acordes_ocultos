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
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/cover_bg.png'),
    prompt: 'Vertical 9:16 cinematic mood portrait. London 1977 rainy midnight, a moody dimly-lit apartment living room with amber lamplight, on a dark wooden side table sits a vintage black rotary telephone with its receiver resting beside a steaming cup of tea, outside through rain-streaked window panes wet city streetlights glow softly, rich 35mm film grain, melancholic nostalgic atmosphere, vertical framing, no text.'
  },
  {
    name: 'scene-01.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-01.png'),
    prompt: 'Vertical 9:16 cinematic narrative scene. London 1977 midnight. Inside a dimly lit vintage apartment living room with amber wallpaper and soft lamplight, a handsome young British man in his late 20s with wavy brown hair wearing a knitted wool sweater sits pensively staring as a black rotary telephone on a small wooden table begins to ring, rain softly streaking the window behind him, cinematic 35mm film grain, melancholic mood, vertical framing, no text.'
  },
  {
    name: 'scene-02.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-02.png'),
    prompt: 'Vertical 9:16 cinematic narrative scene. The same young British man in the knitted sweater picks up the heavy black telephone receiver and presses it to his ear, his eyes wide with emotion as he recognizes her voice, swallowing hard and forcing a calm polite stranger\'s expression to alter his voice, soft amber lamplight reflecting in his eyes, 35mm film texture, intimate close-up, vertical framing, no text.'
  },
  {
    name: 'scene-03.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-03.png'),
    prompt: 'Vertical 9:16 emotional narrative scene. Side profile of the same young man holding the black telephone receiver with white knuckles, looking out at the dark wet London street below, struggling to hold back silent tears while pretending to be an indifferent roommate, delicate warm indoor shadows, atmospheric dust motes, rich 1970s film grain, vertical framing, no text.'
  },
  {
    name: 'scene-04.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-04.png'),
    prompt: 'Vertical 9:16 cinematic narrative scene. Hours later in the deep night, 2:00 AM. The apartment living room is darker, lit only by a streetlamp outside through the rain-spattered glass. The same young man sits with his head in his hands on the sofa as the telephone on the table suddenly rings again loudly in the silence, poignant tension, 35mm film grain, vertical framing, no text.'
  },
  {
    name: 'scene-05.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-05.png'),
    prompt: 'Vertical 9:16 cinematic narrative scene. London 1977 wet night. Inside a classic illuminated public telephone box, a beautiful young woman in her mid-20s with wet auburn hair and a beige trench coat holds the silver telephone receiver with both hands, tears glistening on her pale cheeks as rain cascades down the glass panels outside, glowing warm streetlights in the dark background, 35mm film grain, vertical framing, no text.'
  },
  {
    name: 'scene-06.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-06.png'),
    prompt: 'Vertical 9:16 intimate dramatic scene. Close-up inside the rainy telephone box of the same young woman resting her forehead against the glass pane, sobbing softly into the receiver, pouring her wounded heart out believing she is talking to a compassionate stranger who will pass a message, authentic 1970s cinematic framing, gentle amber street reflections, vertical framing, no text.'
  },
  {
    name: 'scene-07.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-07.png'),
    prompt: 'Vertical 9:16 poignant narrative scene. The same young man in his apartment gripping the receiver with both hands against his chest, listening with immense tenderness and heartbreaking empathy, speaking gentle words of comfort into the microphone without revealing his identity, warm lamplight illuminating his tear-stained face, 35mm film texture, vertical framing, no text.'
  },
  {
    name: 'scene-08.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-08.png'),
    prompt: 'Vertical 9:16 emotional climax scene. Cinematic close-up of the same young man whispering the final comforting reassurance into the telephone receiver with closed eyes and a trembling bittersweet smile, softly giving her hope about himself, deep cinematic shadows and warm amber glow, poetic 35mm film grain, vertical framing, no text.'
  },
  {
    name: 'scene-09.png',
    target: join(rootDir, 'public/videos/the-rubettes-baby-i-know-historia-en-los-acordes/scene-09.png'),
    prompt: 'Vertical 9:16 poetic closing metaphor. Outside on a wet London sidewalk at dawn, a lone classic telephone box standing under a warm streetlamp, the black receiver hanging quietly in the silence, rain puddles reflecting golden morning light as the city slowly awakens, contemplative dignified peace, no turntable, no vinyl, 35mm film grain, vertical framing, no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('⚡ Generador de Escenas Flow: The Rubettes - Baby I Know');
  console.log('=====================================================');

  const pending = itemsToGenerate.filter(item => force || !existsSync(item.target));
  console.log(`📋 Total pendientes por generar: ${pending.length}/${itemsToGenerate.length}`);

  if (pending.length === 0) {
    console.log('✨ Todas las imágenes ya están generadas en disco.');
    return;
  }

  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browserContext.pages()[0] || await browserContext.newPage();
  console.log('🌐 Navegando a Google Flow...');
  await page.goto('https://labs.google/fx/es/tools/flow', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Check login
  const url = page.url();
  if (url.includes('accounts.google.com')) {
    console.error('❌ Sesión de Google requerida. Inicia sesión en el perfil de Chrome.');
    await browserContext.close();
    process.exit(1);
  }

  // Dismiss welcome / modal if present
  try {
    const modalClose = page.locator('button').filter({ hasText: /(entendido|cerrar|close|got it|dismiss)/i }).first();
    if (await modalClose.isVisible({ timeout: 2000 })) {
      await modalClose.click();
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  // New project
  console.log('📁 Creando proyecto nuevo...');
  const newProjBtn = page.locator('button.new-project-button, button:has-text("New project"), button:has-text("Proyecto nuevo"), [aria-label*="nuevo" i], [aria-label*="new project" i]').first();
  if (await newProjBtn.isVisible()) {
    await newProjBtn.click();
    await page.waitForTimeout(5000);
  }

  // Configure settings: 9:16 and x1
  const settingsBtn = page.locator('button[aria-label="Botón de configuración"], button.settings-trigger-button').first();
  const settingsText = (await settingsBtn.innerText().catch(() => '')) || '';
  if (!settingsText.includes('9_16') && !settingsText.includes('9:16')) {
    console.log('⚙️  Configurando parámetros 9:16 vertical...');
    try {
      await settingsBtn.click({ timeout: 5000, force: true });
      await page.waitForTimeout(1000);
      const btn916 = page.locator('mat-button-toggle, button').filter({ hasText: '9:16' }).first();
      if (await btn916.isVisible()) await btn916.click();
      await page.waitForTimeout(500);
      const btnX1 = page.locator('mat-button-toggle, button').filter({ hasText: /^x1$/ }).first();
      if (await btnX1.isVisible()) await btnX1.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      console.warn('Configuración omitida:', e.message);
    }
  }

  const knownUrls = new Set(
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('img.image, img[src*="/asb/"], img[src*="flow-content.google"]')).map(i => i.src)
    )
  );

  for (let i = 0; i < itemsToGenerate.length; i++) {
    const item = itemsToGenerate[i];
    if (!force && existsSync(item.target)) {
      console.log(`⏭️  [Ya existe] ${item.name}`);
      continue;
    }

    console.log(`\n-----------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${itemsToGenerate.length}] Generando: ${item.name}`);
    console.log(`📝 Prompt: ${item.prompt.slice(0, 80)}...`);

    mkdirSync(dirname(item.target), { recursive: true });

    // Remove any attached chips if present
    const removeChip = page.locator('button[aria-label*="eliminar" i], button[aria-label*="remove" i], .chip-remove-button').first();
    if (await removeChip.isVisible().catch(() => false)) {
      await removeChip.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const editor = page.locator('.ProseMirror, textarea, [contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible', timeout: 30000 });
    await editor.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(item.prompt, { delay: 5 });
    await page.waitForTimeout(800);

    const generateBtn = page.locator('button[aria-label="Iniciar generación"], button.generate-icon-button, button[aria-label*="generar" i], button[aria-label*="generate" i]').first();
    await generateBtn.click();
    console.log('⏳ Solicitud enviada a Google Flow. Esperando generación...');

    let downloaded = false;
    const startWait = Date.now();
    const timeoutMs = 90000;

    while (Date.now() - startWait < timeoutMs) {
      await page.waitForTimeout(3000);

      const status = await page.evaluate((known) => {
        const imgs = Array.from(document.querySelectorAll('img.image, img[src*="/asb/"], img[src*="flow-content.google"]')).map(i => i.src);
        const newImg = imgs.find(src => !known.includes(src));
        const isLoading = document.querySelectorAll('mat-progress-bar, mat-spinner, .generating, .spinner').length > 0;
        const errorEl = document.querySelector('.mat-mdc-snack-bar-container, .error-message, [role="alert"]');
        const errorText = errorEl ? errorEl.innerText.trim() : null;
        return { newImg, isLoading, count: imgs.length, errorText };
      }, Array.from(knownUrls));

      if (status.errorText) {
        console.warn(`⚠️ Alerta en Google Flow: ${status.errorText}`);
        await page.evaluate(() => {
          document.querySelectorAll('.mat-mdc-snack-bar-container, [role="alert"]').forEach(el => el.remove());
        });
        if (status.errorText.toLowerCase().includes('política') || status.errorText.toLowerCase().includes('policy')) {
          console.error(`❌ La instrucción para ${item.name} fue rechazada por políticas.`);
          break;
        } else {
          if (!status.isLoading && Date.now() - startWait > 10000) {
            console.log('🔄 Reintentando clic en generar tras error transitorio...');
            const genBtn = page.locator('button[aria-label="Iniciar generación"], button.generate-icon-button, button[aria-label*="generar" i], button[aria-label*="generate" i]').first();
            await genBtn.click().catch(() => {});
          }
        }
      }

      if (status.newImg && !status.isLoading) {
        console.log(`✨ ¡Imagen lista detectada! Descargando en alta resolución nativa...`);
        knownUrls.add(status.newImg);

        try {
          let buffer = null;
          try {
            const downloadRes = await browserContext.request.get(status.newImg, { timeout: 60000 });
            if (downloadRes.ok()) {
              buffer = await downloadRes.body();
            }
          } catch (reqErr) {
            console.warn(`Intento 1 falló (${reqErr.message}), probando extracción en memoria vía navegador...`);
          }

          if (!buffer) {
            const base64Data = await page.evaluate(async (imgUrl) => {
              try {
                const res = await fetch(imgUrl);
                const blob = await res.blob();
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              } catch (_) {
                return null;
              }
            }, status.newImg);

            if (base64Data && base64Data.includes('base64,')) {
              buffer = Buffer.from(base64Data.split('base64,')[1], 'base64');
            }
          }

          if (buffer && buffer.length > 50000) {
            writeFileSync(item.target, buffer);
            console.log(`💾 ✅ Guardada con éxito: ${item.name} (${Math.round(buffer.length / 1024)} KB)`);
            downloaded = true;
            break;
          } else {
            console.warn(`⚠️ Buffer insuficiente (${buffer?.length || 0} bytes). Reintentando en el siguiente ciclo...`);
          }
        } catch (downloadErr) {
          console.error(`⚠️ Error al procesar buffer de ${item.name}: ${downloadErr.message}`);
        }
      }
    }

    if (!downloaded) {
      console.error(`❌ Tiempo de espera agotado para generar ${item.name}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log('\n🎉 ¡Proceso de generación con Google Flow finalizado!');
  await browserContext.close();
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
