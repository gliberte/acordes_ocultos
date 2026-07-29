#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
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

const slugify = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const resolveVaultRoot = (customPath) => {
  if (customPath) return resolve(customPath);
  if (process.env.GOOGLE_DRIVE_VAULT_PATH) return resolve(process.env.GOOGLE_DRIVE_VAULT_PATH);

  const home = os.homedir();

  // 1. Detectar cuenta montada en ~/Library/CloudStorage/GoogleDrive-*
  const cloudStorageDir = join(home, 'Library/CloudStorage');
  if (existsSync(cloudStorageDir)) {
    try {
      const entries = readdirSync(cloudStorageDir);
      for (const entry of entries) {
        if (entry.startsWith('GoogleDrive-')) {
          const accountRoot = join(cloudStorageDir, entry);
          const miUnidad = join(accountRoot, 'Mi unidad');
          const myDrive = join(accountRoot, 'My Drive');
          if (existsSync(miUnidad)) {
            return join(miUnidad, 'Acordes Ocultos - Bóveda Maestra');
          }
          if (existsSync(myDrive)) {
            return join(myDrive, 'Acordes Ocultos - Bóveda Maestra');
          }
        }
      }
    } catch (_) {}
  }

  // 2. Comprobar volúmenes tradicionales en /Volumes/GoogleDrive
  if (existsSync('/Volumes/GoogleDrive/Mi unidad')) {
    return '/Volumes/GoogleDrive/Mi unidad/Acordes Ocultos - Bóveda Maestra';
  }
  if (existsSync('/Volumes/GoogleDrive/My Drive')) {
    return '/Volumes/GoogleDrive/My Drive/Acordes Ocultos - Bóveda Maestra';
  }

  // 3. Carpeta estándar en home
  const localMiUnidad = join(home, 'Google Drive/Mi unidad');
  if (existsSync(localMiUnidad)) {
    return join(localMiUnidad, 'Acordes Ocultos - Bóveda Maestra');
  }

  return join(home, 'Google Drive/Acordes Ocultos - Bóveda Maestra');
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    story: null,
    dest: null,
    all: false,
    force: false,
    dryRun: false,
    filter: null,
    limit: null,
    status: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--story') {
      options.story = resolve(args[i + 1]);
      i++;
    } else if (arg === '--dest') {
      options.dest = resolve(args[i + 1]);
      i++;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--filter') {
      options.filter = String(args[i + 1] || '').toLowerCase();
      i++;
    } else if (arg === '--limit' || arg === '--batch') {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--status') {
      options.status = true;
    }
  }

  return options;
};

const copySafe = (source, target, { force = false, dryRun = false } = {}) => {
  if (!existsSync(source)) return { copied: false, skipped: true, reason: 'source_not_found' };

  if (!dryRun) {
    mkdirSync(resolve(target, '..'), { recursive: true });
  }

  const srcStat = statSync(source);
  if (existsSync(target) && !force) {
    const tgtStat = statSync(target);
    if (srcStat.size === tgtStat.size && srcStat.mtimeMs <= tgtStat.mtimeMs) {
      return { copied: false, skipped: true, reason: 'already_up_to_date', bytes: srcStat.size };
    }
  }

  if (!dryRun) {
    copyFileSync(source, target);
  }

  return { copied: true, skipped: false, bytes: srcStat.size };
};

const archiveSingleStory = (storyPath, vaultBaseDir, { force = false, dryRun = false } = {}) => {
  if (!existsSync(storyPath)) {
    console.error(`❌ Archivo de historia no encontrado: ${storyPath}`);
    return null;
  }

  const story = JSON.parse(readFileSync(storyPath, 'utf8'));
  const artistSlug = slugify(story.artist || 'artista');
  const titleSlug = slugify(story.music?.title || story.title || 'tema');
  const episodeFolder = `${artistSlug}-${titleSlug}`;
  const targetDir = join(vaultBaseDir, '01_Episodios_Completados', episodeFolder);

  console.log(`\n=====================================================`);
  console.log(`📦 Archivando en Bóveda: ${story.artist} — "${story.music?.title || story.title}"`);
  console.log(`📁 Destino: ${targetDir}`);
  console.log(`=====================================================`);

  let totalBytes = 0;
  let copiedCount = 0;
  let skippedCount = 0;

  const trackCopy = (name, res) => {
    if (res.copied) {
      copiedCount++;
      totalBytes += res.bytes || 0;
      console.log(`  ✅ [Guardado] ${name} (${Math.round((res.bytes || 0) / 1024)} KB)`);
    } else if (res.skipped && res.reason === 'already_up_to_date') {
      skippedCount++;
      console.log(`  ⏭️  [Al día] ${name}`);
    } else if (res.skipped && res.reason === 'source_not_found') {
      console.log(`  ⚠️  [No encontrado] ${name}`);
    }
  };

  // 1. Guardar story.json y metadatos
  const metaTarget = join(targetDir, 'story.json');
  if (!dryRun) {
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(metaTarget, `${JSON.stringify(story, null, 2)}\n`);
    copiedCount++;
    console.log(`  ✅ [Guardado] story.json`);
  }

  // 2. Localizar carpeta de assets públicos
  const firstAsset = story.assets?.[0]?.src;
  let assetDir = null;
  if (firstAsset) {
    assetDir = resolve(rootDir, 'public', firstAsset, '..');
  }

  // 3. Videos
  const activeStoryFile = join(rootDir, 'src/data/story.json');
  let isActiveStory = false;
  if (existsSync(activeStoryFile)) {
    try {
      const activeData = JSON.parse(readFileSync(activeStoryFile, 'utf8'));
      isActiveStory = activeData.title === story.title && activeData.artist === story.artist;
    } catch (_) {}
  }

  const possibleVideos = [
    {
      name: 'video_reels_90s_master.mp4',
      src: (assetDir && existsSync(join(assetDir, 'story.mp4')))
        ? join(assetDir, 'story.mp4')
        : (isActiveStory ? join(rootDir, 'out/story.mp4') : null)
    },
    {
      name: 'video_tiktok_60s_master.mp4',
      src: (assetDir && existsSync(join(assetDir, 'story_tiktok.mp4')))
        ? join(assetDir, 'story_tiktok.mp4')
        : (isActiveStory ? join(rootDir, 'out/story_tiktok.mp4') : null)
    },
    {
      name: 'video_reels_90s_telegram.mp4',
      src: (assetDir && existsSync(join(assetDir, 'story_90s_tg.mp4')))
        ? join(assetDir, 'story_90s_tg.mp4')
        : (isActiveStory ? join(rootDir, 'out/story_90s_tg.mp4') : null)
    },
    {
      name: 'video_tiktok_60s_telegram.mp4',
      src: (assetDir && existsSync(join(assetDir, 'story_tiktok_tg.mp4')))
        ? join(assetDir, 'story_tiktok_tg.mp4')
        : (isActiveStory ? join(rootDir, 'out/story_tiktok_tg.mp4') : null)
    }
  ];

  for (const item of possibleVideos) {
    if (!item.src) continue;
    const res = copySafe(item.src, join(targetDir, item.name), { force, dryRun });
    trackCopy(item.name, res);
  }

  // 4. Portada y Teaser
  const possibleStills = [
    {
      name: 'cover.png',
      src: (assetDir && existsSync(join(assetDir, 'cover.png')))
        ? join(assetDir, 'cover.png')
        : (isActiveStory ? join(rootDir, 'out/cover.png') : null)
    },
    {
      name: 'story_teaser.png',
      src: (assetDir && existsSync(join(assetDir, 'story_teaser.png')))
        ? join(assetDir, 'story_teaser.png')
        : (isActiveStory ? join(rootDir, 'out/story_teaser.png') : null)
    },
    {
      name: 'cover_bg.png',
      src: (assetDir && existsSync(join(assetDir, 'cover_bg.png')))
        ? join(assetDir, 'cover_bg.png')
        : null
    }
  ];

  for (const item of possibleStills) {
    if (!item.src) continue;
    const res = copySafe(item.src, join(targetDir, item.name), { force, dryRun });
    trackCopy(item.name, res);
  }

  // 5. Escenas visuales (scene-01 a scene-09)
  if (assetDir && existsSync(assetDir)) {
    const files = readdirSync(assetDir);
    const scenes = files.filter(f => /^scene-\d+\.(png|jpg|jpeg|webp)$/i.test(f));
    for (const sceneFile of scenes) {
      const src = join(assetDir, sceneFile);
      const res = copySafe(src, join(targetDir, 'escenas', sceneFile), { force, dryRun });
      trackCopy(`escenas/${sceneFile}`, res);
    }

    // Audios
    const audios = files.filter(f => /audio.*\.(mp3|wav|m4a|aac)$/i.test(f));
    for (const audioFile of audios) {
      const src = join(assetDir, audioFile);
      const res = copySafe(src, join(targetDir, 'audio', audioFile), { force, dryRun });
      trackCopy(`audio/${audioFile}`, res);
    }
  }

  // 6. Copys y producción
  const packageSlug = slugify(story.title);
  const copyCandidates = [
    join(rootDir, 'out/copys.md'),
    join(rootDir, 'out/production-package', `${artistSlug}-${titleSlug}-copys.md`),
    join(rootDir, 'out/production-package', `${packageSlug}-copys.md`),
    join(rootDir, 'out/production-package/copys.md'),
    join(assetDir, 'copys.md')
  ];

  for (const copySrc of copyCandidates) {
    if (existsSync(copySrc)) {
      const res = copySafe(copySrc, join(targetDir, 'copys.md'), { force, dryRun });
      trackCopy('copys.md', res);

      const networksDir = join(vaultBaseDir, '04_Copys_Redes');
      if (existsSync(networksDir)) {
        copySafe(copySrc, join(networksDir, `${episodeFolder}-copys.txt`), { force, dryRun });
      }
      break;
    }
  }

  // 7. Substack
  const articleCandidates = [
    join(rootDir, 'articles', `${artistSlug}-${titleSlug}`),
    join(rootDir, 'articles', titleSlug),
    join(rootDir, 'articles', artistSlug)
  ];

  for (const cand of articleCandidates) {
    if (existsSync(cand) && existsSync(join(cand, 'article.md'))) {
      const artRes = copySafe(join(cand, 'article.md'), join(targetDir, 'substack/article.md'), { force, dryRun });
      trackCopy('substack/article.md', artRes);

      if (existsSync(join(cand, 'lectura_movil.html'))) {
        const htmlRes = copySafe(join(cand, 'lectura_movil.html'), join(targetDir, 'substack/lectura_movil.html'), { force, dryRun });
        trackCopy('substack/lectura_movil.html', htmlRes);
      }

      const imgDir = join(cand, 'images');
      if (existsSync(imgDir)) {
        const imgFiles = readdirSync(imgDir);
        for (const imgFile of imgFiles) {
          const res = copySafe(join(imgDir, imgFile), join(targetDir, 'substack/images', imgFile), { force, dryRun });
          trackCopy(`substack/images/${imgFile}`, res);
        }
      }
      break;
    }
  }

  console.log(`\n📊 Resumen de Bóveda para ${episodeFolder}:`);
  console.log(`   Archivos archivados: ${copiedCount} | Omitidos al día: ${skippedCount}`);
  console.log(`   Volumen copiado: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  return { episodeFolder, copiedCount, skippedCount, totalBytes };
};

const main = () => {
  const options = parseArgs();
  const vaultBaseDir = resolveVaultRoot(options.dest);

  console.log('🏛️  =====================================================');
  console.log('🏛️  ACORDES OCULTOS — BÓVEDA MAESTRA (GOOGLE DRIVE 4 TB)');
  console.log('🏛️  =====================================================');
  console.log(`📍 Ruta de Bóveda: ${vaultBaseDir}`);

  if (options.dryRun) {
    console.log('🔍 MODO DRY-RUN: No se escribirán archivos en disco.\n');
  } else {
    mkdirSync(vaultBaseDir, { recursive: true });
  }

  const completedDir = join(vaultBaseDir, '01_Episodios_Completados');
  const alreadyArchived = existsSync(completedDir)
    ? readdirSync(completedDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    : [];

  const generatedDir = join(rootDir, 'src/data/generated');
  const allJsonFiles = readdirSync(generatedDir).filter(f => f.endsWith('.json') && !f.includes('-tiktok'));

  if (options.status) {
    console.log('\n📊 ESTADO DE LA BÓVEDA MAESTRA (GOOGLE DRIVE):');
    console.log(`   ✅ Episodios ya respaldados: ${alreadyArchived.length}`);
    alreadyArchived.forEach((name, i) => console.log(`      ${i + 1}. ${name}`));

    const pending = allJsonFiles.filter(file => {
      try {
        const s = JSON.parse(readFileSync(join(generatedDir, file), 'utf8'));
        const folder = `${slugify(s.artist || 'artista')}-${slugify(s.music?.title || s.title || 'tema')}`;
        return !alreadyArchived.includes(folder);
      } catch (_) {
        return false;
      }
    });

    console.log(`\n   ⏳ Historias pendientes de respaldar: ${pending.length}`);
    if (pending.length > 0) {
      console.log(`      Primeras pendientes: ${pending.slice(0, 8).map(f => f.replace('.json', '')).join(', ')}...`);
    }
    console.log('\n👉 Para respaldar un lote, ejecuta:');
    console.log('   npm run backup:vault -- --limit 5');
    console.log('👉 O para respaldar un artista en particular:');
    console.log('   npm run backup:vault -- --filter beatles');
    return;
  }

  if (options.all || options.filter || options.limit) {
    let files = allJsonFiles;
    if (options.filter) {
      files = files.filter(f => f.toLowerCase().includes(options.filter));
      console.log(`\n🔍 Filtrando por "${options.filter}": ${files.length} historias encontradas.`);
    }

    if (!options.force) {
      files = files.filter(file => {
        try {
          const s = JSON.parse(readFileSync(join(generatedDir, file), 'utf8'));
          const folder = `${slugify(s.artist || 'artista')}-${slugify(s.music?.title || s.title || 'tema')}`;
          return !alreadyArchived.includes(folder);
        } catch (_) {
          return true;
        }
      });
      console.log(`🎯 Historias no archivadas aún en la bóveda: ${files.length}`);
    }

    if (options.limit && options.limit > 0) {
      files = files.slice(0, options.limit);
      console.log(`⚡ Procesando lote limitado a ${files.length} historias...`);
    }

    if (files.length === 0) {
      console.log('✨ Todas las historias seleccionadas ya están respaldadas en la Bóveda.');
      return;
    }

    let totalAllBytes = 0;
    let archivedCount = 0;
    for (const file of files) {
      const storyPath = join(generatedDir, file);
      const res = archiveSingleStory(storyPath, vaultBaseDir, options);
      if (res) {
        totalAllBytes += res.totalBytes || 0;
        archivedCount++;
      }
    }
    console.log(`\n🏁 Sincronización del lote finalizada: ${archivedCount} historias procesadas. Volumen: ${(totalAllBytes / (1024 * 1024)).toFixed(2)} MB.`);
  } else {
    let targetStory = options.story;
    if (!targetStory) {
      targetStory = join(rootDir, 'src/data/story.json');
    }
    archiveSingleStory(targetStory, vaultBaseDir, options);
  }
};

main();
