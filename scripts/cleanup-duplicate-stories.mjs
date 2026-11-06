#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(rootDir, 'web', '.env'));

const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Falta configurar SUPABASE_URL y SUPABASE_SECRET_KEY en el entorno.');
  process.exit(1);
}

const isApply = process.argv.includes('--apply');

function cleanSlug(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('🧹 ========================================================');
  console.log('🧹 ACORDES OCULTOS — LIMPIEZA DE REGISTROS DUPLICADOS EN SUPABASE');
  console.log('🧹 Modo:', isApply ? '🚨 APLICANDO CAMBIOS REALES (--apply)' : '🔍 SIMULACIÓN (DRY-RUN)');
  console.log('🧹 ========================================================\n');

  console.log('📡 Descargando todos los registros de published_news...');
  const res = await fetch(`${supabaseUrl}/rest/v1/published_news?select=*&order=created_at.desc`, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    console.error(`❌ Error al conectar a Supabase: HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const rows = await res.json();
  console.log(`📦 Total de registros encontrados: ${rows.length}\n`);

  // Agrupar por clave canónica
  const groups = new Map();
  for (const r of rows) {
    const pp = r.production_plan || {};
    const artSlug = pp.article_slug;
    const slug = pp.slug || (pp.story && pp.story.slug);
    const titleClean = cleanSlug(r.title);

    // Prioridad de clave de agrupación: article_slug > clean slug > clean title
    const keyStr = artSlug ? `art:${artSlug}` : (slug ? `slug:${cleanSlug(slug)}` : `title:${titleClean}`);

    if (!groups.has(keyStr)) {
      groups.set(keyStr, []);
    }
    groups.get(keyStr).push(r);
  }

  const duplicatesToDelete = [];
  const rowsToUpdate = [];
  let dupGroupsCount = 0;

  for (const [keyStr, group] of groups.entries()) {
    if (group.length > 1) {
      dupGroupsCount++;

      // Ordenar para elegir el registro canónico a PRESERVAR
      group.sort((a, b) => {
        // 1. Preferir crónica extendida completa (web_article con mayor longitud)
        const aLen = (a.web_article || '').length;
        const bLen = (b.web_article || '').length;
        if (Math.abs(bLen - aLen) > 300) {
          return bLen - aLen;
        }
        // 2. Preferir registro con enlaces de video e imagen válidos
        const aMedia = (a.video_url ? 1 : 0) + (a.image_url ? 1 : 0);
        const bMedia = (b.video_url ? 1 : 0) + (b.image_url ? 1 : 0);
        if (bMedia !== aMedia) return bMedia - aMedia;
        // 3. Preferir registro con Instagram URL
        const aIg = a.production_plan?.instagram_url || a.instagram_url ? 1 : 0;
        const bIg = b.production_plan?.instagram_url || b.instagram_url ? 1 : 0;
        if (bIg !== aIg) return bIg - aIg;
        // 4. Preferir más reciente
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const keep = group[0];
      const redundancies = group.slice(1);

      // Si algún duplicado tenía datos que le faltaban al registro canónico (ej. Instagram URL o crónica), combinarlos
      let needsPatch = false;
      const patchData = {};

      for (const red of redundancies) {
        if (!keep.web_article && red.web_article) {
          keep.web_article = red.web_article;
          patchData.web_article = red.web_article;
          needsPatch = true;
        }
        if (!keep.video_url && red.video_url) {
          keep.video_url = red.video_url;
          patchData.video_url = red.video_url;
          needsPatch = true;
        }
        if (!keep.image_url && red.image_url) {
          keep.image_url = red.image_url;
          patchData.image_url = red.image_url;
          needsPatch = true;
        }
      }

      if (needsPatch) {
        rowsToUpdate.push({ id: keep.id, data: patchData, title: keep.title });
      }

      for (const red of redundancies) {
        duplicatesToDelete.push({
          id: red.id,
          title: red.title,
          created_at: red.created_at,
          keptId: keep.id,
          groupKey: keyStr
        });
      }

      console.log(`🔹 Grupo [${keyStr}] (${group.length} registros):`);
      console.log(`   ✅ PRESERVAR: ${keep.id} [${keep.created_at}] "${keep.title}" (${(keep.web_article || '').length} caracteres)`);
      for (const red of redundancies) {
        console.log(`   ❌ ELIMINAR:  ${red.id} [${red.created_at}] "${red.title}" (${(red.web_article || '').length} caracteres)`);
      }
    }
  }

  console.log('\n📊 ========================================================');
  console.log(`Total de historias con duplicados: ${dupGroupsCount}`);
  console.log(`Total de registros redundantes a eliminar: ${duplicatesToDelete.length}`);
  console.log(`Registros canónicos que quedarán en Supabase: ${rows.length - duplicatesToDelete.length}`);
  console.log('========================================================\n');

  if (!isApply) {
    console.log('ℹ️ Para aplicar esta limpieza en Supabase, ejecuta:');
    console.log('   node scripts/cleanup-duplicate-stories.mjs --apply\n');
    return;
  }

  // Guardar copia de seguridad de los registros que se van a eliminar
  const backupDir = path.join(rootDir, 'scripts', 'data');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `supabase_duplicates_backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(duplicatesToDelete, null, 2), 'utf8');
  console.log(`💾 Copia de respaldo guardada en: ${backupPath}\n`);

  // Aplicar patches si correspondía combinar datos
  if (rowsToUpdate.length > 0) {
    console.log(`🔄 Actualizando ${rowsToUpdate.length} registros canónicos con datos combinados...`);
    for (const update of rowsToUpdate) {
      await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${update.id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(update.data)
      });
    }
    console.log('✅ Actualización completada.\n');
  }

  // Eliminar duplicados
  console.log(`🗑️ Eliminando ${duplicatesToDelete.length} registros redundantes de Supabase...`);
  let deletedCount = 0;
  for (const item of duplicatesToDelete) {
    const delRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${item.id}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`
      }
    });

    if (delRes.ok) {
      deletedCount++;
    } else {
      console.warn(`⚠️ Error eliminando ${item.id}: ${delRes.statusText}`);
    }
  }

  console.log(`\n🎉 Limpieza completada con éxito: ${deletedCount} registros duplicados eliminados.`);
  console.log(`📊 Total final de registros en Supabase: ${rows.length - deletedCount}`);
}

main().catch(err => {
  console.error('❌ Error en script de limpieza:', err);
  process.exit(1);
});
