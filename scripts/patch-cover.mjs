#!/usr/bin/env node
/**
 * Sube la portada realista de Paul Mauriat "Love is Blue" a Cloudflare R2
 * y actualiza el campo image_url en Supabase para el paquete 6675f4d8-9c67-4b32-8f27-afff161a3415
 */
import { readFileSync } from 'node:fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const COVER_PATH = '/tmp/paul_mauriat_cover.jpg';
const R2_KEY = 'nexo-gaming-news-videos/loveisblue/2026-07-08T12-43-23-484Z/cover.png';
const SUPABASE_ID = '6675f4d8-9c67-4b32-8f27-afff161a3415';

// Cloudflare R2 config
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://0c0aad7fd951028fbe9eded107092686.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

async function run() {
  // 1. Subir a R2
  console.log('📤 Subiendo portada realista a Cloudflare R2...');
  await client.send(new PutObjectCommand({
    Bucket: 'nexo-gaming-news-videos',
    Key: R2_KEY,
    Body: readFileSync(COVER_PATH),
    ContentType: 'image/png'
  }));

  const coverUrl = `https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/${R2_KEY}`;
  console.log('✅ Portada realista subida a R2:', coverUrl);

  // 2. Actualizar image_url en Supabase
  console.log('💾 Actualizando image_url en Supabase...');
  const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || '';

  const response = await fetch(
    `${supabaseUrl}/rest/v1/published_news?id=eq.${SUPABASE_ID}`,
    {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
        prefer: 'return=representation'
      },
      body: JSON.stringify({ image_url: coverUrl })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase PATCH falló: ${response.status} ${err}`);
  }

  const updated = await response.json();
  console.log('✅ Supabase actualizado:', updated[0]?.id, '→ image_url:', updated[0]?.image_url);
  console.log('\n🎉 Listo. URL de la portada:');
  console.log(coverUrl);
}

run().catch(err => { console.error('❌ Error:', err); process.exit(1); });
