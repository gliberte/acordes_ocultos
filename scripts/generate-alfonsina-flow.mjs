import { chromium } from 'playwright';
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const REF_ALFONSINA = resolve(process.cwd(), 'references/alfonsina-storni-archival-b.jpg');
const REF_ALFONSINA_MAR = resolve(process.cwd(), 'references/alfonsina-storni-mar-del-plata.jpg');
const REF_MERCEDES = resolve(process.cwd(), 'references/mercedes-sosa-ariel-ramirez-1969.jpg');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/mercedes-sosa-alfonsina-y-el-mar-acordes-ocultos');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    ref: REF_ALFONSINA_MAR,
    refType: 'alfonsina',
    prompt: 'Vertical 9:16 authentic archival 1938 photograph matching the exact facial features, cloche hat, and dark 1930s overcoat of Argentine poet Alfonsina Storni from the attached reference photo, standing thoughtfully on the stormy Mar del Plata promenade looking out towards the dark Atlantic ocean, misty sea spray, cold atmospheric dusk lighting, authentic 1930s 35mm film grain, generous negative space at top and center for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    ref: REF_ALFONSINA_MAR,
    refType: 'alfonsina',
    prompt: 'Vertical 9:16 historical documentary scene: October 1938 in Mar del Plata Argentina. 46-year-old poet Alfonsina Storni matching her authentic historical facial likeness, dark 1930s overcoat and cloche hat from the reference photo, walking slowly down the wet coastal promenade of Rambla Bristol at 2:00 AM under cold rain and heavy sea mist, streetlamps reflecting on wet pavement, cinematic 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    ref: REF_ALFONSINA,
    refType: 'alfonsina_close',
    prompt: 'Vertical 9:16 intimate historical portrait: Close-up of 46-year-old Alfonsina Storni matching her exact facial features from the attached historical portrait (gentle dignified expression, wavy hair with signature forehead curl, expressive almond eyes carrying quiet pain, wearing a dark 1930s woolen dress), seated near a tall window looking thoughtfully into the distance, soft diffused natural daylight, authentic 1930s documentary grain, quiet lower third, no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    ref: REF_ALFONSINA,
    refType: 'alfonsina_close',
    prompt: 'Vertical 9:16 poignant 1938 interior: In a modest dimly lit boarding room on 3 de Febrero street in Mar del Plata, Alfonsina Storni matching her authentic facial likeness sits at a small wooden desk under a warm lamp, writing with a fountain pen onto lined notebook paper with trembling hands, tear-stained envelope addressed to her beloved son Alejandro, 35mm archival aesthetic, quiet lower third, no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 cinematic 1938 moment: A close medium shot of a gloved female hand dropping a sealed vintage white postal envelope addressed to Diario La Nacion Buenos Aires into a classic red metal street mailbox on a windy Mar del Plata street corner at dusk, dead leaves blowing on wet cobblestones, 1930s documentary atmosphere, 35mm grain, quiet lower third, no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 dramatic historical scene: Nighttime at the wooden pier of Club Argentino de Mujeres at La Perla beach in Mar del Plata, 1938. The turbulent dark Atlantic ocean waves crashing with white foam against the wet wooden pilings and dark rocks under a moonlit sky, mist and sea spray in the air, evocative solitary atmosphere, 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 solemn historical aftermath: Dawn over La Perla beach in Mar del Plata, October 25 1938. Two local fishermen in vintage heavy jackets standing solemnly on the wet sand looking towards the quiet shoreline where gentle waves roll in under pale gray morning sky, profound silence, mournful dignity, 35mm archival photography aesthetic, quiet lower third, no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 authentic 1969 creative studio scene: Renowned Argentine composer Ariel Ramírez (wearing eyeglasses, white dress shirt and dark tie) seated at a grand piano playing the arpeggio chords, while writer and historian Félix Luna leans over the piano reading handwritten lyric manuscripts of "Alfonsina y el mar", warm Buenos Aires studio tungsten lighting, rich 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 iconic 1969 recording studio photograph: Legendary Argentine singer Mercedes Sosa (wearing dark sweater, dark hair tied back, expressive indigenous facial features, eyes gently closed in deep emotion) singing in front of a vintage Neumann condenser microphone, Ariel Ramírez visible at the grand piano in the background, warm Buenos Aires studio glow, authentic 1969 35mm documentary grain, quiet lower third, no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 poetic reflective closing metaphor: Twilight over the vast Atlantic ocean at Mar del Plata beach, gentle waves washing over soft golden sand, sea foam dissolving into the shoreline under a serene dusk sky with faint stars, distant warm lighthouse beacon sweeping across the horizon, strictly no turntables, strictly no vinyl records, deep peace and spiritual infinity, authentic 35mm grain, quiet lower third, no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('🌊 Generación: Alfonsina y el Mar con Google Flow');
  console.log('=====================================================');

  mkdirSync(TARGET_DIR, { recursive: true });

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

  // Create new project
  console.log('📁 Creando proyecto nuevo en Google Flow...');
  const newProjBtn = page.locator('button.new-project-button, button:has-text("New project"), button:has-text("Proyecto nuevo"), [aria-label*="nuevo" i]').first();
  if (await newProjBtn.isVisible().catch(() => false)) {
    await newProjBtn.click();
    await page.waitForTimeout(5000);
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
      console.log(`📤 Subiendo fotografía de referencia [${label}]...`);
      const addMediaBtn = page.locator('button[aria-label="Agregar menú de contenido multimedia"], button[aria-label*="contenido multimedia" i], button[aria-label*="media" i]').first();
      if (await addMediaBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await addMediaBtn.click();
        await page.waitForTimeout(1500);

        const uploadOption = page.locator('button:has-text("Subir"), [role=menuitem]:has-text("Subir"), button:has-text("Upload"), [role=menuitem]:has-text("Upload")').first();
        if (await uploadOption.isVisible({ timeout: 4000 }).catch(() => false)) {
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 10000 }),
            uploadOption.click()
          ]);
          await fileChooser.setFiles(imagePath);
          console.log(`⏳ Esperando procesamiento de subida para ${label}...`);
          await page.waitForTimeout(6000);
          return true;
        }
      }
    } catch (err) {
      console.warn(`⚠️ No se pudo subir imagen ${label} (${err.message}). Continuando con generación directa por prompt...`);
    }
    return false;
  }

  // Upload initial references
  if (existsSync(REF_ALFONSINA_MAR)) {
    await uploadReference(REF_ALFONSINA_MAR, 'Alfonsina Storni en Mar del Plata');
  }

  // Collect known URLs so far
  const knownUrls = new Set(await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img.image, img[src*="/asb/"], img[src*="flow-content.google"]')).map(i => i.src);
  }));
  console.log(`🖼️ Imágenes iniciales detectadas en proyecto: ${knownUrls.size}`);

  let uploadedMercedes = false;

  for (let i = 0; i < itemsToGenerate.length; i++) {
    const item = itemsToGenerate[i];

    if (existsSync(item.target) && !process.argv.includes('--force')) {
      console.log(`⏭️ [${i + 1}/${itemsToGenerate.length}] Ya existe: ${item.name}, omitiendo...`);
      continue;
    }

    console.log(`\n-----------------------------------------------------`);
    console.log(`🎨 [${i + 1}/${itemsToGenerate.length}] Generando: ${item.name}`);
    console.log(`📝 Prompt: ${item.prompt.slice(0, 95)}...`);

    // Handle reference attachment
    if (item.refType === 'mercedes' && !uploadedMercedes) {
      if (existsSync(REF_MERCEDES)) {
        await uploadReference(REF_MERCEDES, 'Mercedes Sosa & Ariel Ramírez 1969');
        uploadedMercedes = true;
      }
    }

    if (item.ref) {
      console.log(`🔗 Adjuntando imagen de referencia [${item.refType}] a la instrucción...`);
      const card = page.locator('.media-card img, mat-card img, [alt*="alfonsina" i], [alt*="mercedes" i], [alt*="imagen" i], [alt*="usuario" i]').first();
      if (await card.isVisible().catch(() => false)) {
        await card.click({ button: 'right' });
        await page.waitForTimeout(800);
        const addToPrompt = page.locator('button:has-text("Agregar a la instrucción"), [role=menuitem]:has-text("Agregar a la instrucción"), button:has-text("Add to prompt"), [role=menuitem]:has-text("Add to prompt")').first();
        if (await addToPrompt.isVisible().catch(() => false)) {
          await addToPrompt.click();
          await page.waitForTimeout(1000);
        } else {
          await page.keyboard.press('Escape');
        }
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
        if (
          status.errorText.toLowerCase().includes('alta demanda') ||
          status.errorText.toLowerCase().includes('más tarde') ||
          status.errorText.toLowerCase().includes('actividad inusual')
        ) {
          console.log(`⏳ Flow con aviso momentáneo. Limpiando alerta y esperando 15s...`);
          await page.evaluate(() => {
            document.querySelectorAll('.mat-mdc-snack-bar-container, [role="alert"]').forEach(el => el.remove());
          });
          await page.waitForTimeout(15000);
          await generateBtn.click().catch(() => {});
          continue;
        }
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

        const baseSrc = status.newImg.replace(/=s\d+.*$|=w\d+.*$|=d$/, '');
        const directDownloadUrl = `${baseSrc}=d`;

        try {
          const downloadRes = await browserContext.request.get(directDownloadUrl, { timeout: 60000 });
          if (downloadRes.ok()) {
            const buffer = await downloadRes.body();
            writeFileSync(item.target, buffer);
            console.log(`💾 ✅ Guardada con éxito: ${item.name} (${Math.round(buffer.length / 1024)} KB)`);
            downloaded = true;
            break;
          } else {
            const fallbackRes = await browserContext.request.get(status.newImg, { timeout: 60000 });
            if (fallbackRes.ok()) {
              const buffer = await fallbackRes.body();
              writeFileSync(item.target, buffer);
              console.log(`💾 ✅ Guardada con éxito (fallback): ${item.name} (${Math.round(buffer.length / 1024)} KB)`);
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
      console.warn(`⚠️ Tiempo de espera excedido para ${item.name}`);
    }

    // Backoff between generations
    await page.waitForTimeout(5000);
  }

  console.log('\n=====================================================');
  console.log('🎉 ¡Generación de Alfonsina y el Mar completada!');
  console.log('=====================================================\n');

  await page.waitForTimeout(2000);
  await browserContext.close();
}

main().catch((err) => {
  console.error('❌ Error fatal en generación de Alfonsina:', err);
  process.exit(1);
});
