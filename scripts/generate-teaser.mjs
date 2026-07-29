#!/usr/bin/env node
import {existsSync, readFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

const findStoryJson = (input) => {
  if (!input) {
    return join(rootDir, 'src/data/story.json');
  }

  // Si es ruta directa
  if (existsSync(resolve(input))) {
    return resolve(input);
  }

  // Si es slug en generated
  const slugPath = join(rootDir, 'src/data/generated', input.endsWith('.json') ? input : `${input}.json`);
  if (existsSync(slugPath)) {
    return slugPath;
  }

  throw new Error(`No se encontró el archivo JSON para: "${input}". Busca en src/data/generated/`);
};

const main = () => {
  const target = process.argv[2];
  const storyPath = findStoryJson(target);
  const story = JSON.parse(readFileSync(storyPath, 'utf8'));

  console.log(`🎬 Generando Avance para Historias (Teaser) para: ${story.artist} — "${story.music?.title || story.title}"`);
  console.log(`📄 Fuente: ${storyPath}`);

  // Determinar carpeta de salida
  const firstAsset = story.assets?.[0]?.src;
  let outputFolder = join(rootDir, 'out');
  let outputTeaserPath = join(rootDir, 'out/story_teaser.png');

  if (firstAsset) {
    outputFolder = join(rootDir, 'public', firstAsset, '..');
    outputTeaserPath = join(outputFolder, 'story_teaser.png');
  }

  mkdirSync(outputFolder, {recursive: true});

  // Ejecutar remotion still
  const cmd = `npx remotion still src/index.ts StoryTeaser "${outputTeaserPath}" --props="${storyPath}"`;
  console.log(`⚙️  Ejecutando: ${cmd}`);
  execSync(cmd, {cwd: rootDir, stdio: 'inherit'});

  // Copiar también a out/story_teaser.png para referencia
  mkdirSync(join(rootDir, 'out'), {recursive: true});
  copyFileSync(outputTeaserPath, join(rootDir, 'out/story_teaser.png'));

  console.log(`\n✅ ¡Avance generado con éxito!`);
  console.log(`📍 Guardado en: ${outputTeaserPath}`);
};

main();
