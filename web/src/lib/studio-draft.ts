import { editorialInput, generatedStory, potentialAnalysis } from './studio-contract.ts';
import type { GeneratedStoryData, PotentialAnalysis } from './studio-contract.ts';
export const DRAFT_KEY = 'acordes_studio_draft_v1';
export interface StudioDraft {
  version: 1; revision: string; updatedAt: string; step: number;
  song: string; artist: string; category: string; audioMode: string; notes: string;
  storyData: GeneratedStoryData | null; analysis: PotentialAnalysis | null;
  images: Record<string, string>;
}
export function parseDraft(raw: string): StudioDraft {
  if (raw.length > 250000) throw new Error('Borrador demasiado grande.');
  const draft = JSON.parse(raw);
  if (draft?.version !== 1 || typeof draft.revision !== 'string' || !Number.isFinite(Date.parse(draft.updatedAt)) || !Number.isInteger(draft.step) || draft.step < 1 || draft.step > 4) throw new Error('Versión de borrador inválida.');
  for (const [name, max] of [['song',200],['artist',200],['notes',6000]] as const) if (typeof draft[name] !== 'string' || draft[name].length > max) throw new Error('Formulario inválido.');
  const input = editorialInput({ ...draft, song: draft.song || 'Sin título', artist: draft.artist || 'Sin artista' });
  if (!draft.images || typeof draft.images !== 'object' || Array.isArray(draft.images) || Object.keys(draft.images).length > 10) throw new Error('Imágenes inválidas.');
  const images: Record<string,string> = {};
  for (const [key,url] of Object.entries(draft.images)) {
    if (!/^(cover|[1-9])$/.test(key) || typeof url !== 'string' || url.length > 2048) throw new Error('Referencia visual inválida.');
    if (!/^\/(?:videos|articles|covers)\//.test(url)) {
      const parsed = new URL(url);
      if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('URL visual inválida.');
    }
    images[key] = url;
  }
  const storyData = draft.storyData === null ? null : generatedStory(draft.storyData);
  if (!storyData && draft.step !== 1) throw new Error('Etapa sin historia.');
  return { version: 1, revision: draft.revision, updatedAt: draft.updatedAt, step: draft.step, song: draft.song, artist: draft.artist, notes: draft.notes,
    category: input.category, audioMode: input.audioMode, storyData, analysis: draft.analysis === null ? null : potentialAnalysis(draft.analysis), images };
}
