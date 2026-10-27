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
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/cover_bg.png'),
    prompt: 'Vertical 9:16 authentic archival 1997 portrait background: 22-year-old Australian singer Natalie Imbruglia with her iconic 1997 cropped pixie haircut and vulnerable expressive eyes, wearing her famous oversized slate-blue hoodie, standing contemplative in an airy London minimalist apartment with soft natural daylight streaming through tall windows, rich 35mm film grain, generous negative space at center and bottom for typography, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-01.png'),
    prompt: 'Vertical 9:16 iconic 1997 music video atmosphere: Natalie Imbruglia (22, cropped layered pixie haircut, hazel eyes, wearing an oversized slate-blue hoodie and loose cargo trousers) singing with heartfelt emotion in the minimalist studio apartment set with moveable blue and beige walls, soft diffused 1990s MTV lighting, cinematic 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-02.png'),
    prompt: 'Vertical 9:16 archival late-1990s record store scene: Wooden racks in a bustling 1997 music shop displaying stacks of CD singles and the debut album Left of the Middle, glossy promotional posters of Natalie Imbruglia on the brick wall, warm ambient shop lighting, authentic 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-03.png'),
    prompt: 'Vertical 9:16 intimate 1991 London songwriting session: Songwriter Anne Preven (brunette, 20s, casual flannel shirt) and guitarist Scott Cutler sitting by an upright piano in a modest West Hampstead home studio under warm lamp light, acoustic guitar resting against a chair, spiral lyric notebook open on the piano stand, reflective late-night atmosphere, authentic 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-04.png'),
    prompt: 'Vertical 9:16 archival 1993 recording studio scene: Danish blonde singer Lis Sørensen standing before a vintage Neumann studio condenser microphone with large black headphones in a Copenhagen recording studio, singing the Danish version Brændt, warm wooden acoustic panels in the background, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-05.png'),
    prompt: 'Vertical 9:16 gritty 1995 alternative rock concert: Frontwoman Anne Preven and her grunge band Ednaswap performing on a dim, smoky club stage in Los Angeles, singing with raw intensity into a chrome microphone while wielding an electric guitar, battered Marshall amps and guitar cables on the wooden floor, dramatic backlight and amber stage lamps, 1990s 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-06.png'),
    prompt: 'Vertical 9:16 bright 1997 London recording studio session: Young Australian singer Natalie Imbruglia with cropped pixie haircut and British producer Phil Thornalley leaning over a large vintage analog mixing desk, acoustic guitars and reel-to-reel tape machines in the sunlit background, smiling with creative revelation, warm analog 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-07.png'),
    prompt: 'Vertical 9:16 melancholic 1998 road tour scene: An old beat-up touring van parked outside a dimly lit American dive bar at night under a glowing red and blue neon sign, indie rock band musicians unloading battered amplifier flight cases onto wet asphalt under misty streetlight, poignant contrast between underground struggle and mainstream radio, rich 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-08.png'),
    prompt: 'Vertical 9:16 intimate 1998 American roadside diner: Songwriter Anne Preven sitting alone in a red vinyl booth late at night holding a mug of black coffee, gazing up pensively at a small television mounted on the wall showing Natalie Imbruglia in Torn on MTV, bittersweet reflective expression, glowing neon light reflecting on wet diner window, authentic 1990s 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(rootDir, 'public/videos/natalie-imbruglia-torn-acordes-ocultos/scene-09.png'),
    prompt: 'Vertical 9:16 atmospheric closing scene: An empty backstage dressing room of a 1990s indie music venue in warm amber penumbra, a lone vintage acoustic guitar resting on a wooden stool, a soft beam of golden dusk light cutting through misty shadows, cinematic 35mm film grain, quiet lower third, no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('⚡ Generación de Natalie Imbruglia (Torn) con Google Flow');
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

    await page.waitForTimeout(4000);
  }

  await browserContext.close();
  console.log('\n🎉 ¡Proceso de generación con Google Flow finalizado!');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
