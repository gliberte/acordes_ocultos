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
  durationSeconds: z.number().default(10),
  transitionFromAssetIndex: z.number().optional(),
  transitionToAssetIndex: z.number().optional()
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
  type: z.enum(['image', 'video']).optional(),
  role: z.enum(['scene', 'transition']).optional()
});

export const StoryGenerationSchema = z.object({
  provider: z.enum(['openai-veo', 'higgsfield']).default('openai-veo'),
  imageProvider: z.enum(['codex-imagegen', 'openai']).default('codex-imagegen'),
  videoProvider: z.enum(['veo']).default('veo'),
  imageModel: z.string().default('gpt-image-2'),
  videoModel: z.string().default('veo-3.1-generate-preview'),
  imageAspectRatio: z.string().default('9:16'),
  imageSize: z.string().default('1088x1920'),
  videoAspectRatio: z.string().default('9:16'),
  videoResolution: z.string().default('720p'),
  videoDurationSeconds: z.number().default(8),
  outputDir: z.string().optional()
});

export const StorySchema = z.object({
  title: z.string(),
  artist: z.string(),
  durationSeconds: z.number().default(60),
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
    volume: z.number().min(0).max(1).default(0.55),
    instagram: z
      .object({
        query: z.string().optional(),
        expectedTitle: z.string().optional(),
        expectedArtist: z.string().optional(),
        status: z
          .enum(['unknown', 'manual_check_required', 'available', 'unavailable'])
          .default('manual_check_required'),
        checkedAt: z.string().optional(),
        notes: z.string().optional()
      })
      .optional()
  }),
  assets: z.array(StoryAssetSchema).min(4),
  clip: StoryClipSchema.optional(),
  segments: z.array(StorySegmentSchema).optional(),
  visuals: z.array(StoryVisualSchema).optional(),
  generation: StoryGenerationSchema.optional()
});

export type StoryData = z.infer<typeof StorySchema>;
