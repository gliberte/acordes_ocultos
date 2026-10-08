export const STUDIO_CATEGORIES = ['acordes-ocultos', 'historia-en-los-acordes', 'destellos-de-gloria', 'catedrales-de-leyenda'] as const;
export interface GeneratedScene { scene: number; subtitle: string; prompt?: string; imageAlt?: string; imageUrl?: string; }
export interface GeneratedStoryData {
  title: string; song: string; artist: string; slug: string; topic: string; audioMode: string;
  audioRecommendation?: string; coverPrompt?: string;
  scenes90s: GeneratedScene[]; scenes60s: { scene: number; subtitle: string }[];
  copys: { instagram: string; tiktok: string }; chronicle: { title: string; markdown: string };
}
export interface PotentialAnalysis {
  score: number; verdict: string; categoryRecommendation: string; oneLineHook: string;
  humanConflict: string; viralComponents: string[]; metaphorClosingIdea?: string;
  riskOrWeakness?: string; verdictDetail: string;
}
export class StudioInputError extends Error { status = 400; }
function record(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudioInputError('Objeto inválido.');
  return value as Record<string, any>;
}
function text(value: unknown, name: string, max = 8000, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new StudioInputError(`${name}: texto requerido de hasta ${max} caracteres.`);
  return value.trim();
}
export function safeSlug(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 120 || value.trim() !== value) throw new StudioInputError('Identificador de historia inválido.');
  return value;
}
export function editorialInput(value: unknown) {
  const body = record(value);
  const category = body.category ?? 'acordes-ocultos';
  const audioMode = body.audioMode ?? 'official-library';
  if (!STUDIO_CATEGORIES.includes(category)) throw new StudioInputError('Categoría inválida.');
  if (!['official-library','baked-audio'].includes(audioMode)) throw new StudioInputError('Modo de audio inválido.');
  return { song: text(body.song, 'Canción', 200), artist: text(body.artist, 'Artista', 200), category, audioMode, notes: body.notes === '' ? '' : text(body.notes, 'Notas', 6000, true) };
}
function scenes(value: unknown, prompts: boolean): GeneratedScene[] {
  if (!Array.isArray(value) || value.length !== 9) throw new StudioInputError('Se requieren exactamente nueve escenas.');
  return value.map((item, i) => {
    const scene = record(item);
    if (scene.scene !== i + 1) throw new StudioInputError('Las escenas deben numerarse del 1 al 9, en orden y sin duplicados.');
    return { scene: i + 1, subtitle: text(scene.subtitle, 'Subtítulo', 1000), ...(prompts ? { prompt: text(scene.prompt, 'Prompt', 8000), imageAlt: scene.imageAlt ? text(scene.imageAlt, 'Descripción', 1000) : undefined } : {}) };
  });
}
export function generatedStory(value: unknown): GeneratedStoryData {
  const body = record(value), copys = record(body.copys), chronicle = record(body.chronicle);
  if (!STUDIO_CATEGORIES.includes(body.topic)) throw new StudioInputError('Categoría inválida.');
  if (!['official-library','baked-audio'].includes(body.audioMode)) throw new StudioInputError('Modo de audio inválido.');
  return {
    title: text(body.title, 'Título', 300), song: text(body.song, 'Canción', 200), artist: text(body.artist, 'Artista', 200), slug: safeSlug(body.slug), topic: body.topic, audioMode: body.audioMode,
    audioRecommendation: body.audioRecommendation ? text(body.audioRecommendation, 'Audio', 1000) : undefined,
    coverPrompt: body.coverPrompt ? text(body.coverPrompt, 'Portada', 8000) : undefined,
    scenes90s: scenes(body.scenes90s, true), scenes60s: scenes(body.scenes60s, false),
    copys: { instagram: text(copys.instagram, 'Copy Instagram', 10000), tiktok: text(copys.tiktok, 'Copy TikTok', 10000) },
    chronicle: { title: text(chronicle.title, 'Título crónica', 300), markdown: text(chronicle.markdown, 'Crónica', 100000) },
  };
}
export function imageInput(value: unknown) {
  const body = record(value), sceneNumber = body.sceneNumber === undefined ? 'all' : body.sceneNumber;
  if (sceneNumber !== 'all' && sceneNumber !== 'cover' && !(Number.isInteger(sceneNumber) && sceneNumber >= 1 && sceneNumber <= 9)) throw new StudioInputError('Escena inválida.');
  if (body.force !== undefined && typeof body.force !== 'boolean') throw new StudioInputError('Force debe ser booleano.');
  return { storyData: generatedStory(body.storyData), sceneNumber: sceneNumber as number | 'all' | 'cover', force: body.force ?? true };
}
export function potentialAnalysis(value: unknown): PotentialAnalysis {
  const body = record(value);
  if (!Number.isFinite(body.score) || body.score < 1 || body.score > 10) throw new StudioInputError('Puntaje editorial inválido.');
  if (!STUDIO_CATEGORIES.includes(body.categoryRecommendation)) throw new StudioInputError('Categoría recomendada inválida.');
  if (!Array.isArray(body.viralComponents) || body.viralComponents.length > 10) throw new StudioInputError('Factores editoriales inválidos.');
  const verdict = text(body.verdict, 'Veredicto', 300);
  return { score: body.score, verdict: /garantizad/i.test(verdict) ? 'Potencial editorial por contrastar' : verdict,
    categoryRecommendation: body.categoryRecommendation, oneLineHook: text(body.oneLineHook, 'Gancho', 1000), humanConflict: text(body.humanConflict, 'Conflicto', 4000),
    viralComponents: body.viralComponents.map((value: unknown) => text(value, 'Factor', 1000)), metaphorClosingIdea: body.metaphorClosingIdea ? text(body.metaphorClosingIdea, 'Cierre', 4000) : undefined,
    riskOrWeakness: body.riskOrWeakness ? text(body.riskOrWeakness, 'Riesgo', 4000) : undefined, verdictDetail: text(body.verdictDetail, 'Detalle', 4000) };
}
export async function studioBody(request: Request, limit = 180000): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new StudioInputError('Se requiere JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new StudioInputError('Solicitud vacía.');
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    bytes += chunk.value.length;
    if (bytes > limit) { await reader.cancel(); throw new StudioInputError('Solicitud demasiado grande.'); }
    chunks.push(chunk.value);
  }
  const merged = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(merged)); } catch { throw new StudioInputError('JSON inválido.'); }
}
