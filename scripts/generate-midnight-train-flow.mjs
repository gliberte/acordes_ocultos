#!/usr/bin/env node
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const USER_DATA_DIR = join(os.homedir(), '.config', 'acordes-ocultos', 'chrome-flow-profile');
const force = process.argv.includes('--force');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/cover_bg.png'),
    prompt: 'Vertical 9:16 authentic archival 1973 documentary portrait background: 29-year-old African American soul queen Gladys Knight with an elegant 1970s rounded afro hairstyle and warm expressive eyes, wearing an exquisite amber-gold silk soul concert gown, standing dignified and soulful under warm stage spotlight against a rich vintage sepia and dark bronze background, 35mm film grain, generous negative space at center and bottom for typography, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-01.png'),
    prompt: 'Vertical 9:16 iconic 1973 television concert performance: Gladys Knight & The Pips performing on a warm-lit television variety stage; Gladys in front singing passionately into a chrome microphone while the three male Pips in matching burgundy three-piece suits perform their famous synchronized arm-pulling choreography behind her, warm studio lighting, authentic 1973 35mm broadcast film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-02.png'),
    prompt: 'Vertical 9:16 intimate 1970 Los Angeles apartment scene: A 23-year-old blonde Farrah Fawcett with natural feathered blonde hair and casual 70s outfit holding a black rotary telephone receiver to her ear, sitting on the edge of a bed beside an open vintage leather suitcase with folded clothes, warm California daylight streaming through the window, authentic 1970 35mm photojournalism grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-03.png'),
    prompt: 'Vertical 9:16 inspired 1970 songwriting session: Young songwriter Jim Weatherly sitting at an upright acoustic piano in a modest Hollywood apartment, holding a pen over a yellow legal notepad filled with handwritten lyrics, a rotary phone on a small side table, warm late-afternoon sunbeams highlighting dust motes, creative epiphany, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-04.png'),
    prompt: 'Vertical 9:16 soulful 1972 Atlanta recording studio: African American soul singer Cissy Houston (38, expressive gospel demeanor, styled hair) standing proudly before a Neumann studio condenser microphone with large black headphones, smiling as she gestures towards the control room sheet music, warm wooden acoustic panels, authentic 1972 35mm studio grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-05.png'),
    prompt: 'Vertical 9:16 dramatic 1973 music industry executive office: Inside a stylish early-1970s Motown Detroit office with gold records on wood-paneled walls, Gladys Knight and The Pips standing firm and dignified across a massive mahogany desk, asserting their independence and creative worth before departing, moody dramatic lighting, authentic 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-06.png'),
    prompt: 'Vertical 9:16 poignant 1973 Los Angeles departure scene: A young African American man carrying a worn duffel bag walking away from a neon-lit Hollywood boulevard at dusk, glancing back with bittersweet acceptance as city streetlights blur in the evening mist, longing for home, rich cinematic 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-07.png'),
    prompt: 'Vertical 9:16 legendary 1973 New York recording session: Gladys Knight at the vocal microphone while producer Tony Camillo watches through the control room glass; in the studio room, The Pips gather closely around a second microphone harmonizing and laughing as they create their famous train-whistle vocal responses, warm amber studio lighting, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-08.png'),
    prompt: 'Vertical 9:16 triumphant 1974 Grammy Awards victory: Gladys Knight & The Pips in glamorous 1970s formal evening wear holding their golden Grammy Award statuettes on a glittering awards stage, beaming with proud tears and joy after defeating industry doubts, theatrical spotlighting, authentic 1974 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(rootDir, 'public/videos/gladys-knight-midnight-train-to-georgia-acordes-ocultos/scene-09.png'),
    prompt: 'Vertical 9:16 quiet closing reflection scene: A peaceful, solitary rural railway station platform in Georgia at dusk, gleaming steel train tracks disappearing into the misty tree-lined southern horizon, warm amber lantern glowing softly on a wooden station post, evening fog and gentle catharsis, cinematic 35mm film grain, quiet lower third, strictly no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('⚡ Generación de Gladys Knight (Midnight Train to Georgia) con Google Flow');
  console.log('=====================================================');

  // Clean locks
  for (const lock of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    const lockPath = join(USER_DATA_DIR, lock);
    if (existsSync(lockPath)) {
      try { unlinkSync(lockPath); } catch (e) {}
    }
  }

  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browserContext.pages()[0] || await browserContext.newPage();
  console.log('🌐 Conectando a Google Flow...');
  await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(5000);

  // Close banners if any
  const closeBanner = page.locator('button:has-text("close"), [aria-label="Cerrar"], button.close').first();
  if (await closeBanner.isVisible().catch(() => false)) {
    await closeBanner.click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // New project or open recent
  console.log('📁 Verificando proyecto en Google Flow...');
  const newProjBtn = page.locator('button.new-project-button, button:has-text("New project"), button:has-text("Proyecto nuevo"), [aria-label*="nuevo" i]').first();
  if (await newProjBtn.isVisible().catch(() => false)) {
    await newProjBtn.click();
    await page.waitForTimeout(5000);
  } else {
    const recentCard = page.locator('.project-card, .project-item, mat-card').first();
    if (await recentCard.isVisible().catch(() => false)) {
      console.log('📂 Abriendo proyecto reciente...');
      await recentCard.click();
      await page.waitForTimeout(4000);
    }
  }

  // Set 9:16 vertical aspect ratio
  const settingsBtn = page.locator('button[aria-label="Botón de configuración"], button[aria-label*="configuración" i], button[aria-label*="settings" i]').first();
  if (await settingsBtn.isVisible().catch(() => false)) {
    const settingsText = (await settingsBtn.innerText().catch(() => '')) || '';
    if (!settingsText.includes('9_16') && !settingsText.includes('9:16')) {
      console.log('⚙️ Configurando relación de aspecto 9:16...');
      await settingsBtn.click();
      await page.waitForTimeout(800);
      const btn916 = page.locator('mat-button-toggle, button').filter({ hasText: '9:16' }).first();
      if (await btn916.isVisible()) await btn916.click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // Collect known URLs
  const knownUrls = new Set(await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img.image, img[src*="/asb/"], img[src*="flow-content.google"]')).map(i => i.src);
  }));
  console.log(`🖼️ Imágenes iniciales detectadas en proyecto: ${knownUrls.size}`);

  for (let i = 0; i < itemsToGenerate.length; i++) {
    const item = itemsToGenerate[i];
    if (!force && existsSync(item.target)) {
      console.log(`⏩ [${i + 1}/${itemsToGenerate.length}] Ya existe: ${item.name}, omitiendo...`);
      continue;
    }

    console.log(`\n-----------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${itemsToGenerate.length}] Generando: ${item.name}`);
    console.log(`📝 Prompt: ${item.prompt.slice(0, 95)}...`);

    // Clear attached images if any
    const removeChip = page.locator('button[aria-label*="eliminar" i], button[aria-label*="remove" i], .chip-remove-button').first();
    if (await removeChip.isVisible().catch(() => false)) {
      await removeChip.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Enter prompt text
    const editor = page.locator('.ProseMirror, textarea, [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(item.prompt, { delay: 6 });
    await page.waitForTimeout(1000);

    // Click generate
    const generateBtn = page.locator('button[aria-label="Iniciar generación"], button.generate-icon-button, button[aria-label*="generar" i], button[aria-label*="generate" i]').first();
    await generateBtn.click();
    console.log('⏳ Solicitud enviada a Google Flow. Esperando generación...');

    // Wait for generation
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
        if (status.errorText.toLowerCase().includes('política') || status.errorText.toLowerCase().includes('policy')) {
          console.error(`❌ La instrucción para ${item.name} fue rechazada por políticas.`);
          await page.evaluate(() => {
            document.querySelectorAll('.mat-mdc-snack-bar-container, [role="alert"]').forEach(el => el.remove());
          });
          break;
        }
      }

      if (status.newImg && !status.isLoading) {
        console.log(`✨ ¡Imagen lista detectada! Descargando en alta resolución nativa...`);
        knownUrls.add(status.newImg);

        try {
          const downloadRes = await browserContext.request.get(status.newImg);
          if (downloadRes.ok()) {
            const buffer = await downloadRes.body();
            mkdirSync(dirname(item.target), { recursive: true });
            writeFileSync(item.target, buffer);
            console.log(`💾 ✅ Guardada con éxito: ${item.name} (${Math.round(buffer.length / 1024)} KB)`);
            downloaded = true;
            break;
          }
        } catch (downloadErr) {
          console.error(`❌ Error al descargar imagen:`, downloadErr.message);
        }
      }
    }

    if (!downloaded) {
      console.warn(`⚠️ Tiempo de espera excedido para ${item.name}`);
    }

    // Polite pause between generations
    await page.waitForTimeout(5000);
  }

  await browserContext.close();
  console.log('\n🎉 ¡Proceso de generación con Google Flow finalizado!');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
