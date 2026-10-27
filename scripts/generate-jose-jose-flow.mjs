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
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/cover_bg.png'),
    prompt: 'Vertical 9:16 authentic archival documentary portrait background: Iconic Mexican singer José José, El Príncipe de la Canción, in 1978 (age 30). Handsome Mexican man with refined facial features, expressive sensitive dark brown eyes, styled 1970s layered dark hair, wearing an elegant tailored cream-beige vintage suit with silk tie. Standing on a dimly lit theater stage under a soft warm golden spotlight against a rich vintage sepia and dark burgundy background, gentle 35mm film grain, generous negative space at center and bottom for typography, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-01.png'),
    prompt: 'Vertical 9:16 authentic 1965 archival documentary scene: A slender 17-year-old young Mexican musician, young José Rómulo Sosa (José José), with youthful sensitive face and neat dark hair combed back, wearing a modest pressed white shirt and dark trousers, playing an upright wooden double bass (contrabajo) under a vintage streetlamp at night in the humble neighborhood of Clavería, Mexico City. Gentle warm lamplight, nostalgic cobblestone street, 1960s 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-02.png'),
    prompt: 'Vertical 9:16 legendary 1970 concert performance: 22-year-old Mexican singer José José singing El Triste on the grand stage of the Teatro Ferrocarrilero in Mexico City, wearing an iconic formal vintage black tuxedo with bow tie, singing with open chest and profound emotional intensity into a classic chrome microphone, while the orchestra plays behind him and spectators in the front row throw white carnations and flowers onto the stage, dramatic theatrical spotlights, authentic 1970 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-03.png'),
    prompt: 'Vertical 9:16 elegant 1975 television variety studio performance: Charismatic 27-year-old José José with stylish 70s side-parted dark hair, impeccably tailored light grey suit, holding a stage microphone with grace and romantic poise, singing with gentle smile under studio stage lights, capturing his status as El Príncipe de la Canción, warm vintage broadcast lighting, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-04.png'),
    prompt: 'Vertical 9:16 intimate 1978 music salon scene: José José (30, dark hair, casual collared shirt) sitting beside young composer Juan Gabriel (28, expressive Mexican artist) at an acoustic grand piano in a warm living room, sharing a moment of creative brotherhood over handwritten sheet music for Lo Pasado Pasado, warm table lamps, nostalgic amber glow, authentic late-1970s 35mm candid photojournalism grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-05.png'),
    prompt: 'Vertical 9:16 triumphant 1983 concert hall triumph: 35-year-old José José in an elegant black dinner jacket with satin lapels, standing center stage at a sold-out prestigious auditorium like Madison Square Garden, arms outstretched receiving a thundering standing ovation from thousands of cheering audience members, dramatic concert spotlights and subtle stage haze, capturing the peak of his album Secretos, authentic 1983 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-06.png'),
    prompt: 'Vertical 9:16 poignant 1993 candid documentary scene: 45-year-old José José with mature tired facial features and weary gaze, sitting in the passenger seat of an old parked sedan on a rainy Mexico City street at midnight, wearing an unbuttoned dark jacket, reflecting on his struggles and vulnerability, neon city lights and raindrops blurred on the windshield, cinematic 35mm grain, moody dramatic lighting, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-07.png'),
    prompt: 'Vertical 9:16 emotional 1996 comeback concert: A mature 48-year-old José José with dignified silver-touched temples, wearing an impeccably tailored navy blue suit, standing tall on the stage of the Auditorio Nacional, placing his hand gratefully over his heart as he smiles through tears at his loving public, warm golden stage illumination, authentic 1990s 35mm concert grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-08.png'),
    prompt: 'Vertical 9:16 historic 2019 national farewell ceremony: Inside the magnificent art deco marble lobby of the Palacio de Bellas Artes in Mexico City, a solemn golden ceremonial tribute surrounded by thousands of white roses, carnations, and Mexican flags, honor guards standing at attention while grieving citizens pay their heartfelt respects, dignified monumental atmosphere, soft warm ambient light, 35mm documentary grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(rootDir, 'public/videos/jose-jose-lo-pasado-pasado-catedrales-de-leyenda/scene-09.png'),
    prompt: 'Vertical 9:16 quiet closing poetic reflection scene: An empty theater stage in deep atmospheric twilight, a single vintage chrome microphone on a brass stand illuminated by a soft ethereal cyan and warm amber spotlight beam from above, with hundreds of delicate white carnation flower petals scattered across the dark polished wooden stage floor, profound serene beauty and eternal musical legacy, strictly no turntable, strictly no vinyl record, cinematic 35mm film grain, quiet lower third, strictly no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('⚡ Generación de José José (Catedrales de Leyenda) con Google Flow');
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
