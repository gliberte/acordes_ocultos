import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, writeFile, open, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { GeneratedStoryData } from './studio-contract.ts';
const execute = promisify(execFile);
export class FlowBusyError extends Error { status = 409; }
export async function withFlowLock<T>(root: string, run: () => Promise<T>): Promise<T> {
  const directory = join(root, '.studio'); await mkdir(directory, { recursive: true });
  const path = join(directory, 'flow.lock');
  let lock;
  try { lock = await open(path, 'wx'); }
  catch (error: any) {
    if (error.code !== 'EEXIST') throw error;
    throw new FlowBusyError('Hay una generación visual en curso. Si el proceso se interrumpió, verifica que Flow esté detenido antes de retirar .studio/flow.lock.');
  }
  try { await lock.writeFile(String(process.pid)); return await run(); }
  finally { await lock.close(); await unlink(path).catch(() => {}); }
}
export async function generateFlow(root: string, story: GeneratedStoryData, scene: number | 'cover' | 'all', force: boolean) {
  const jobId = randomUUID();
  const outputRelative = `videos/studio/${story.slug}/${jobId}`;
  const workspace = await mkdtemp(join(tmpdir(), 'acordes-studio-'));
  const manifestPath = join(workspace, 'image-manifest.json');
  const manifest = { title: story.title, artist: story.artist, slug: story.slug,
    coverPrompt: story.coverPrompt || `Vertical 9:16 portrait of ${story.artist}, cinematic archival photograph`,
    coverBg: `${outputRelative}/cover_bg.png`,
    assets: story.scenes90s.map(s => ({ src: `${outputRelative}/scene-${String(s.scene).padStart(2,'0')}.png`, prompt: s.prompt })) };
  await writeFile(manifestPath, JSON.stringify(manifest));
  const args = [join(root, 'scripts/generate-flow-images.mjs'), '--story', manifestPath];
  if (scene !== 'all') args.push('--index', String(scene));
  if (force) args.push('--force');
  try {
    await execute(process.execPath, args, { cwd: root, env: process.env, timeout: 300000, maxBuffer: 2 * 1024 * 1024 });
    const selected = scene === 'all' ? ['cover', ...story.scenes90s.map(s => s.scene)] : [scene];
    const files = await Promise.all(selected.map(async index => {
      const filename = index === 'cover' ? 'cover_bg.png' : `scene-${String(index).padStart(2,'0')}.png`;
      const buffer = await readFile(join(root, 'public', outputRelative, filename));
      if (buffer.length < 8 || !buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('El generador no entregó un PNG válido.');
      return { index, filename, buffer };
    }));
    return { jobId, outputRelative, files };
  } finally {
    const { rm } = await import('node:fs/promises'); await rm(workspace, { recursive: true, force: true });
  }
}
