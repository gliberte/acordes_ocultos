import { chromium } from 'playwright';
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USER_DATA_DIR = resolve(process.env.HOME, '.config/acordes-ocultos/chrome-flow-profile');
const REF_ARETHA = resolve(process.cwd(), 'references/aretha-franklin-1968.jpg');
const REF_OTIS = resolve(process.cwd(), 'references/otis-redding-1967.jpg');
const TARGET_DIR = resolve(process.cwd(), 'public/videos/aretha-franklin-respect-acordes-ocultos');

const itemsToGenerate = [
  {
    name: 'cover_bg.png',
    target: join(TARGET_DIR, 'cover_bg.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 authentic archival 1967 photograph matching the exact facial features and iconic bouffant hairstyle of 25-year-old Aretha Franklin from the attached reference photo (striking African American queen of soul with regal posture, expressive dark almond eyes, wearing an elegant dark 1960s dress with subtle gold hoop earrings), seated proudly at a black grand piano in Atlantic Studios New York, hands resting on the keys, warm amber tungsten studio lighting, rich 35mm Kodak film grain, generous negative space top and center for typography, strictly no text.'
  },
  {
    name: 'scene-01.png',
    target: join(TARGET_DIR, 'scene-01.png'),
    ref: REF_OTIS,
    refType: 'otis',
    prompt: 'Vertical 9:16 authentic 1965 documentary photograph at Stax Records studio in Memphis: Soul singer Otis Redding matching the facial features of the attached reference photo (tall imposing African American man in his mid-20s, short natural hair, wearing a dark polo shirt and slacks) singing passionately into a vintage RCA ribbon microphone, brass section visible in background, warm analog studio lights, authentic 35mm Tri-X film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-02.png',
    target: join(TARGET_DIR, 'scene-02.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 intimate 1966 candid portrait: 24-year-old Aretha Franklin matching her exact facial features from the attached reference photo (expressive deep brown eyes conveying silent exhaustion and quiet pain, 1960s styled hair, dark cardigan over a simple blouse) sitting near a rain-streaked apartment window in Detroit in evening light, tense domestic atmosphere, subtle shadow, 35mm archival aesthetic, quiet lower third, no text.'
  },
  {
    name: 'scene-03.png',
    target: join(TARGET_DIR, 'scene-03.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 candid 1967 scene in Detroit apartment living room: Aretha Franklin matching her exact facial features from the attached reference photo sitting at an upright wooden piano, accompanied by her two sisters Erma and Carolyn Franklin leaning over the piano with handwritten notepads, laughing and improvising vocal harmonies together under a warm table lamp, authentic 1960s 35mm grain, quiet lower third, no text.'
  },
  {
    name: 'scene-04.png',
    target: join(TARGET_DIR, 'scene-04.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 close-up rehearsal moment: The three Franklin sisters (Aretha matching her authentic reference likeness, Erma, and Carolyn) singing closely around a vintage microphone in harmony, animated joyful expressions as they invent their call-and-response backing vocals, handwritten sheet with capital letters R-E-S-P-E-C-T visible on piano ledge, 35mm film grain, quiet lower third, no text.'
  },
  {
    name: 'scene-05.png',
    target: join(TARGET_DIR, 'scene-05.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 dramatic historical studio scene on Valentine Day 1967 at Atlantic Studios New York: Aretha Franklin matching her authentic likeness from the attached reference photo (24 years old, magnificent bouffant hair, wearing a sleek 1960s shift dress) seated at the studio grand piano singing with ferocious dignity and blazing intensity into a Neumann U67 condenser microphone, producer Jerry Wexler watching through the glass booth, 35mm Kodak Tri-X grain, quiet lower third, no text.'
  },
  {
    name: 'scene-06.png',
    target: join(TARGET_DIR, 'scene-06.png'),
    ref: null,
    refType: null,
    prompt: 'Vertical 9:16 dynamic studio action: Legendary tenor saxophonist King Curtis playing a fiery solo leaning back passionately in Atlantic Studios, while the Muscle Shoals rhythm section (drummer, bassist) play locked in groove in the background under warm yellow studio spotlights, tobacco haze in the air, 35mm archival documentary aesthetic, quiet lower third, no text.'
  },
  {
    name: 'scene-07.png',
    target: join(TARGET_DIR, 'scene-07.png'),
    ref: REF_OTIS,
    refType: 'otis',
    prompt: 'Vertical 9:16 iconic concert moment at Monterey Pop Festival June 1967: Otis Redding matching the attached reference photo, wearing a shimmering teal suit on the sunlit festival stage holding the microphone, smiling with warm gracious humor as he addresses the enormous outdoor counterculture audience, bright California light, authentic 1967 festival 35mm grain, quiet lower third, no text.'
  },
  {
    name: 'scene-08.png',
    target: join(TARGET_DIR, 'scene-08.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 powerful 1967 documentary moment: Aretha Franklin matching her authentic reference likeness walking proudly alongside civil rights leaders during an outdoor rally in Detroit, surrounded by peaceful demonstrators holding placards demanding equality and human dignity, afternoon sun catching her face with fearless serene strength, 35mm documentary photography, quiet lower third, no text.'
  },
  {
    name: 'scene-09.png',
    target: join(TARGET_DIR, 'scene-09.png'),
    ref: REF_ARETHA,
    refType: 'aretha',
    prompt: 'Vertical 9:16 deeply poetic closing documentary image: Aretha Franklin matching her authentic likeness in a moment of quiet solitary reflection seated at a grand piano on an empty concert stage under a single warm golden spotlight, looking up serenely with her hands folded gently, strictly no turntables, strictly no vinyl records, profound peace, timeless soul aesthetic, 35mm grain, quiet lower third, no text.'
  }
];

async function main() {
  console.log('=====================================================');
  console.log('👑 Generación: Aretha Franklin - Respect con Google Flow');
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

  // Upload initial references upfront
  if (existsSync(REF_ARETHA)) {
    await uploadReference(REF_ARETHA, 'Aretha Franklin 1967-1968');
  }
  if (existsSync(REF_OTIS)) {
    await uploadReference(REF_OTIS, 'Otis Redding 1967');
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
        const cardSelector = item.refType === 'otis'
          ? '.media-card img, mat-card img, [alt*="otis" i], [alt*="redding" i]'
          : '.media-card img, mat-card img, [alt*="aretha" i], [alt*="franklin" i]';
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
  console.log('✅ Generación visual finalizada para Aretha Franklin - Respect');
  console.log('=====================================================');

  await browserContext.close().catch(() => {});
}

main().catch(err => {
  console.error('Fatal error in Google Flow script:', err);
  process.exit(1);
});
