import { chromium } from 'playwright';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/denisse-de-kalafe-senora-senora-acordes-ocultos');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    prompt: 'Vertical 9:16 cinematic portrait background: Young Brazilian singer-songwriter Denisse de Kalafe in 1980 with voluminous dark curly permed hair, sitting contemplative at a wooden upright piano under warm afternoon light slanting through a window, 35mm film grain, quiet lower third, dark upper half for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    prompt: 'Vertical 9:16 cinematic close-up: A vintage wooden upright piano keyboard in warm sunlight, with delicate spring flowers resting on the wooden music stand beside sheet music, nostalgic 1980s Kodachrome aesthetic, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    prompt: 'Vertical 9:16 authentic 1980 portrait: Young Brazilian singer-songwriter Denisse de Kalafe in her early 30s, voluminous dark curly permed hair, expressive dark eyes, warm olive complexion, standing by a sunlit window in a modest Mexico City apartment, looking thoughtful and homesick, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    prompt: 'Vertical 9:16 intimate 1980 documentary still: Young Denisse de Kalafe with voluminous dark curls and 1980 blouse, holding a vintage rotary telephone receiver to her ear with emotional nostalgia, sitting near an upright piano, warm domestic amber lighting, 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    prompt: 'Vertical 9:16 candid 1980 creative moment: Denisse de Kalafe sitting at the piano keyboard, unfolding a crumpled brown paper bread bag (bolsa de papel de estraza) and grasping a graphite pencil to write down music notes, afternoon sunlight on the keys, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    prompt: 'Vertical 9:16 macro close-up: Female hands playing an emotional chord on ivory piano keys while a worn brown bakery paper bag filled with handwritten pencil lyrics and musical notes rests on the polished wood, warm dust motes in golden light, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    prompt: 'Vertical 9:16 1980 Mexico City music publisher office: A young Denisse de Kalafe with voluminous dark curls and simple modest blouse, seated across a wooden desk signing publishing contract documents with a pen, vintage desk lamp and papers, authentic 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    prompt: 'Vertical 9:16 emotional documentary scene: A Mexican family living room in 1981, a mother and daughter embracing with genuine tears of joy and love while an old radio on a wooden shelf plays music, warm festive family atmosphere, 35mm Kodachrome aesthetic, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    prompt: 'Vertical 9:16 authentic portrait of mature Denisse de Kalafe: The singer-songwriter in recent years, with natural silver-grey curly shoulder-length hair, radiant warm smile and expressive open hands, standing on a peaceful wooden deck in Holbox overlooking the turquoise Caribbean sea, soft natural breeze, sharp 35mm portraiture, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    prompt: 'Vertical 9:16 poetic fine-art documentary photograph: An empty wooden upright piano resting in serene evening penumbra, a single gentle shaft of amber moonlight illuminating the closed keyboard and a folded brown paper bread bag resting quietly on the bench, strictly no turntables, strictly no vinyl records, profound filial love and stillness, quiet lower third, strictly no text.'
  }
];

async function main() {
  if (!existsSync(TARGET_DIR)) {
    mkdirSync(TARGET_DIR, { recursive: true });
  }

  console.log('🚀 Iniciando Playwright con perfil de Google Flow...');
  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--start-maximized'
    ]
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

  // Create new project or open latest
  console.log('📁 Creando proyecto nuevo en Google Flow...');
  const newProjBtn = page.locator('button.new-project-button, button:has-text("New project"), button:has-text("Proyecto nuevo"), [aria-label*="nuevo" i]').first();
  if (await newProjBtn.isVisible().catch(() => false)) {
    await newProjBtn.click();
    await page.waitForTimeout(5000);
  } else {
    const openProjLink = page.locator('a[aria-label="Abrir proyecto"]').first();
    if (await openProjLink.isVisible().catch(() => false)) {
      console.log('📂 Abriendo proyecto existente...');
      await openProjLink.click();
      await page.waitForTimeout(5000);
    }
  }

  // Set 9:16 vertical aspect ratio
  const settingsBtn = page.locator('button[aria-label="Botón de configuración"], button.settings-trigger-button, button[aria-label*="configuración" i]').first();
  if (await settingsBtn.isVisible().catch(() => false)) {
    const settingsText = (await settingsBtn.innerText().catch(() => '')) || '';
    if (!settingsText.includes('9_16') && !settingsText.includes('9:16')) {
      console.log('⚙️ Configurando relación de aspecto 9:16...');
      try {
        await settingsBtn.click();
        await page.waitForTimeout(800);
        const btn916 = page.locator('mat-button-toggle, button').filter({ hasText: '9:16' }).first();
        if (await btn916.isVisible()) await btn916.click();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } catch (_) {}
    } else {
      console.log('✅ Orientación 9:16 vertical ya activa.');
    }
  }

  // Collect known URLs so far
  const knownUrls = new Set(await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img.image, img[src*="/asb/"], img[src*="flow-content.google"]')).map(i => i.src);
  }));
  console.log(`🖼️ Imágenes iniciales detectadas en proyecto: ${knownUrls.size}`);

  for (let i = 0; i < itemsToGenerate.length; i++) {
    const item = itemsToGenerate[i];

    if (existsSync(item.target) && !process.argv.includes('--force')) {
      console.log(`⏭️ [${i + 1}/${itemsToGenerate.length}] Ya existe: ${item.name}, omitiendo...`);
      continue;
    }

    console.log(`\n-----------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${itemsToGenerate.length}] Generando: ${item.name}`);
    console.log(`📝 Prompt: ${item.prompt.slice(0, 95)}...`);

    // Dismiss any overlays and clear prompt
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const editor = page.locator('.ProseMirror, textarea:not([name*="recaptcha"]), [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(item.prompt, { delay: 5 });
    await page.waitForTimeout(800);

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
        console.warn(`⚠️ Aviso de Flow: ${status.errorText}`);
      }

      if (status.newImg) {
        console.log(`✨ Nueva imagen detectada: ${status.newImg.slice(0, 60)}...`);
        try {
          const resp = await page.request.get(status.newImg);
          const buf = await resp.body();
          writeFileSync(item.target, buf);
          knownUrls.add(status.newImg);
          console.log(`💾 Guardada exitosamente: ${item.target} (${(buf.length / 1024).toFixed(1)} KB)`);
          downloaded = true;
          break;
        } catch (err) {
          console.warn(`⚠️ Error descargando imagen: ${err.message}`);
        }
      }

      if (!status.isLoading && Date.now() - startWait > 15000 && !status.newImg) {
        const latestImg = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img.image, img[src*="/asb/"], img[src*="flow-content.google"]')).map(i => i.src);
          return imgs[imgs.length - 1] || null;
        });
        if (latestImg && !knownUrls.has(latestImg)) {
          const resp = await page.request.get(latestImg);
          const buf = await resp.body();
          writeFileSync(item.target, buf);
          knownUrls.add(latestImg);
          console.log(`💾 Guardada (fallback): ${item.target} (${(buf.length / 1024).toFixed(1)} KB)`);
          downloaded = true;
          break;
        }
      }
    }

    if (!downloaded) {
      console.warn(`❌ No se pudo descargar a tiempo ${item.name}.`);
    }

    await page.waitForTimeout(2000);
  }

  console.log('\n=====================================================');
  console.log('✅ Generación visual finalizada para Denisse de Kalafe - Señora, señora');
  console.log('=====================================================');

  await browserContext.close().catch(() => {});
}

main().catch(err => {
  console.error('Fatal error in Google Flow script:', err);
  process.exit(1);
});
