import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const coversDir = path.join(rootDir, 'web/public/covers');
const publicCoversDir = path.join(rootDir, 'public/covers');
const availableCoversPath = path.join(rootDir, 'web/src/data/available_covers.json');

const targets = [
  {
    name: 'Gimme Shelter (The Rolling Stones)',
    source: 'articles/the-rolling-stones-gimme-shelter/images/cover.webp',
    slugs: ['gimmeshelter', 'the-rolling-stones-gimme-shelter']
  },
  {
    name: 'The Sound of Silence (Simon & Garfunkel)',
    source: 'articles/simon-and-garfunkel-the-sound-of-silence/images/cover.webp',
    slugs: ['elrescatedethesoundofsilence', 'simon-and-garfunkel-the-sound-of-silence', 'thesoundofsilence']
  },
  {
    name: 'Radio Ga Ga / Live Aid (Queen)',
    source: 'articles/queen-radio-ga-ga-live-aid-1985/images/cover.webp',
    slugs: ['queenyelmilagrodelliveaid', 'queen-radio-ga-ga-live-aid-1985', 'radiogaga']
  },
  {
    name: 'Patrick, amor mío (Isabel Patón)',
    source: 'articles/isabel-paton-patrick-amor-mio-acordes-ocultos/images/cover.webp',
    slugs: ['patrickamormio', 'isabel-paton-patrick-amor-mio-acordes-ocultos', 'elnaufragioqueparalizolasplayas']
  },
  {
    name: 'Like a Rolling Stone (Bob Dylan)',
    source: 'articles/bob-dylan-like-a-rolling-stone-acordes-ocultos/images/cover.webp',
    slugs: ['elorganoaccidental', 'bob-dylan-like-a-rolling-stone-acordes-ocultos', 'likearollingstone']
  },
  {
    name: 'That\'s All Right (Elvis Presley)',
    source: 'articles/elvis-presley-thats-all-right-acordes-ocultos/images/cover.webp',
    slugs: ['thatsallright', 'elvis-presley-thats-all-right-acordes-ocultos', 'elrelampagoquedespertoamemphis']
  },
  {
    name: 'Zombie (The Cranberries)',
    source: 'articles/the-cranberries-zombie-acordes-ocultos/images/cover.webp',
    slugs: ['zombie', 'the-cranberries-zombie-acordes-ocultos', 'laoraciondesgarradadewarrington']
  },
  {
    name: 'Baker Street (Gerry Rafferty)',
    source: 'articles/gerry-rafferty-baker-street-acordes-ocultos/images/cover.webp',
    slugs: ['elsolodesaxodebakerstreet', 'gerry-rafferty-baker-street-acordes-ocultos', 'bakerstreet', 'lamelancoliadoradadelasfalto']
  }
];

fs.mkdirSync(coversDir, { recursive: true });
fs.mkdirSync(publicCoversDir, { recursive: true });

let availableCovers = JSON.parse(fs.readFileSync(availableCoversPath, 'utf8'));
const availableSet = new Set(availableCovers);

console.log('🚀 Vinculando y copiando las 8 portadas existentes a web/public/covers y public/covers...');

for (const t of targets) {
  const src = path.join(rootDir, t.source);
  if (!fs.existsSync(src)) {
    console.error(`❌ No existe el archivo origen: ${src}`);
    continue;
  }

  const bytes = fs.statSync(src).size;
  console.log(`\n📸 Procesando [${t.name}] (${bytes} bytes)...`);

  for (const slug of t.slugs) {
    const destWeb = path.join(coversDir, `${slug}.webp`);
    const destPublic = path.join(publicCoversDir, `${slug}.webp`);

    fs.copyFileSync(src, destWeb);
    fs.copyFileSync(src, destPublic);
    availableSet.add(slug);
    console.log(`   ✅ Copiado a: /covers/${slug}.webp`);
  }
}

// Guardar available_covers.json ordenado
const updatedCovers = Array.from(availableSet).sort();
fs.writeFileSync(availableCoversPath, JSON.stringify(updatedCovers, null, 2));
console.log(`\n✨ available_covers.json actualizado con ${updatedCovers.length} portadas disponibles.`);
