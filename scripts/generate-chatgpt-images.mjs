#!/usr/bin/env node
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultStoryPath = join(rootDir, 'src/data/story.json');
const publicDir = join(rootDir, 'public');
const USER_DATA_DIR = join(os.homedir(), '.config', 'acordes-ocultos', 'chrome-chatgpt-profile');

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
  const scenesList = story.scenes && story.scenes.length > 0 ? story.scenes : (story.assets || []);
  scenesList.forEach((scene, idx) => {
    const sceneNum = String(idx + 1).padStart(2, '0');
    let targetRelPath = `videos/story/scene-${sceneNum}.png`;
    let prompt = '';

    if (typeof scene === 'object' && scene !== null) {
      targetRelPath = scene.asset || scene.src || targetRelPath;
      const assetIdx = typeof scene.assetIndex === 'number' ? scene.assetIndex : idx;
      prompt = scene.prompt || story.assets?.[assetIdx]?.prompt || story.scenes?.[idx]?.prompt || '';
    } else if (typeof scene === 'string') {
      targetRelPath = scene;
      prompt = story.assets?.[idx]?.prompt || story.scenes?.[idx]?.prompt || '';
    }

    list.push({
      id: `scene-${sceneNum}`,
      type: 'scene',
      name: `scene-${sceneNum}.png`,
      targetRelPath,
      targetFullPath: join(publicDir, targetRelPath),
      prompt
    });
  });

  return list;
};

async function generateChatGPTImages() {
  const options = parseArgs();
  console.log('=====================================================');
  console.log('🤖 Generación Automática de Imágenes con ChatGPT');
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
    console.log('\n--- MODO DRY RUN (Plan de Generación con ChatGPT) ---');
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

  console.log(`\n🚀 Iniciando Google Chrome con perfil dedicado para ChatGPT (${pendingItems.length} imágenes pendientes)...`);
  
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
  console.log('🌐 Conectando a ChatGPT (https://chatgpt.com/)...');
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(4000);

  // Check login
  const isLoggedOut = await page.evaluate(() => {
    const url = window.location.href;
    if (url.includes('/auth/login')) return true;
    const loginBtn = document.querySelector('button[data-testid="login-button"], a[href*="/auth/login"]');
    const input = document.querySelector('#prompt-textarea, textarea[data-id], div[contenteditable="true"]');
    return Boolean(loginBtn) && !Boolean(input);
  }).catch(() => false);

  if (isLoggedOut) {
    console.error('❌ La sesión no está iniciada en ChatGPT.');
    console.error('👉 Ejecuta primero: npm run chatgpt:login');
    await browserContext.close();
    process.exit(1);
  }

  // Dismiss any dialogs / popups
  try {
    const dismissBtn = page.locator('button:has-text("Stay logged out"), button:has-text("Continuar"), button:has-text("Aceptar"), [aria-label="Cerrar"], [aria-label="Close"]').first();
    if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
  } catch (_) {}

  // Ensure prompt textarea is available
  const promptInput = page.locator('#prompt-textarea, div[contenteditable="true"], textarea[data-id="root"]').first();
  await promptInput.waitFor({ state: 'visible', timeout: 30000 });

  // Snapshot known images currently on page
  const knownUrls = new Set(await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .map(i => i.src)
      .filter(src => src && (src.includes('oaiusercontent.com') || src.includes('blob:') || src.includes('dalle')));
  }));

  // Process each pending image
  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    console.log(`\n-----------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${pendingItems.length}] Generando con ChatGPT: ${item.name}`);
    console.log(`📝 Prompt: ${item.prompt.slice(0, 95)}...`);

    mkdirSync(dirname(item.targetFullPath), { recursive: true });

    // Format prompt to strictly enforce vertical 9:16 aspect ratio and absence of text
    const fullPrompt = `Crea una imagen fotorrealista con relación de aspecto vertical 9:16 (aspect ratio 9:16, 1080x1920 vertical). Es primordial que NO contenga ningún tipo de texto visible ni letras legibles.\n\nDescripción detallada:\n${item.prompt}`;

    // Dismiss any overlays
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Type prompt into input
    await promptInput.click();
    await page.waitForTimeout(300);

    // Fill the input
    try {
      await promptInput.fill(fullPrompt);
    } catch (_) {
      // Contenteditable fallback
      await page.evaluate((text) => {
        const el = document.querySelector('#prompt-textarea, div[contenteditable="true"]');
        if (el) {
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, fullPrompt);
    }
    await page.waitForTimeout(500);

    // Pre-submit images snapshot
    const preSubmitUrls = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .map(i => i.src)
        .filter(src => src && (src.includes('oaiusercontent.com') || src.includes('blob:') || src.includes('dalle')));
    });

    // Send the prompt
    console.log('⏳ Enviando prompt a ChatGPT...');
    const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Enviar"]').first();
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for generation: either stop button appears and disappears, or assistant finishes responding
    console.log('⏳ Esperando a que culmine la generación de la imagen...');
    
    // Wait for stop-button or generation indicator to finish (up to 180s)
    const startTime = Date.now();
    let imageFoundUrl = null;

    while (Date.now() - startTime < 180000) {
      await page.waitForTimeout(3000);

      // Check if stop-button is currently active
      const isGenerating = await page.locator('button[data-testid="stop-button"]').isVisible().catch(() => false);

      // Check if a new image appeared
      const currentImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          .map(i => i.src)
          .filter(src => src && (src.includes('oaiusercontent.com') || src.includes('blob:') || src.includes('dalle')));
      });

      const newUrls = currentImages.filter(url => !preSubmitUrls.includes(url) && !knownUrls.has(url));

      if (newUrls.length > 0) {
        // We found a new image! Wait until stop-button is gone so it is fully rendered
        if (!isGenerating) {
          imageFoundUrl = newUrls[newUrls.length - 1];
          break;
        }
      }

      // Check for error messages or moderation notices
      const hasError = await page.evaluate(() => {
        const errText = document.body.innerText;
        return errText.includes('There was an error generating') || 
               errText.includes('Hubo un error al generar') ||
               errText.includes('rate limit') ||
               errText.includes('límite de mensajes');
      }).catch(() => false);

      if (hasError) {
        console.warn('⚠️ Se detectó una alerta o error en la interfaz de ChatGPT.');
      }
    }

    if (!imageFoundUrl) {
      // Fallback: look at the last assistant turn
      imageFoundUrl = await page.evaluate(() => {
        const assistantTurns = document.querySelectorAll('div[data-message-author-role="assistant"], article');
        if (assistantTurns.length > 0) {
          const lastTurn = assistantTurns[assistantTurns.length - 1];
          const img = lastTurn.querySelector('img');
          return img ? img.src : null;
        }
        return null;
      });
    }

    if (!imageFoundUrl) {
      console.error(`❌ No se detectó ninguna imagen generada para: ${item.name}`);
      continue;
    }

    console.log('✨ ¡Imagen detectada! Descargando en alta resolución nativa...');
    knownUrls.add(imageFoundUrl);

    // Download image using browser authenticated context to avoid 403 / CORS
    try {
      const base64Data = await page.evaluate(async (imgSrc) => {
        const res = await fetch(imgSrc);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result.split(',')[1]);
            } else {
              reject(new Error('Formato de FileReader inválido'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }, imageFoundUrl);

      const buffer = Buffer.from(base64Data, 'base64');
      writeFileSync(item.targetFullPath, buffer);
      const kb = Math.round(buffer.length / 1024);
      console.log(`💾 ✅ Guardada con éxito: ${item.targetRelPath} (${kb} KB)`);
    } catch (downloadErr) {
      console.error(`⚠️ Error al transferir imagen desde el navegador: ${downloadErr.message}`);
    }

    // Brief pause between requests to prevent rate limiting
    await page.waitForTimeout(4000);
  }

  console.log('\n=====================================================');
  console.log('🎉 ¡Generación con ChatGPT completada!');
  console.log('=====================================================\n');

  await browserContext.close();
}

generateChatGPTImages().catch(err => {
  console.error('❌ Error fatal en generación con ChatGPT:', err);
  process.exit(1);
});
