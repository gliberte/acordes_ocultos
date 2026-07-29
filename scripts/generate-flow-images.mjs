#!/usr/bin/env node
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultStoryPath = join(rootDir, 'src/data/story.json');
const publicDir = join(rootDir, 'public');
const USER_DATA_DIR = join(os.homedir(), '.config', 'acordes-ocultos', 'chrome-flow-profile');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    story: defaultStoryPath,
    force: false,
    dryRun: false,
    headless: false,
    index: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--story') {
      options.story = resolve(args[i + 1]);
      i++;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--index') {
      options.index = args[i + 1];
      i++;
    }
  }

  return options;
};

const buildGenerationList = (story) => {
  const list = [];
  
  // 1. Cover background
  const coverSrc = story.coverBg || (story.assets?.[0]?.src ? story.assets[0].src.replace(/scene-.*$/, 'cover_bg.png') : 'videos/story/cover_bg.png');
  const coverPrompt = story.coverPrompt || 
    `Vertical 9:16 portrait of ${story.artist}, cinematic archival photograph, high contrast, textured 35mm film grain, warm moody lighting, atmospheric studio or concert background related to ${story.title}, vertical 9:16 framing.`;
  
  list.push({
    id: 'cover',
    type: 'cover',
    name: 'cover_bg.png',
    targetRelPath: coverSrc,
    targetFullPath: join(publicDir, coverSrc),
    prompt: coverPrompt
  });

  // 2. Scenes 01 - 09
  (story.assets || []).forEach((asset, idx) => {
    const sceneNum = String(idx + 1).padStart(2, '0');
    const targetRelPath = asset.src || `videos/story/scene-${sceneNum}.png`;
    list.push({
      id: `scene-${sceneNum}`,
      type: 'scene',
      name: `scene-${sceneNum}.png`,
      targetRelPath,
      targetFullPath: join(publicDir, targetRelPath),
      prompt: asset.prompt
    });
  });

  return list;
};

async function generateFlowImages() {
  const options = parseArgs();
  console.log('=====================================================');
  console.log('🌊 Generación Automática de Imágenes con Google Flow');
  console.log('=====================================================');
  console.log(`📄 Archivo de historia: ${options.story}`);

  if (!existsSync(options.story)) {
    console.error(`❌ No existe el archivo de historia: ${options.story}`);
    process.exit(1);
  }

  const story = JSON.parse(readFileSync(options.story, 'utf8'));
  let items = buildGenerationList(story);

  if (options.index !== null) {
    if (options.index === 'cover') {
      items = items.filter(i => i.id === 'cover');
    } else {
      const idxNum = String(parseInt(options.index, 10)).padStart(2, '0');
      items = items.filter(i => i.id === `scene-${idxNum}`);
    }
  }

  console.log(`🎯 Elementos en cola: ${items.length}`);

  // Check existing files
  const pendingItems = [];
  for (const item of items) {
    const exists = existsSync(item.targetFullPath);
    if (exists && !options.force) {
      console.log(`⏭️  [Omitido] Ya existe: ${item.targetRelPath} (usa --force para sobreescribir)`);
    } else {
      pendingItems.push(item);
    }
  }

  if (options.dryRun) {
    console.log('\n--- MODO DRY RUN (Plan de Generación) ---');
    pendingItems.forEach((item, i) => {
      console.log(`\n[${i + 1}/${pendingItems.length}] ${item.name} -> ${item.targetRelPath}`);
      console.log(`   Prompt: ${item.prompt}`);
    });
    console.log('\n✅ Dry run finalizado.');
    return;
  }

  if (pendingItems.length === 0) {
    console.log('\n✨ Todas las imágenes ya están generadas y listas en disco.');
    return;
  }

  console.log(`\n🚀 Iniciando Google Chrome con perfil dedicado (${pendingItems.length} imágenes pendientes)...`);
  
  // Cleanup stale locks
  for (const lock of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    const lockPath = join(USER_DATA_DIR, lock);
    if (existsSync(lockPath)) {
      try { unlinkSync(lockPath); } catch (e) {}
    }
  }

  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: options.headless,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browserContext.pages()[0] || await browserContext.newPage();
  console.log('🌐 Conectando a Google Flow...');
  await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(4000);

  // Check login
  const url = page.url();
  if (url.includes('/about') || url.includes('accounts.google.com')) {
    console.error('❌ La sesión no está iniciada en Google Flow.');
    console.error('👉 Ejecuta primero: npm run flow:login');
    await browserContext.close();
    process.exit(1);
  }

  // Close promo banner if present
  const closeBanner = page.locator('button:has-text("close"), [aria-label="Cerrar"], button.close').first();
  if (await closeBanner.isVisible().catch(() => false)) {
    console.log('Cerrando banner promocional...');
    await closeBanner.click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Click on "Proyecto nuevo" / "New project"
  console.log('📁 Creando proyecto nuevo para la historia...');
  const newProjBtn = page.locator('button.new-project-button, button:has-text("New project"), button:has-text("Proyecto nuevo"), [aria-label*="nuevo" i], [aria-label*="new project" i]').first();
  if (await newProjBtn.isVisible()) {
    await newProjBtn.click();
  } else {
    await page.click('button.new-project-button, button:has-text("New project"), button:has-text("Proyecto nuevo")').catch(() => {});
  }
  await page.waitForTimeout(5000);

  // Configure settings: 9:16 and x1 (only if not already 9:16)
  const settingsBtn = page.locator('button[aria-label="Botón de configuración"], button.settings-trigger-button').first();
  const settingsText = (await settingsBtn.innerText().catch(() => '')) || '';
  if (settingsText.includes('9_16') || settingsText.includes('9:16')) {
    console.log('✅ Orientación 9:16 vertical ya está activa en Google Flow.');
  } else if (await settingsBtn.isVisible()) {
    console.log('⚙️  Configurando parámetros (Orientación 9:16 vertical, x1 imagen)...');
    try {
      await settingsBtn.click({ timeout: 5000, force: true });
      await page.waitForTimeout(1000);

      // Set 9:16
      const btn916 = page.locator('mat-button-toggle, button').filter({ hasText: '9:16' }).first();
      if (await btn916.isVisible()) {
        await btn916.click();
      }
      await page.waitForTimeout(500);

      // Set x1
      const btnX1 = page.locator('mat-button-toggle, button').filter({ hasText: /^x1$/ }).first();
      if (await btnX1.isVisible()) {
        await btnX1.click();
      }
      await page.waitForTimeout(500);

      // Close settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      console.warn('Configuración de settings omitida o no requerida:', e.message);
    }
  }

  // Collect already existing image URLs in this project (if any)
  const knownUrls = new Set(await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img.image, img[src*="/asb/"]')).map(i => i.src);
  }));

  // Process each pending image
  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    console.log(`\n-----------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${pendingItems.length}] Generando: ${item.name}`);
    console.log(`📝 Prompt: ${item.prompt.slice(0, 90)}...`);

    // Ensure parent directory exists
    mkdirSync(dirname(item.targetFullPath), { recursive: true });

    // Focus editor and fill prompt cleanly
    const editor = page.locator('.ProseMirror').first();
    await editor.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(item.prompt, { delay: 5 });
    await page.waitForTimeout(800);

    // Click generate button
    const generateBtn = page.locator('button[aria-label="Iniciar generación"], button.generate-icon-button').first();
    await generateBtn.click();
    console.log('⏳ Solicitud enviada. Esperando a que culmine la generación...');

    // Wait for new image to appear and loading to finish
    let downloaded = false;
    const startWait = Date.now();
    const timeoutMs = 90000; // 90s max per image

    while (Date.now() - startWait < timeoutMs) {
      await page.waitForTimeout(2500);

      const status = await page.evaluate((known) => {
        const imgs = Array.from(document.querySelectorAll('img.image, img[src*="/asb/"]')).map(i => i.src);
        const newImg = imgs.find(src => !known.includes(src));
        const isLoading = document.querySelectorAll('mat-progress-bar, mat-spinner, .generating, .spinner').length > 0;
        const errorEl = document.querySelector('.mat-mdc-snack-bar-container, .error-message, [role="alert"]');
        const errorText = errorEl ? errorEl.innerText.trim() : null;
        return { newImg, isLoading, count: imgs.length, errorText };
      }, Array.from(knownUrls));

      if (status.errorText) {
        console.warn(`⚠️ Alerta en Google Flow: ${status.errorText}`);
        if (status.errorText.toLowerCase().includes('alta demanda') || status.errorText.toLowerCase().includes('más tarde') || status.errorText.toLowerCase().includes('high demand')) {
          console.log(`⏳ Flow con alta demanda momentánea. Esperando 12 segundos para reintentar...`);
          await page.waitForTimeout(12000);
          await generateBtn.click().catch(() => {});
          continue;
        }
        if (status.errorText.toLowerCase().includes('política') || status.errorText.toLowerCase().includes('policy')) {
          console.error(`❌ La instrucción para ${item.name} fue rechazada por políticas de Google Flow.`);
          break;
        }
      }

      if (status.newImg && !status.isLoading) {
        console.log(`✨ ¡Imagen lista detectada! Descargando en alta resolución nativa...`);
        knownUrls.add(status.newImg);

        // Convert URL to direct download '=d'
        const baseSrc = status.newImg.replace(/=s\d+.*$|=w\d+.*$|=d$/, '');
        const directDownloadUrl = `${baseSrc}=d`;

        try {
          const downloadRes = await browserContext.request.get(directDownloadUrl);
          if (downloadRes.ok()) {
            const buffer = await downloadRes.body();
            writeFileSync(item.targetFullPath, buffer);
            console.log(`💾 ✅ Guardada con éxito: ${item.targetRelPath} (${Math.round(buffer.length / 1024)} KB)`);
            downloaded = true;
            break;
          } else {
            console.log(`⚠️ Descarga directa devolvió ${downloadRes.status()}, intentando URL original...`);
            const fallbackRes = await browserContext.request.get(status.newImg);
            if (fallbackRes.ok()) {
              const buffer = await fallbackRes.body();
              writeFileSync(item.targetFullPath, buffer);
              console.log(`💾 ✅ Guardada con éxito (fallback): ${item.targetRelPath} (${Math.round(buffer.length / 1024)} KB)`);
              downloaded = true;
              break;
            }
          }
        } catch (downloadErr) {
          console.error(`❌ Error al descargar imagen:`, downloadErr.message);
        }
      }
    }

    if (!downloaded) {
      console.warn(`⚠️  Tiempo de espera excedido o fallo para ${item.name}.`);
    }

    // Short pause between generations
    await page.waitForTimeout(2500);
  }

  console.log('\n=====================================================');
  console.log('🎉 ¡Generación completada!');
  console.log('=====================================================\n');

  await page.waitForTimeout(2000);
  await browserContext.close();
}

generateFlowImages().catch((err) => {
  console.error('❌ Error fatal en generación con Google Flow:', err);
  process.exit(1);
});
