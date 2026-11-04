import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import readline from 'readline';

const USER_DATA_DIR = path.join(os.homedir(), '.config', 'acordes-ocultos', 'chrome-chatgpt-profile');

async function main() {
  console.log('=====================================================');
  console.log('🔐 ChatGPT — Asistente de Autenticación / Sesión');
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
  console.log('🌐 Navegando a https://chatgpt.com/ ...');
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });

  console.log('\n👉 Si aún no has iniciado sesión:');
  console.log('   Inicia sesión con tu cuenta de OpenAI/ChatGPT en la ventana de Chrome que se ha abierto.');
  console.log('   (El script detectará automáticamente el inicio de sesión cuando entres al chat)\n');

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
  while (!completed) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const url = page.url();
      const hasChatInput = await page.evaluate(() => {
        const input = document.querySelector('#prompt-textarea, textarea[data-id], div[contenteditable="true"]');
        const loginBtn = document.querySelector('button[data-testid="login-button"], a[href*="/auth/login"]');
        return Boolean(input) && !Boolean(loginBtn);
      }).catch(() => false);

      if (hasChatInput && !url.includes('/auth/login')) {
        console.log('\n🎉 ¡Sesión iniciada detectada con éxito!');
        completed = true;
        rl.close();
        break;
      }
    } catch (_) {}
  }

  console.log('💾 Guardando cookies y perfil de sesión...');
  await page.waitForTimeout(2000);
  await browserContext.close();
  console.log('✅ Perfil guardado correctamente. Ya puedes usar `npm run assets:chatgpt`.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error en autenticación:', err);
  process.exit(1);
});
