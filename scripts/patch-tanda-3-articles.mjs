import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dsyxiowlipttwjuhoqio.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || '';

const updates = [
  {
    id: 'dec416aa-29d2-47e1-8f93-cbacfe81b19d',
    artist: 'The Doors',
    articleFile: 'articles/the-doors-touch-me/article.md'
  },
  {
    id: '6d7f0020-3982-4ea9-9911-f04abd44ab2b',
    artist: 'The Carpenters',
    articleFile: 'articles/the-carpenters-close-to-you/article.md'
  },
  {
    id: '5dadf010-bf1b-42ab-9029-f9ef504c2fc9',
    artist: 'Selena Quintanilla',
    articleFile: 'articles/selena-quintanilla-amor-prohibido/article.md'
  },
  {
    id: '1da7127a-7dce-42fa-bd1b-769eb182cd72',
    artist: 'Laura Branigan',
    articleFile: 'articles/laura-branigan-the-power-of-love/article.md'
  },
  {
    id: 'ba9834f9-8a7e-44ee-b1d8-c2ad8e31b140',
    artist: 'Marilyn Monroe',
    articleFile: 'articles/marilyn-monroe-candle-in-the-wind/article.md'
  }
];

async function main() {
  console.log('📡 Actualizando web_article en Supabase para Tanda 3...\n');

  for (const item of updates) {
    if (!fs.existsSync(item.articleFile)) {
      console.error(`❌ Archivo no encontrado: ${item.articleFile}`);
      continue;
    }

    const content = fs.readFileSync(item.articleFile, 'utf8');
    const wordCount = content.split(/\s+/).length;

    console.log(`⏳ Actualizando [${item.artist}] (ID: ${item.id})... (${wordCount} palabras)`);

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
      console.log(`✅ ${item.artist} actualizado con éxito en Supabase! (Título: ${data[0]?.title})`);
    }
  }

  console.log('\n✨ Todas las crónicas de Tanda 3 han sido guardadas en Supabase.');
}

main().catch(console.error);
