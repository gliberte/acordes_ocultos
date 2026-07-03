#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, extname, join, resolve} from 'node:path';
import {GoogleGenAI} from '@google/genai';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const defaultStoryPath = join(rootDir, 'src/data/story.json');
const publicDir = join(rootDir, 'public');

const loadEnv = () => {
  const envPath = join(rootDir, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = line.split('=');
    const value = valueParts
      .join('=')
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    story: defaultStoryPath,
    dryRun: false,
    clip: false,
    planOnly: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--story') {
      options.story = resolve(args[index + 1]);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--clip') {
      options.clip = true;
    } else if (arg === '--plan-only') {
      options.planOnly = true;
    }
  }

  return options;
};

const normalizeTag = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
    .trim();

const mimeTypeFor = (path) => {
  const extension = extname(path).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  return 'image/png';
};

const imageDataFor = (path) => ({
  imageBytes: readFileSync(path).toString('base64'),
  mimeType: mimeTypeFor(path)
});

const buildGeneration = (story) => ({
  provider: 'openai-veo',
  imageProvider: 'codex-imagegen',
  videoProvider: 'veo',
  imageModel: 'gpt-image-2',
  videoModel: 'veo-3.1-generate-preview',
  imageAspectRatio: '9:16',
  imageSize: '1088x1920',
  videoAspectRatio: '9:16',
  videoResolution: '720p',
  videoDurationSeconds: story.clip?.durationSeconds || 8,
  outputDir: `videos/${normalizeTag(story.title) || 'story'}`,
  ...(story.generation || {})
});

const imagePromptFor = (story, asset) =>
  [
    'Use case: historical-scene',
    'Asset type: vertical 9:16 still frame for an editorial music documentary Reel',
    `Primary request: ${asset.prompt}`,
    `Subject/context: ${story.artist}; ${story.title}`,
    'Style: cinematic archival documentary realism, high contrast, textured film grain, dramatic but respectful.',
    'Composition: vertical portrait framing, strong foreground subject, usable safe area for subtitles near the bottom.',
    'Avoid: text, captions, logos, watermarks, gore, explicit injury, sensationalism.'
  ].join('\n');

const writePlan = (story, generation) => {
  const imagePlan = story.assets.map((asset, index) => {
    const targetName = `scene-${String(index + 1).padStart(2, '0')}.png`;
    const src = `${generation.outputDir}/${targetName}`;

    return {
      type: 'image',
      provider: 'codex-imagegen',
      src,
      prompt: imagePromptFor(story, asset)
    };
  });
  const clipName = `${basename(story.clip?.src || 'transition', extname(story.clip?.src || 'transition')) || 'transition'}.mp4`;
  const clipPlan = story.clip
    ? {
        type: 'video',
        provider: 'veo',
        model: generation.videoModel,
        src: `${generation.outputDir}/${clipName}`,
        durationSeconds: generation.videoDurationSeconds,
        aspectRatio: generation.videoAspectRatio,
        prompt: story.clip.prompt
      }
    : null;

  return {
    images: imagePlan,
    clip: clipPlan
  };
};

const waitForVeo = async (ai, operation) => {
  let current = operation;
  const startedAt = Date.now();

  while (!current.done) {
    if (Date.now() - startedAt > 12 * 60 * 1000) {
      throw new Error('Veo generation timed out after 12 minutes.');
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
    current = await ai.operations.getVideosOperation({operation: current});
  }

  if (current.error) {
    throw new Error(`Veo generation failed: ${JSON.stringify(current.error)}`);
  }

  return current;
};

const generateClip = async ({story, generation, outputDir}) => {
  if (!story.clip) {
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VEO_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or VEO_API_KEY in .env.');
  }

  const fromIndex = story.clip.transitionFromAssetIndex ?? 0;
  const toIndex = story.clip.transitionToAssetIndex ?? Math.min(fromIndex + 1, story.assets.length - 1);
  const startAsset = story.assets[fromIndex];
  const endAsset = story.assets[toIndex];

  if (!startAsset || !endAsset) {
    throw new Error('Clip transition asset indexes are invalid.');
  }

  const startImagePath = join(publicDir, startAsset.src);
  const endImagePath = join(publicDir, endAsset.src);

  if (!existsSync(startImagePath) || !existsSync(endImagePath)) {
    throw new Error(
      [
        'Missing transition images for Veo.',
        `Expected start image: ${startImagePath}`,
        `Expected end image: ${endImagePath}`,
        'Generate/save the still images first, then rerun this command.'
      ].join('\n')
    );
  }

  const ai = new GoogleGenAI({apiKey});
  let operation = await ai.models.generateVideos({
    model: generation.videoModel,
    prompt: [
      story.clip.prompt,
      'Use the first image as the opening frame and the last image as the ending frame.',
      'Natural documentary transition, slow cinematic motion, no text, no captions, no logos, no graphic overlays.'
    ].join(' '),
    image: imageDataFor(startImagePath),
    config: {
      lastFrame: imageDataFor(endImagePath),
      durationSeconds: generation.videoDurationSeconds,
      aspectRatio: generation.videoAspectRatio,
      resolution: generation.videoResolution,
      negativePrompt: 'text, captions, logos, watermark, gore, explicit injury, distorted faces'
    }
  });

  operation = await waitForVeo(ai, operation);

  const generatedVideo = operation.response?.generatedVideos?.[0];

  if (!generatedVideo?.video) {
    throw new Error(`Veo returned no downloadable video: ${JSON.stringify(operation.response)}`);
  }

  const targetName = `${basename(story.clip.src || 'transition', extname(story.clip.src || 'transition')) || 'transition'}.mp4`;
  const targetPath = join(outputDir, targetName);
  const nextSrc = `${generation.outputDir}/${targetName}`;

  await ai.files.download({
    file: generatedVideo.video,
    downloadPath: targetPath
  });

  story.clip.src = nextSrc;

  return {
    type: 'video',
    provider: 'veo',
    src: nextSrc,
    path: targetPath
  };
};

const main = async () => {
  loadEnv();

  const options = parseArgs();
  const story = JSON.parse(readFileSync(options.story, 'utf8'));
  const generation = buildGeneration(story);
  const outputDir = join(publicDir, generation.outputDir);

  mkdirSync(outputDir, {recursive: true});

  const plan = writePlan(story, generation);

  if (options.dryRun || options.planOnly) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          story: options.story,
          generation,
          plan
        },
        null,
        2
      )
    );
    return;
  }

  const clip = await generateClip({story, generation, outputDir});

  writeFileSync(options.story, `${JSON.stringify(story, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        story: options.story,
        generation,
        clip
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
