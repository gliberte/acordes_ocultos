import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import readline from 'readline';

const USER_DATA_DIR = path.join(os.homedir(), '.config', 'acordes-ocultos', 'chrome-flow-profile');

async function main() {
  console.log('=====================================================');
  console.log('🔐 Google Flow — Asistente de Autenticación / Sesión');
  console.log('=====================================================');
  console.log(`📁 Directorio de perfil: ${USER_DATA_DIR}\n`);

  console.log('🚀 Abriendo Google Chrome visible...');
  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1366, height: 868 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browserContext.pages()[0] || await browserContext.newPage();
  console.log('🌐 Navegando a https://flow.google.com/ ...');
  await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded' });

  console.log('\n👉 Si aún no has iniciado sesión:');
  console.log('   Inicia sesión con tu cuenta de Google en la ventana de Chrome que se ha abierto.');
  console.log('   (El script detectará automáticamente el inicio de sesión cuando ingreses al estudio)\n');

  // Set up manual Enter listener
  let completed = false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('   (O presiona [ENTER] aquí cuando hayas terminado de iniciar sesión)\n', () => {
    completed = true;
    rl.close();
  });

  // Polling loop for automatic login detection
  const startTime = Date.now();
  while (!completed) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const url = page.url();
      // Check if URL is inside Google Flow workspace or labs.google
      const isWorkspace = (
        url.includes('labs.google/fx') || 
        (url.includes('flow.google.com') && !url.includes('/about') && url !== 'https://flow.google.com/') ||
        url.includes('/tools/flow') ||
        url.includes('accounts.google.com/CheckCookie')
      );

      // Check if logged in by looking for avatar or profile indicator
      const hasUserMenu = await page.evaluate(() => {
        const avatars = document.querySelectorAll('img[src*="googleusercontent.com"], a[href*="SignOutOptions"], button[aria-label*="Google Account"], button[aria-label*="Cuenta de Google"]');
        return avatars.length > 0;
      }).catch(() => false);

      if ((isWorkspace || hasUserMenu) && !url.includes('accounts.google.com/v3/signin') && !url.includes('accounts.google.com/signin')) {
        console.log(`\n🎉 ¡Inicio de sesión detectado exitosamente! URL: ${url}`);
        completed = true;
        break;
      }
    } catch (e) {
      // Ignore navigation errors while user is logging in
    }

    // Timeout safety after 10 minutes
    if (Date.now() - startTime > 10 * 60 * 1000) {
      console.log('⏳ Tiempo de espera agotado (10 min).');
      break;
    }
  }

  const finalUrl = page.url();
  console.log(`\n✅ URL actual confirmada: ${finalUrl}`);

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'out/flow-auth-success.png' });
  console.log('📸 Captura guardada en out/flow-auth-success.png');

  console.log('💾 Guardando perfil de Chrome...');
  await browserContext.close();
  console.log('✨ ¡Sesión configurada y guardada con éxito!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error en autenticación:', err);
  process.exit(1);
});
