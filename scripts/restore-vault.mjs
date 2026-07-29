#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = join(rootDir, '.env');

const loadEnv = () => {
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadEnv();

const resolveVaultRoot = () => {
  if (process.env.GOOGLE_DRIVE_VAULT_PATH) return resolve(process.env.GOOGLE_DRIVE_VAULT_PATH);
  const home = os.homedir();
  const cloudStorageDir = join(home, 'Library/CloudStorage');
  if (existsSync(cloudStorageDir)) {
    try {
      const entries = readdirSync(cloudStorageDir);
      for (const entry of entries) {
        if (entry.startsWith('GoogleDrive-')) {
          const accountRoot = join(cloudStorageDir, entry);
          const miUnidad = join(accountRoot, 'Mi unidad');
          const myDrive = join(accountRoot, 'My Drive');
          if (existsSync(miUnidad)) return join(miUnidad, 'Acordes Ocultos - Bóveda Maestra');
          if (existsSync(myDrive)) return join(myDrive, 'Acordes Ocultos - Bóveda Maestra');
        }
      }
    } catch (_) {}
  }
  return join(home, 'Google Drive/Acordes Ocultos - Bóveda Maestra');
};

const listVaultEpisodes = (completedDir) => {
  if (!existsSync(completedDir)) return [];
  return readdirSync(completedDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
};

const main = () => {
  const target = process.argv[2];
  const vaultRoot = resolveVaultRoot();
  const completedDir = join(vaultRoot, '01_Episodios_Completados');

  console.log('🏛️  =====================================================');
  console.log('🏛️  ACORDES OCULTOS — RESTAURADOR DE BÓVEDA');
  console.log('🏛️  =====================================================');
  console.log(`📍 Bóveda: ${completedDir}`);

  const available = listVaultEpisodes(completedDir);

  if (!target) {
    console.log('\n📋 Episodios disponibles en tu Google Drive para restaurar:');
    if (available.length === 0) {
      console.log('   (Ningún episodio encontrado en la bóveda aún)');
    } else {
      available.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
      console.log('\n👉 Para restaurar uno, ejecuta:');
      console.log(`   npm run restore:vault -- <nombre-del-episodio>`);
      console.log(`   Ejemplo: npm run restore:vault -- ${available[0] || 'lulu-to-sir-with-love'}`);
    }
    return;
  }

  // Buscar coincidencia exacta o parcial
  const match = available.find(name => name.toLowerCase() === target.toLowerCase() || name.toLowerCase().includes(target.toLowerCase()));

  if (!match) {
    console.error(`\n❌ No se encontró el episodio "${target}" en la bóveda.`);
    console.log('Episodios disponibles:', available.join(', '));
    process.exit(1);
  }

  const episodeDir = join(completedDir, match);
  console.log(`\n🔄 Restaurando episodio: ${match}`);
  console.log(`📁 Desde: ${episodeDir}`);

  const storyJsonPath = join(episodeDir, 'story.json');
  if (!existsSync(storyJsonPath)) {
    console.error(`❌ No se encontró story.json dentro de ${episodeDir}`);
    process.exit(1);
  }

  const story = JSON.parse(readFileSync(storyJsonPath, 'utf8'));

  // 1. Restaurar src/data/story.json
  const activeStoryPath = join(rootDir, 'src/data/story.json');
  writeFileSync(activeStoryPath, `${JSON.stringify(story, null, 2)}\n`);
  console.log(`  ✅ [Restaurado] src/data/story.json (ahora es la historia activa)`);

  // 2. Restaurar public/videos/<slug>
  const firstAsset = story.assets?.[0]?.src;
  const assetRelFolder = firstAsset ? join(firstAsset, '..') : `videos/${match}`;
  const localAssetDir = join(rootDir, 'public', assetRelFolder);
  mkdirSync(localAssetDir, { recursive: true });

  // Escenas
  const escenasDir = join(episodeDir, 'escenas');
  if (existsSync(escenasDir)) {
    for (const f of readdirSync(escenasDir)) {
      copyFileSync(join(escenasDir, f), join(localAssetDir, f));
      console.log(`  ✅ [Restaurado] public/${assetRelFolder}/${f}`);
    }
  }

  // Audios
  const audioDir = join(episodeDir, 'audio');
  if (existsSync(audioDir)) {
    for (const f of readdirSync(audioDir)) {
      copyFileSync(join(audioDir, f), join(localAssetDir, f));
      console.log(`  ✅ [Restaurado] public/${assetRelFolder}/${f}`);
    }
  }

  // Stills directos
  for (const still of ['cover.png', 'story_teaser.png', 'cover_bg.png']) {
    const src = join(episodeDir, still);
    if (existsSync(src)) {
      copyFileSync(src, join(localAssetDir, still));
      console.log(`  ✅ [Restaurado] public/${assetRelFolder}/${still}`);
    }
  }

  // 3. Restaurar videos en out/ si existen
  mkdirSync(join(rootDir, 'out'), { recursive: true });
  const videoMappings = [
    { from: 'video_reels_90s_master.mp4', to: 'out/story.mp4' },
    { from: 'video_tiktok_60s_master.mp4', to: 'out/story_tiktok.mp4' },
    { from: 'video_reels_90s_telegram.mp4', to: 'out/story_90s_tg.mp4' },
    { from: 'video_tiktok_60s_telegram.mp4', to: 'out/story_tiktok_tg.mp4' },
    { from: 'cover.png', to: 'out/cover.png' },
    { from: 'story_teaser.png', to: 'out/story_teaser.png' }
  ];

  for (const item of videoMappings) {
    const src = join(episodeDir, item.from);
    if (existsSync(src)) {
      copyFileSync(src, join(rootDir, item.to));
      console.log(`  ✅ [Restaurado] ${item.to}`);
    }
  }

  console.log(`\n🎉 ¡Episodio "${match}" restaurado completamente en tu espacio de trabajo!`);
  console.log(`👉 Puedes previsualizarlo con: npm run dev`);
  console.log(`👉 O volver a publicarlo con: npm run publish:package`);
};

main();
