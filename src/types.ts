import {z} from 'zod';

export const StoryAssetSchema = z.object({
  src: z.string(),
  prompt: z.string().optional(),
  credit: z.string().optional()
});

export const StoryClipSchema = z.object({
  src: z.string().optional(),
  prompt: z.string().optional(),
  startSecond: z.number().default(38),
  durationSeconds: z.number().default(10)
});

export const StorySegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  assetIndex: z.number().optional()
});

export const StoryVisualSchema = z.object({
  start: z.number(),
  end: z.number(),
  src: z.string(),
  type: z.enum(['image', 'video']).optional()
});

export const StorySchema = z.object({
  title: z.string(),
  artist: z.string(),
  topic: z.string(),
  anecdote: z.string(),
  hook: z.string(),
  beats: z.array(z.string()).min(4).max(8),
  outro: z.string(),
  palette: z.object({
    ink: z.string(),
    paper: z.string(),
    accent: z.string(),
    glow: z.string()
  }),
  music: z.object({
    title: z.string(),
    artist: z.string(),
    src: z.string().optional(),
    startSecond: z.number().default(0),
    volume: z.number().min(0).max(1).default(0.55)
  }),
  assets: z.array(StoryAssetSchema).min(4),
  clip: StoryClipSchema.optional(),
  segments: z.array(StorySegmentSchema).optional(),
  visuals: z.array(StoryVisualSchema).optional()
});

export type StoryData = z.infer<typeof StorySchema>;
