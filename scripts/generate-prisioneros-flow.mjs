import { chromium } from 'playwright';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/los-prisioneros-el-baile-de-los-que-sobran-forjados-en-el-barro');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    prompt: 'Vertical 9:16 cinematic portrait background: Three Chilean young rock musicians in 1986 (frontman Jorge González in center with dark leather jacket and intense rebellious gaze, guitarist Claudio Narea and drummer Miguel Tapia beside him) standing against a textured concrete wall under warm dramatic stage lighting, high-contrast 35mm grain, dark upper half for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    prompt: 'Vertical 9:16 authentic 1986 Santiago de Chile documentary scene: Close-up of an old vintage portable Casio CZ-101 synthesizer resting on a modest wooden table next to an acoustic guitar with worn lacquer, warm golden afternoon light coming through a dusty window in a working-class house, quiet lower third, rich 35mm grain, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    prompt: 'Vertical 9:16 candid 1979 documentary photograph in San Miguel, Santiago: Three Chilean teenage schoolboys (Jorge González age 15 with dark short hair and intense gaze, Claudio Narea, Miguel Tapia) in grey public high school uniform jackets walking along the dusty sidewalk of Gran Avenida near old brick factories, 35mm Tri-X film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    prompt: 'Vertical 9:16 intimate 1980 garage rehearsal scene: Three Chilean teenage boys making music with extreme improvised gear in a modest shed; drummer Miguel Tapia tapping on cardboard boxes and an old metal pot, guitarist Claudio Narea fingerpicking an acoustic guitar with knotted nylon strings, Jorge singing with raw passion, warm tungsten bulb, 35mm Kodachrome grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    prompt: 'Vertical 9:16 atmospheric nocturnal street photograph in Santiago 1983: Empty wet asphalt avenue under strict military curfew, cold blue streetlamps, distant silhouettes of a military jeep patrol with headlights cutting through urban mist, heavy shadow and suspense, quiet lower third, authentic 35mm grain, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    prompt: 'Vertical 9:16 authentic 1983 portrait of Chilean rock trio Los Prisioneros: Jorge González (18, lean, dark straight hair, leather biker jacket), Claudio Narea and Miguel Tapia leaning against a cracked urban concrete wall spray-painted with fading political slogans, defiant and serious expressions, high-contrast 35mm black and white photography, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    prompt: 'Vertical 9:16 poignant 1985 documentary photograph: A group of young Chilean working-class graduates in cheap suits sitting on a stone curb at a dusty street corner, staring into the distance with melancholic and frustrated expressions, kicking loose stones, late autumn overcast sky, evocative 35mm documentary realism, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    prompt: 'Vertical 9:16 intimate 1986 home recording session: Frontman Jorge González (21, dark hair, simple t-shirt) seated on a bed in a small cluttered bedroom in San Miguel, leaning over a 4-track cassette recorder and pressing keys on a compact synthesizer while a mixed-breed dog sleeps curled on a rug nearby, warm lamp light, 35mm analog grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    prompt: 'Vertical 9:16 epic 1986 concert documentary: Los Prisioneros performing live on a crowded gymnasium stage, Jorge González singing passionately into the microphone with clenched fist, thousands of passionate young Latin American fans in cheap jackets raising their arms and singing along under warm stage spotlights and haze, electric communal energy, authentic 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    prompt: 'Vertical 9:16 poetic fine-art documentary photograph: An empty public school courtyard at dusk in autumn, yellow fallen leaves scattered across cracked concrete basketball court, rusted soccer goalposts, tall wrought-iron gates open to the quiet street under a soft violet and amber twilight sky, strictly no turntables, strictly no vinyl records, profound quietness, quiet lower third, strictly no text.'
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
  console.log('✅ Generación visual finalizada para Los Prisioneros - Forjados en el Barro');
  console.log('=====================================================');

  await browserContext.close().catch(() => {});
}

main().catch(err => {
  console.error('Fatal error in Google Flow script:', err);
  process.exit(1);
});
