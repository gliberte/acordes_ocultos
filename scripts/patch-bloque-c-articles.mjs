import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const updates = [
  {
    id: 'ead91e2b-c277-4fb2-8cf0-5aa7e3673781',
    artist: 'Elton John',
    title: 'Someone Saved My Life Tonight',
    articleFile: 'articles/elton-john-someone-saved-my-life-tonight/article.md'
  },
  {
    id: '7e1a6ce2-733b-4b25-b942-286ec5455cdd',
    artist: 'Elton John',
    title: 'Candle in the Wind 1997 (Tributo a Diana)',
    articleFile: 'articles/elton-john-candle-in-the-wind-diana-1997/article.md'
  },
  {
    id: '4527b978-f83a-4264-a060-01549067d102',
    artist: 'Bob Seger',
    title: 'Against the Wind',
    articleFile: 'articles/bob-seger-against-the-wind/article.md'
  },
  {
    id: 'aa7f718d-1a4f-4d50-bd17-e38de4c976f4',
    artist: 'Bob Seger',
    title: 'Against the Wind (Version 2)',
    articleFile: 'articles/bob-seger-against-the-wind/article.md'
  },
  {
    id: 'b780ae72-e119-468a-b51b-95c95547e110',
    artist: 'The Cars',
    title: 'You Are the Girl',
    articleFile: 'articles/the-cars-you-are-the-girl/article.md'
  },
  {
    id: 'd29fbcab-522b-4155-9b79-15fa04f611f8',
    artist: 'The Cars',
    title: 'You Are the Girl (Version 2)',
    articleFile: 'articles/the-cars-you-are-the-girl/article.md'
  },
  {
    id: '2535d0b8-70a8-46c5-82fb-c006ece1d626',
    artist: 'The Commodores',
    title: 'Three Times a Lady',
    articleFile: 'articles/the-commodores-three-times-a-lady/article.md'
  }
];

async function main() {
  console.log('📡 Actualizando web_article en Supabase para Bloque C...\n');

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

  console.log('\n✨ Todas las crónicas de Bloque C han sido sincronizadas en Supabase.');
}

main().catch(console.error);
