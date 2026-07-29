import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const updates = [
  {
    id: '7493457d-01d4-48e3-bb03-6243a7c3e2fe',
    artist: 'John Lennon',
    title: 'El Músico que Cambió la Fama por Hornear Pan',
    articleFile: 'articles/john-lennon-watching-the-wheels/article.md'
  },
  {
    id: '0e2ec6f2-efe6-4e1c-bb13-1a4575139e4e',
    artist: 'The Beatles',
    title: 'El Cartel Victoriano que Enloqueció a la BBC',
    articleFile: 'articles/the-beatles-being-for-the-benefit-of-mr-kite/article.md'
  },
  {
    id: 'e34f2599-ce8c-431e-945f-9a83211a29ac',
    artist: 'The Beatles',
    title: 'While My Guitar Gently Weeps',
    articleFile: 'articles/the-beatles-while-my-guitar-gently-weeps/article.md'
  },
  {
    id: 'ab96239b-9760-4fd0-87e3-0edc08a772c9',
    artist: 'The Beatles',
    title: 'While My Guitar Gently Weeps (Version 2)',
    articleFile: 'articles/the-beatles-while-my-guitar-gently-weeps/article.md'
  },
  {
    id: '314c5284-7b8d-409f-ba8c-5d487a523127',
    artist: 'The Beatles',
    title: 'I Am the Walrus',
    articleFile: 'articles/the-beatles-i-am-the-walrus/article.md'
  },
  {
    id: '365a3ec6-0fba-4afa-b1e1-84d9137272e4',
    artist: 'Lynyrd Skynyrd',
    title: 'La falsa enemistad del rock sureño',
    articleFile: 'articles/lynyrd-skynyrd-sweet-home-alabama/article.md'
  }
];

async function main() {
  console.log('📡 Actualizando web_article en Supabase para Bloque A...\n');

  for (const item of updates) {
    if (!fs.existsSync(item.articleFile)) {
      console.error(`❌ Archivo no encontrado: ${item.articleFile}`);
      continue;
    }

    const content = fs.readFileSync(item.articleFile, 'utf8');
    const wordCount = content.split(/\s+/).length;

    console.log(`⏳ Actualizando [${item.artist} - ${item.title}] (ID: ${item.id})... (${wordCount} palabras)`);

    const res = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        web_article: content
      })
    });

    if (!res.ok) {
      console.error(`❌ Error actualizando ${item.artist}: ${res.status} ${res.statusText}`, await res.text());
    } else {
      const data = await res.json();
      console.log(`✅ ${item.artist} - "${item.title}" actualizado con éxito en Supabase!`);
    }
  }

  console.log('\n✨ Todas las crónicas de Bloque A han sido sincronizadas en Supabase.');
}

main().catch(console.error);
