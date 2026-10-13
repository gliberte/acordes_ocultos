#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const VAULT_DIR = '/Users/luissolano/Library/CloudStorage/GoogleDrive-luis.solano.l@gmail.com/Mi unidad/Acordes Ocultos - Bóveda Maestra/01_Episodios_Completados';

const EPISODES = [
  'diana-ross-the-supremes-love-child',
  'angelica-maria-a-donde-va-nuestro-amor-catedrales-de-leyenda',
  'mister-loco-religious-man',
  'emilio-jose-nuestra-playa-historia-en-los-acordes',
  'the-rubettes-sugar-baby-love'
];

console.log('🚀 Iniciando re-publicación con enlaces directos de Cloudflare R2 para episodios desde Love Child...\n');

for (const ep of EPISODES) {
  const epDir = join(VAULT_DIR, ep);
  console.log(`\n======================================================`);
  console.log(`📦 Procesando: ${ep}`);
  console.log(`======================================================`);

  if (!existsSync(epDir)) {
    console.error(`❌ Carpeta no encontrada en la Bóveda: ${epDir}`);
    continue;
  }

  const filesMap = [
    { src: join(epDir, 'video_reels_90s_master.mp4'), dest: 'out/story.mp4' },
    { src: join(epDir, 'video_tiktok_60s_master.mp4'), dest: 'out/story_tiktok.mp4' },
    { src: join(epDir, 'cover.png'), dest: 'out/cover.png' },
    { src: join(epDir, 'story_teaser.png'), dest: 'out/story_teaser.png' },
    { src: join(epDir, 'story.json'), dest: 'src/data/story.json' }
  ];

  if (existsSync(join(epDir, 'copys.md'))) {
    filesMap.push({ src: join(epDir, 'copys.md'), dest: 'out/copys.md' });
  }

  for (const { src, dest } of filesMap) {
    if (existsSync(src)) {
      copyFileSync(src, dest);
    } else {
      console.warn(`⚠️ Archivo faltante: ${src}`);
    }
  }

  try {
    console.log(`☁️  Subiendo a Cloudflare R2 y enviando enlaces directos a Telegram...`);
    execSync('node scripts/publish-package.mjs --skip-vault', {
      stdio: 'inherit',
      env: process.env
    });
    console.log(`✅ ${ep} publicado con enlaces directos a Cloudflare R2.`);
  } catch (err) {
    console.error(`❌ Error al publicar ${ep}: ${err.message}`);
  }
}

console.log('\n✨ Proceso de re-publicación finalizado con éxito.');
