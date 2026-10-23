import { chromium } from 'playwright';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/the-grass-roots-midnight-confessions-acordes-ocultos');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    prompt: 'Vertical 9:16 cinematic portrait background: The four members of American 1968 pop-rock band The Grass Roots (frontman Rob Grill in center, guitarist Creed Bratton with late 60s sideburns, Warren Entner, Rick Coonce) in mod 1960s clothes standing together under warm Hollywood studio lights, 35mm film grain, quiet lower third, dark upper half for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    prompt: 'Vertical 9:16 candid 1968 recording studio still: Close-up of hands playing a sunburst 1960s Fender Precision bass with tortoise pickguard next to a polished brass trumpet on a stand, warm amber tungsten studio lighting, 35mm analog Kodachrome grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    prompt: 'Vertical 9:16 authentic 1968 portrait: The four young members of American rock group The Grass Roots (frontman Rob Grill, guitarist Creed Bratton with brown parted hair and sideburns, Warren Entner, Rick Coonce) in mod 1960s clothing standing together in Los Angeles, looking slightly awkward and unfulfilled, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    prompt: 'Vertical 9:16 1966 Hollywood music industry office: A sharp record executive behind a heavy wooden desk smoking a cigarette, surrounded by gold records on wood-paneled walls, reviewing contracts with young long-haired musicians, capturing corporate control over rock music, authentic 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    prompt: 'Vertical 9:16 intimate 1968 portrait: A young Creed Bratton (age 25, slender build, intense eyes, stylish late 60s collar shirt) sitting on an amplifier with his electric guitar unplugged in a dimly lit backstage room, looking frustrated and contemplative, warm vintage 35mm film aesthetic, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    prompt: 'Vertical 9:16 authentic 1968 tracking session at United Western Recorders in Hollywood: The legendary session collective The Wrecking Crew (drummer Hal Blaine, bassist Carol Kaye, organist) playing intently around microphones while producer Steve Barri listens behind the mixing console, 35mm documentary photography, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    prompt: 'Vertical 9:16 television studio set in 1968: The Grass Roots performing on a brightly lit TV variety stage with colorful pop art backdrop and screaming teenage girls in the front row, band members miming along to playback with bright stage lights, vintage color broadcast aesthetic, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    prompt: 'Vertical 9:16 dramatic 1969 concert photography at Fillmore West: Chaotic psychedelic stage with liquid light projections swirling in red and purple behind a wild-eyed young Creed Bratton on the edge of the stage, guitar set aside in mid-performance frenzy, high drama and counterculture intensity, 35mm Tri-X grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    prompt: 'Vertical 9:16 cinematic 2000s office documentary portrait: An older Creed Bratton in a modest corporate office setting (reminiscent of Dunder Mifflin), wearing a beige collared shirt and subtle eccentric smile, holding a vintage acoustic guitar next to his desk, warm fluorescent office lighting, sharp 35mm portraiture, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    prompt: 'Vertical 9:16 poetic fine-art documentary photograph: An empty 1960s Hollywood recording studio control room at night, moonlight slanting through high acoustic glass onto an old analog mixing console, headphones resting on a stool beside a single muted microphone, strictly no turntables, strictly no vinyl records, profound stillness, quiet lower third, strictly no text.'
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
  console.log('✅ Generación visual finalizada para The Grass Roots - Midnight Confessions');
  console.log('=====================================================');

  await browserContext.close().catch(() => {});
}

main().catch(err => {
  console.error('Fatal error in Google Flow script:', err);
  process.exit(1);
});
