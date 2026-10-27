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
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/cover_bg.png'),
    prompt: 'Vertical 9:16 authentic archival 2006 portrait background: 38-year-old Mexican pop icon Gloria Trevi with voluminous flowing chestnut wavy hair and intense expressive dark eyes, wearing an elegant dark royal velvet corset with subtle gold accents, standing proud and resilient under soft dramatic stage backlighting against a dark velvety magenta background, 35mm film grain, generous negative space at center and bottom for typography, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-01.png'),
    prompt: 'Vertical 9:16 explosive 2006 Latin pop concert atmosphere: Gloria Trevi performing on an arena stage surrounded by glittering purple and magenta concert lights, arms raised wide in empowerment, dramatic backlight cutting through stage haze, silhouetted crowd cheering below, rich 35mm concert film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-02.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-02.png'),
    prompt: 'Vertical 9:16 poignant September 2004 documentary scene: Gloria Trevi (36, pale, natural dark wavy hair, wearing a simple white blouse) walking out through heavy steel gates into daylight, media photographers and flashbulbs in the blurred background, dignified vulnerable expression, authentic 2000s 35mm photojournalism grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-03.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-03.png'),
    prompt: 'Vertical 9:16 intimate 2005 living room scene: A distressed young Mexican man in his early 20s sitting on the edge of a worn sofa with head in his hands, weeping in emotional exhaustion after being cast out by his family, warm domestic lamplight casting long shadows, raw vulnerability, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-04.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-04.png'),
    prompt: 'Vertical 9:16 vibrant 2005 nightclub sanctuary scene: The same young man in a dim underground dance club illuminated by neon violet and amber lights, wearing expressive artistic makeup and a stylish jacket, dancing with closed eyes and head tilted back in pure emotional liberation and defiant joy, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-05.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-05.png'),
    prompt: 'Vertical 9:16 contemplative 2005 airplane interior scene: Gloria Trevi sitting by a commercial airplane window at dusk, gazing out thoughtfully at sunset clouds while writing passionately with a pen in an open spiral notebook on the tray table, soft warm cabin light, emotional empathy, authentic 35mm grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-06.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-06.png'),
    prompt: 'Vertical 9:16 energetic 2006 recording studio session: Gloria Trevi and music producer Armando Ávila collaborating inside a Mexico City recording studio, leaning over a glowing mixing console with vintage synthesizers and monitors, laughing and discovering the driving disco rhythm, warm analog studio ambiance, 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-07.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-07.png'),
    prompt: 'Vertical 9:16 triumphant 2006 arena concert breakthrough: Gloria Trevi on a grand illuminated stage with sweeping royal red cape, singing with passionate power into a chrome microphone as golden confetti falls from the rafters over an ecstatic stadium audience, epic catharsis, rich 35mm film grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-08.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-08.png'),
    prompt: 'Vertical 9:16 moving 2006 cultural celebration scene: A diverse and joyful crowd at an outdoor pride festival in a historic Latin American city plaza, holding colorful rainbow flags and banners high in the golden afternoon sunlight, radiant expressions of unity, dignity, and collective liberation, authentic 35mm documentary grain, quiet lower third, strictly no text.'
  },
  {
    name: 'scene-09.png',
    target: join(rootDir, 'public/videos/gloria-trevi-todos-me-miran-acordes-ocultos/scene-09.png'),
    prompt: 'Vertical 9:16 quiet closing reflection scene: An empty theater dressing room in warm amber penumbra after a massive concert, a lit vanity mirror with soft round bulbs, a pair of glittering gold high-heeled shoes resting beside a folded velvet cape on a dressing table, quiet sacred silence and hard-won triumph, cinematic 35mm film grain, quiet lower third, strictly no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('⚡ Generación de Gloria Trevi (Todos me miran) con Google Flow');
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

    // Polite pause between generations to avoid rate limiting
    await page.waitForTimeout(5000);
  }

  await browserContext.close();
  console.log('\n🎉 ¡Proceso de generación con Google Flow finalizado!');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
