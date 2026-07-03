import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [, , artistArg, titleArg, ...anecdoteParts] = process.argv;

if (!artistArg || !titleArg || anecdoteParts.length === 0) {
  console.error(
    'Uso: npm run create:story -- "Artista" "Titulo del video" "Anecdota completa..."'
  );
  process.exit(1);
}

const artist = artistArg.trim();
const title = titleArg.trim();
const anecdote = anecdoteParts.join(' ').trim();
const sentences = anecdote
  .split(/(?<=[.!?])\s+/)
  .map((sentence) => sentence.trim())
  .filter(Boolean);

const beats =
  sentences.length >= 4
    ? sentences.slice(0, 6)
    : [
        anecdote,
        'El detalle empezo como algo pequeno dentro del proceso creativo.',
        'Con el tiempo, esa decision cambio la manera en que se recuerda el tema.',
        'La historia revela una parte menos visible de la musica.'
      ];

const slug = title
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const story = {
  title,
  artist,
  durationSeconds: 90,
  topic: 'anecdota musical',
  anecdote,
  hook: beats[0].replace(/[.!?]$/, '.'),
  beats,
  outro: 'Las mejores historias musicales suelen esconderse en los detalles.',
  palette: {
    ink: '#111318',
    paper: '#f8f0df',
    accent: '#e23d28',
    glow: '#f7b32b'
  },
  music: {
    title: 'Tema de referencia',
    artist,
    src: '',
    startSecond: 0,
    volume: 0.55,
    instagram: {
      query: `Tema de referencia ${artist}`,
      expectedTitle: 'Tema de referencia',
      expectedArtist: artist,
      status: 'manual_check_required',
      notes:
        'Confirmar disponibilidad dentro de Instagram al crear el Reel; la API disponible no expone busqueda completa de la libreria musical.'
    }
  },
  assets: [1, 2, 3, 4, 5, 6, 7].map((item) => ({
    src: `generated/scene-0${item}.svg`,
    prompt: `${artist}, ${title}, cinematic music documentary scene ${item}, vertical 9:16`
  })),
  visuals: [],
  clip: {
    src: '',
    prompt: `${artist}, ${title}, 8 second vertical cinematic transition between two story scenes`,
    startSecond: 45,
    durationSeconds: 8,
    transitionFromAssetIndex: 3,
    transitionToAssetIndex: 4
  },
  generation: {
    provider: 'openai-veo',
    imageProvider: 'codex-imagegen',
    videoProvider: 'veo',
    imageModel: 'gpt-image-2',
    videoModel: 'veo-3.1-generate-preview',
    imageAspectRatio: '9:16',
    imageSize: '1088x1920',
    videoAspectRatio: '9:16',
    videoResolution: '720p',
    videoDurationSeconds: 8,
    outputDir: `videos/${slug || 'story'}`
  }
};

const outDir = resolve('src/data/generated');
await mkdir(outDir, {recursive: true});
const outFile = resolve(outDir, `${slug || 'story'}.json`);
await writeFile(outFile, `${JSON.stringify(story, null, 2)}\n`);

console.log(outFile);
