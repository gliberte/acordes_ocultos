import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CLIPS = [
  {
    name: 'queen',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/queenyelmilagrodelliveaid/2026-07-02T14-49-21-198Z/story.mp4',
    start: 24,
    duration: 6
  },
  {
    name: 'radiohead',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/creep/2026-07-09T14-42-36-486Z/story.mp4',
    start: 20,
    duration: 6
  },
  {
    name: 'reospeedwagon',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/inmydreams/2026-07-09T14-19-26-643Z/story.mp4',
    start: 30,
    duration: 6
  },
  {
    name: 'rollingstones',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/gimmeshelter/2026-07-07T18-04-55-557Z/story.mp4',
    start: 30,
    duration: 6
  },
  {
    name: 'bonnietyler',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/bonnietylertribute/2026-07-09T19-02-52-002Z/story.mp4',
    start: 30,
    duration: 6
  },
  {
    name: 'brotherhoodofman',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/unitedwestand/2026-07-09T18-45-56-923Z/story.mp4',
    start: 10,
    duration: 6
  },
  {
    name: 'billwithers',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/leanonme/2026-07-08T19-59-12-145Z/story.mp4',
    start: 25,
    duration: 6
  },
  {
    name: 'charlene',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/iveneverbeentome/2026-07-09T13-29-57-117Z/story.mp4',
    start: 30,
    duration: 6
  },
  {
    name: 'davidbowie',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/laacusticadeheroes/2026-07-06T15-44-54-762Z/story.mp4',
    start: 30,
    duration: 6
  },
  {
    name: 'bobdylan',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/elorganoaccidental/2026-07-06T19-00-27-799Z/story.mp4',
    start: 20,
    duration: 6
  },
  {
    name: 'vanmorrison',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/elinfiernolegalylacartadeamor/2026-07-07T13-26-04-917Z/story.mp4',
    start: 15,
    duration: 6
  },
  {
    name: 'bread',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/eltoquemaestroyeldesprecioporlafama/2026-07-07T13-45-23-598Z/story.mp4',
    start: 20,
    duration: 6
  },
  {
    name: 'ritchievalens',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/ritchievalensylamoneda/2026-07-02T15-36-30-367Z/story.mp4',
    start: 10,
    duration: 6
  },
  {
    name: 'kurtcobain',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/kurtcobainyelsusurrodesomethingintheway/2026-07-01T21-32-31-586Z/story.mp4',
    start: 30,
    duration: 6
  },
  {
    name: 'pinkfloyd',
    url: 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/nexo-gaming-news-videos/laultimavisitadeldiamanteloco/2026-07-03T20-27-02-544Z/story.mp4',
    start: 20,
    duration: 6
  }
];

const targetDir = 'public/videos/presentation';
const tempDir = join(targetDir, 'temp');

if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

// Limpiar archivos viejos
try {
  execSync(`rm -f ${join(targetDir, 'clip-*.mp4')}`);
} catch (e) {}

console.log('Iniciando descarga y corte de los 15 fragmentos...');

CLIPS.forEach((clip, index) => {
  const tempPath = join(tempDir, `${clip.name}_temp.mp4`);
  const finalPath = join(targetDir, `clip-${index + 1}.mp4`);

  console.log(`\n[${index + 1}/${CLIPS.length}] Procesando ${clip.name}...`);

  try {
    console.log(`Descargando: ${clip.url}`);
    execSync(`curl -s -o "${tempPath}" "${clip.url}"`);
    
    // Cortar con ffmpeg
    console.log(`Cortando segmento desde segundo ${clip.start} por ${clip.duration}s`);
    execSync(`ffmpeg -y -ss ${clip.start} -t ${clip.duration} -i "${tempPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -g 1 -bf 0 -crf 18 -c:a aac -b:a 192k "${finalPath}"`);
    
    console.log(`Completado: ${finalPath}`);
  } catch (error) {
    console.error(`Error al procesar ${clip.name}:`, error.message);
  } finally {
    if (existsSync(tempPath)) {
      try {
        execSync(`rm "${tempPath}"`);
      } catch (e) {}
    }
  }
});

// Remover carpeta temporal
try {
  execSync(`rm -rf "${tempDir}"`);
} catch (e) {}

console.log('\n¡Todos los 15 clips procesados correctamente!');
