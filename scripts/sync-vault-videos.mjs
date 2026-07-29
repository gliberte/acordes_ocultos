#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, createWriteStream, renameSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import os from 'node:os';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

// 1. Cargar variables de entorno (.env y web/.env)
const loadEnvFile = (p) => {
  if (!existsSync(p)) return;
  const lines = readFileSync(p, 'utf8').split(/\r?\n/);
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

loadEnvFile(join(rootDir, '.env'));
loadEnvFile(join(rootDir, 'web/.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: No se encontraron credenciales de Supabase en .env o web/.env');
  process.exit(1);
}

// 2. Localizar Bóveda en Google Drive
const resolveVaultRoot = (customPath) => {
  if (customPath) return resolve(customPath);
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

  if (existsSync('/Volumes/GoogleDrive/Mi unidad')) {
    return '/Volumes/GoogleDrive/Mi unidad/Acordes Ocultos - Bóveda Maestra';
  }
  if (existsSync('/Volumes/GoogleDrive/My Drive')) {
    return '/Volumes/GoogleDrive/My Drive/Acordes Ocultos - Bóveda Maestra';
  }

  const localMiUnidad = join(home, 'Google Drive/Mi unidad');
  if (existsSync(localMiUnidad)) return join(localMiUnidad, 'Acordes Ocultos - Bóveda Maestra');

  return join(home, 'Google Drive/Acordes Ocultos - Bóveda Maestra');
};

const slugify = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    dest: null,
    limit: null,
    filter: null,
    concurrency: 3,
    force: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest') {
      options.dest = resolve(args[i + 1]);
      i++;
    } else if (arg === '--limit') {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--filter') {
      options.filter = args[i + 1].toLowerCase();
      i++;
    } else if (arg === '--concurrency') {
      options.concurrency = parseInt(args[i + 1], 10) || 3;
      i++;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
};

// 3. Descarga con streaming seguro y archivo temporal
async function downloadVideo(url, targetPath) {
  const tempPath = `${targetPath}.tmp`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const expectedLength = parseInt(res.headers.get('content-length') || '0', 10);
  const fileStream = createWriteStream(tempPath);

  // Convert Web ReadableStream to Node Readable
  const nodeReadable = Readable.fromWeb(res.body);
  await pipeline(nodeReadable, fileStream);

  const stats = statSync(tempPath);
  if (expectedLength > 0 && stats.size !== expectedLength) {
    unlinkSync(tempPath);
    throw new Error(`Inconsistencia de tamaño: se esperaban ${expectedLength} bytes pero se descargaron ${stats.size}`);
  }

  renameSync(tempPath, targetPath);
  return stats.size;
}

// 4. Ejecutor de tareas concurrentes
async function runConcurrent(tasks, concurrency, workerFn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      const item = tasks[currentIndex];
      try {
        const result = await workerFn(item, currentIndex, tasks.length);
        results[currentIndex] = { success: true, item, result };
      } catch (err) {
        results[currentIndex] = { success: false, item, error: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// 5. Función principal
async function main() {
  const options = parseArgs();
  const vaultRoot = resolveVaultRoot(options.dest);
  const completedDir = join(vaultRoot, '01_Episodios_Completados');

  console.log('🏛️  =============================================================');
  console.log('🏛️  ACORDES OCULTOS — SINCRONIZADOR DE VIDEOS (R2 ➔ GOOGLE DRIVE)');
  console.log('🏛️  =============================================================');
  console.log(`📍 Carpeta Bóveda: ${completedDir}`);
  if (options.dryRun) console.log('🔍 MODO DRY-RUN: No se descargarán archivos.');
  if (options.limit) console.log(`🔢 Límite: ${options.limit} descargas.`);
  if (options.filter) console.log(`🎯 Filtro: "${options.filter}"`);
  console.log(`⚡ Concurrencia: ${options.concurrency} descargas simultáneas.`);

  if (!existsSync(completedDir)) {
    console.error(`❌ Error: No existe la carpeta ${completedDir}`);
    process.exit(1);
  }

  console.log('\n📡 Consultando base de datos en Supabase...');
  const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=id,title,video_url,source_url,created_at&order=created_at.desc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });

  if (!res.ok) {
    console.error(`❌ Error al conectar con Supabase: HTTP ${res.status}`);
    process.exit(1);
  }

  const supabaseRows = await res.json();
  console.log(`✅ ${supabaseRows.length} publicaciones registradas en Supabase.`);

  // Listar carpetas de episodios en Google Drive
  const allFolders = readdirSync(completedDir)
    .filter(f => !f.startsWith('.') && statSync(join(completedDir, f)).isDirectory());

  const queue = [];
  let alreadyHasVideo = 0;
  let noMatch = 0;

  for (const folder of allFolders) {
    if (options.filter && !folder.toLowerCase().includes(options.filter)) {
      continue;
    }

    const folderPath = join(completedDir, folder);
    const files = readdirSync(folderPath);
    const existingMp4 = files.find(f => f.endsWith('.mp4'));

    if (existingMp4 && !options.force) {
      alreadyHasVideo++;
      continue;
    }

    // Leer story.json si existe
    let storyJson = null;
    const storyJsonPath = join(folderPath, 'story.json');
    if (existsSync(storyJsonPath)) {
      try {
        storyJson = JSON.parse(readFileSync(storyJsonPath, 'utf8'));
      } catch (_) {}
    }

    // Buscar coincidencia en Supabase
    const match = supabaseRows.find(row => {
      const cleanTitle = (row.title || '').split('|')[0].trim();
      const sTitle = slugify(cleanTitle);
      const sFolder = slugify(folder);
      
      if (storyJson) {
        if (slugify(storyJson.title) === sTitle) return true;
        if (storyJson.music?.title && slugify(storyJson.music.title) === sTitle) return true;
      }
      return sFolder.includes(sTitle) || sTitle.includes(sFolder);
    });

    const videoUrl = match ? (match.video_url || match.source_url) : null;
    if (videoUrl && videoUrl.startsWith('http') && videoUrl.endsWith('.mp4')) {
      const fileName = videoUrl.includes('story_tiktok') ? 'video_tiktok_60s_master.mp4' : 'video_reels_90s_master.mp4';
      queue.push({
        folder,
        folderPath,
        targetFile: join(folderPath, fileName),
        fileName,
        videoUrl,
        title: match.title
      });
    } else {
      noMatch++;
    }
  }

  console.log(`\n📊 Diagnóstico de Episodios:`);
  console.log(`   - Total carpetas evaluadas: ${allFolders.length}`);
  console.log(`   - Episodios que ya tienen video en Drive: ${alreadyHasVideo}`);
  console.log(`   - Episodios listos para descargar desde R2: ${queue.length}`);
  if (noMatch > 0) {
    console.log(`   - Episodios sin video disponible en R2: ${noMatch}`);
  }

  const itemsToProcess = options.limit ? queue.slice(0, options.limit) : queue;

  if (itemsToProcess.length === 0) {
    console.log('\n🎉 ¡No hay videos pendientes de descargar! Todos los episodios en la bóveda están al día.');
    return;
  }

  console.log(`\n🚀 Iniciando sincronización de ${itemsToProcess.length} videos...\n`);

  if (options.dryRun) {
    itemsToProcess.forEach((item, i) => {
      console.log(` [${i + 1}/${itemsToProcess.length}] 📁 ${item.folder}`);
      console.log(`   ⬇️  ${item.fileName}`);
      console.log(`   🔗 ${item.videoUrl}\n`);
    });
    console.log('✅ Simulación dry-run completada.');
    return;
  }

  const startTime = Date.now();
  let totalBytesDownloaded = 0;

  const results = await runConcurrent(itemsToProcess, options.concurrency, async (item, index, total) => {
    const num = `[${index + 1}/${total}]`;
    console.log(`${num} ⬇️  Descargando: ${item.folder} (${item.fileName})...`);
    const size = await downloadVideo(item.videoUrl, item.targetFile);
    totalBytesDownloaded += size;
    const mb = (size / (1024 * 1024)).toFixed(1);
    console.log(`${num} ✅ Guardado: ${item.folder} / ${item.fileName} (${mb} MB)`);
    return { size, mb };
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalMB = (totalBytesDownloaded / (1024 * 1024)).toFixed(2);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log('\n🏁 =============================================================');
  console.log('🏁 RESUMEN FINAL DE SINCRONIZACIÓN');
  console.log('🏁 =============================================================');
  console.log(`✅ Descargados exitosamente: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Errores: ${failCount}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.item.folder}: ${r.error.message}`);
    });
  }
  console.log(`💾 Volumen transferido: ${totalMB} MB`);
  console.log(`⏱️  Tiempo total: ${durationSec} segundos`);
  console.log('🎉 Sincronización completada.');
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err);
  process.exit(1);
});
