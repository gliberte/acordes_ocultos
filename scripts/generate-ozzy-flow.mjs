import { chromium } from 'playwright';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const REF_OZZY = resolve(process.cwd(), 'references/ozzy-osbourne.jpg');
const REF_LEMMY = resolve(process.cwd(), 'references/lemmy-kilmister.jpg');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/ozzy-osbourne-mama-im-coming-home-acordes-ocultos');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    ref: REF_OZZY,
    refType: 'ozzy',
    prompt: 'Vertical 9:16 authentic archival 1991 documentary portrait of 42-year-old rock singer Ozzy Osbourne matching his exact facial likeness from the attached reference photo (slender build, distinctive aquiline nose, shoulder-length straight dark brown hair, wearing circular wire-rimmed dark sunglasses, a vintage black velvet jacket over a dark shirt, with delicate silver crosses on his neck), looking pensively towards the distance with solemn emotional vulnerability in a dim backstage dressing room under warm amber lamps, rich 35mm film grain, moody cinematic atmosphere, generous negative space top and center for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 authentic 1989 British police station archival photograph: A gloomy police holding cell in Amersham England, bare grey stone walls, heavy iron barred door, dim overhead fluorescent light casting long dramatic shadows, a disoriented man matching Ozzy Osbourne likeness sitting with head buried in trembling hands on a wooden cot, 35mm documentary grain, quiet lower third, no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    ref: REF_OZZY,
    refType: 'ozzy',
    prompt: 'Vertical 9:16 candid 1982 archival photograph: Young Sharon Osbourne (petite British woman with stylish 1980s voluminous auburn-tinted hair, sharp determined gaze, wearing an elegant dark blazer) tenderly supporting a fatigued Ozzy Osbourne in a hotel lobby, capturing her protective, caring and managerial presence, authentic 35mm warm Kodachrome grain, quiet lower third, no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 dramatic 1989 nighttime interior documentary atmosphere: An opulent English countryside manor living room in Buckinghamshire at night, heavy velvet curtains, scattered overturned glasses on an antique rug, dark moody shadows, atmospheric cinematic tension representing the tragic domestic blackout before the sirens arrived, 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    ref: REF_OZZY,
    refType: 'ozzy',
    prompt: 'Vertical 9:16 emotional 1989 archival moment: Sharon Osbourne sitting in a quiet solicitor office room, dignified and firm expression with tearful yet resolute eyes, holding paperwork, as Ozzy Osbourne in dark clothes kneels in profound remorse and grief beside her, soft overcast window light, 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    ref: REF_OZZY,
    refType: 'ozzy',
    prompt: 'Vertical 9:16 authentic 1991 documentary studio photograph: 42-year-old Ozzy Osbourne looking clean, refreshed and sober (long clean dark hair, wearing round wire-rimmed glasses, simple dark long-sleeve tee) standing in front of a studio acoustic divider at A&M Studios in Los Angeles, looking determined with handwritten notebooks in hand, warm studio lights, 35mm Tri-X grain, quiet lower third, no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 candid 1991 recording studio moment: Young guitarist Zakk Wylde (24 years old, athletic build, long blond wavy hair, denim vest) sitting on a stool fingerpicking an acoustic 12-string guitar, while Ozzy Osbourne in round spectacles sits thoughtfully on a studio couch listening intensely with closed eyes, warm tungsten studio lamps, 35mm grain, quiet lower third, no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    ref: REF_LEMMY,
    refType: 'lemmy',
    prompt: 'Vertical 9:16 authentic 1991 documentary scene in Los Angeles: Legendary rock icon Lemmy Kilmister of Motörhead matching the exact facial likeness from the attached reference photo (imposing rugged look, iconic mutton chops and mustache, black cowboy hat with cavalry insignia, black shirt) typing intently on a vintage portable manual typewriter at a wooden desk with a notebook and cigarette, authentic 35mm archival film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    ref: REF_OZZY,
    refType: 'ozzy',
    prompt: 'Vertical 9:16 intense vocal recording session: Ozzy Osbourne singing with profound raw emotion and closed eyes directly into a high-end vintage Neumann U87 condenser microphone in the recording booth, headphones on, hands clutching the microphone stand, emotional tears glistening on his cheeks, warm golden studio backlighting, 35mm Kodak grain, quiet lower third, no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    ref: REF_OZZY,
    refType: 'ozzy',
    prompt: 'Vertical 9:16 deeply poetic closing documentary image: Sharon Osbourne and Ozzy Osbourne embracing tenderly in quiet silhouette backstage in 1992, warm amber stage lights glowing softly from the wings in the background, a moment of profound forgiveness, healing and mutual devotion, strictly no turntables, strictly no vinyl records, strictly no record players, timeless documentary aesthetic, 35mm grain, quiet lower third, no text.'
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
  if (existsSync(REF_OZZY)) {
    await uploadReference(REF_OZZY, 'Ozzy Osbourne');
  }
  if (existsSync(REF_LEMMY)) {
    await uploadReference(REF_LEMMY, 'Lemmy Kilmister');
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
        const cardSelector = item.refType === 'lemmy'
          ? '.media-card img, mat-card img, [alt*="lemmy" i], [alt*="motorhead" i]'
          : '.media-card img, mat-card img, [alt*="ozzy" i], [alt*="sharon" i]';
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
  console.log('✅ Generación visual finalizada para Ozzy Osbourne - Mama, I\'m Coming Home');
  console.log('=====================================================');

  await browserContext.close().catch(() => {});
}

main().catch(err => {
  console.error('Fatal error in Google Flow script:', err);
  process.exit(1);
});
