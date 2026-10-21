import { chromium } from 'playwright';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const REF_LENNON = resolve(process.cwd(), 'references/john-lennon-1966.jpg');
const REF_BEATLES = resolve(process.cwd(), 'references/the-beatles-1967.jpg');
const REF_GATES = resolve(process.cwd(), 'references/strawberry-field-gates.jpg');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/the-beatles-strawberry-fields-forever-acordes-ocultos');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    ref: REF_LENNON,
    refType: 'lennon',
    prompt: 'Vertical 9:16 authentic archival late 1966 photograph of 26-year-old John Lennon matching his exact facial likeness from the attached reference photo (slender build, distinctive aquiline nose, neatly trimmed late-1966 hair with subtle sideburns, wearing iconic circular metal-rimmed round spectacles, dark woolen coat over a knitted sweater), looking thoughtfully into the distance with a wistful melancholic gaze in front of the ornate red Victorian iron gates of Strawberry Field under a soft misty morning light in Liverpool, rich 35mm Kodak film grain, moody cinematic atmosphere, generous negative space top and center for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 authentic 1940s-1950s documentary photograph: The imposing Victorian gothic brick manor of the Salvation Army Strawberry Field children home in Woolton, Liverpool, surrounded by dense leafy overgrown gardens under a grey overcast English afternoon sky, vintage sandstone pillars and ornate iron fence, authentic 35mm archival grainy texture, quiet lower third, no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 intimate 1949 archival portrait: An 8-year-old boy matching young John Lennon childhood features (tousled dark hair, delicate features, thoughtful penetrating melancholic brown eyes, wearing a vintage 1940s English wool schoolboy blazer and short trousers) sitting alone by an open bedroom window at Mendips cottage, gazing quietly toward the distant treetops of Strawberry Field, soft morning light, authentic 35mm grain, quiet lower third, no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 candid 1950s documentary action shot: A young 10-year-old boy (young John Lennon likeness) nimbly climbing over a weathered red brick garden wall draped in ivy, surrounded by lush summer tree branches, caught in a spontaneous moment of youthful adventure and gentle defiance, 35mm vintage black and white film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 poetic 1950s documentary scene: Young John Lennon sitting peacefully against the trunk of a giant ancient oak tree inside the secluded wooded grounds of Strawberry Field, sunlight filtering through green leaves creating soft dapples on the grass, resting with hands behind his head in quiet contemplation, authentic 35mm warm Kodachrome grain, quiet lower third, no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    ref: REF_LENNON,
    refType: 'lennon',
    prompt: 'Vertical 9:16 authentic historical October 1966 documentary photograph in Santa Isabel, Almería, Spain: 26-year-old John Lennon matching his exact historic appearance from the reference photo (military short haircut for the film How I Won The War, circular wire-rimmed spectacles, slender face, wearing a simple open-collar white linen shirt and dark trousers) sitting on a sunlit whitewashed Mediterranean patio, gently fingerpicking a Gibson J-160E acoustic guitar, warm desert sunlight, 35mm Kodak grain, quiet lower third, no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    ref: REF_LENNON,
    refType: 'lennon',
    prompt: 'Vertical 9:16 intimate 1966 candid studio moment: John Lennon in Almería villa room, wearing round wire glasses and a casual cardigan, intently scribbling handwritten lyrics and chord notations onto a yellow legal pad next to a small vintage Philips portable reel-to-reel tape recorder on a rustic wooden table, cigarette smoke softly rising, intense artistic vulnerability, authentic 1966 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    ref: REF_BEATLES,
    refType: 'beatles',
    prompt: 'Vertical 9:16 authentic November 1966 studio photograph inside EMI Studios Abbey Road Studio Two: 24-year-old Paul McCartney (young, slender, clean-shaven, swept dark hair, casual collared shirt) sitting at the cream-colored Mellotron Mark II keyboard playing the iconic opening flute notes, with John Lennon (round spectacles, dark polo neck) leaning attentively over the wooden instrument cabinet listening with wonder, warm analog tungsten studio lamps, 35mm Tri-X grain, quiet lower third, no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 dramatic historical control room scene in Abbey Road Studios in December 1966: Producer George Martin (tall, distinguished gentleman in a crisp suit and tie) and young sound engineer Geoff Emerick at the vintage EMI REDD.51 tube mixing console, using razor blades and editing tape to splice two magnetic master tapes together under warm desk lamps, while John Lennon in circular glasses watches intensely from the background shadows, authentic 35mm grain, quiet lower third, no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    ref: REF_GATES,
    refType: 'gates',
    prompt: 'Vertical 9:16 deeply poetic closing documentary image: The iconic ornate Victorian wrought-iron gates of Strawberry Field matching the exact design and crimson red color from the attached reference photo, set between historic weathered sandstone pillars in Liverpool, soft morning mist swirling through tall autumn trees, golden morning sunlight breaking through the canopy casting long warm rays, fallen russet leaves on the cobblestones, strictly no turntables, strictly no vinyl records, strictly no record players, profound nostalgic peace, timeless documentary aesthetic, 35mm grain, quiet lower third, no text.'
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
    // If on homepage without new button, open the first project
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

  // Function to upload a reference image if needed
  async function uploadReference(imagePath, label) {
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log(`📤 Subiendo fotografía de referencia [${label}]...`);
      const addMediaBtn = page.locator('button[aria-label="Agregar menú de contenido multimedia"], button[aria-label*="contenido multimedia" i], button[aria-label*="media" i]').first();
      if (await addMediaBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await addMediaBtn.click();
        await page.waitForTimeout(1500);

        const uploadOption = page.locator('button:has-text("Subir"), [role=menuitem]:has-text("Subir"), button:has-text("Upload"), [role=menuitem]:has-text("Upload")').first();
        if (await uploadOption.isVisible({ timeout: 4000 }).catch(() => false)) {
          try {
            const [fileChooser] = await Promise.all([
              page.waitForEvent('filechooser', { timeout: 8000 }),
              uploadOption.click()
            ]);
            await fileChooser.setFiles(imagePath);
            console.log(`⏳ Esperando procesamiento de subida para ${label}...`);
            await page.waitForTimeout(6000);
            return true;
          } catch (fcErr) {
            console.warn(`⚠️ Error en filechooser para ${label}: ${fcErr.message}`);
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ No se pudo subir imagen ${label} (${err.message}). Continuando con generación directa por prompt...`);
    } finally {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    return false;
  }

  // Upload initial references upfront if available
  if (existsSync(REF_LENNON)) {
    await uploadReference(REF_LENNON, 'John Lennon 1966');
  }
  if (existsSync(REF_GATES)) {
    await uploadReference(REF_GATES, 'Strawberry Field Gates');
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

    if (item.ref) {
      try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        console.log(`🔗 Adjuntando imagen de referencia [${item.refType}] a la instrucción...`);
        const cardSelector = item.refType === 'gates'
          ? '.media-card img, mat-card img, [alt*="gate" i], [alt*="strawberry" i]'
          : '.media-card img, mat-card img, [alt*="lennon" i], [alt*="beatles" i]';
        const card = page.locator(cardSelector).first();
        if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
          await card.click({ button: 'right', timeout: 4000 });
          await page.waitForTimeout(800);
          const addToPrompt = page.locator('button:has-text("Agregar a la instrucción"), [role=menuitem]:has-text("Agregar a la instrucción"), button:has-text("Add to prompt"), [role=menuitem]:has-text("Add to prompt")').first();
          if (await addToPrompt.isVisible({ timeout: 3000 }).catch(() => false)) {
            await addToPrompt.click();
            await page.waitForTimeout(1000);
          } else {
            await page.keyboard.press('Escape');
          }
        }
      } catch (attachErr) {
        console.warn(`⚠️ No se pudo adjuntar chip de referencia (${attachErr.message}). Continuando con prompt enriquecido...`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    } else {
      // Clear attached chip if any
      const removeChip = page.locator('button[aria-label*="eliminar" i], button[aria-label*="remove" i], .chip-remove-button').first();
      if (await removeChip.isVisible().catch(() => false)) {
        await removeChip.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // Dismiss any overlays and enter prompt text
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
        // Fallback: check if the latest image is not in knownUrls
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
  console.log('✅ Generación visual finalizada para The Beatles - Strawberry Fields Forever');
  console.log('=====================================================');

  await browserContext.close().catch(() => {});
}

main().catch(err => {
  console.error('Fatal error in Google Flow script:', err);
  process.exit(1);
});
