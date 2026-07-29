export interface Scene {
  number: number;
  text: string;
  image?: string;
  duration?: number;
}

export interface ExtraImage {
  url: string;
  caption?: string;
  credit?: string;
}

export interface StoryItem {
  id: string;
  slug: string;
  articleSlug?: string;
  title: string;
  artist: string;
  songTitle?: string;
  category: 'acordes-ocultos' | 'historia-en-los-acordes' | 'destellos-de-gloria' | 'catedrales-de-leyenda' | string;
  categoryLabel: string;
  hook?: string;
  anecdote?: string;
  content: string;
  summary?: string;
  coverUrl: string;
  heroImageUrl?: string;
  teaserUrl?: string;
  videoUrl?: string;
  tiktokVideoUrl?: string;
  audioUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  hashtags: string[];
  publishedAt: string;
  durationSeconds?: number;
  scenes?: Scene[];
  extraImages?: ExtraImage[];
  isHidden?: boolean;
  views?: number;
  reach?: number;
  igLikes?: number;
  igPublishedAt?: string;
  isLatestReel?: boolean;
  social?: {
    likes?: number;
    comments?: Array<{
      id: string;
      author: string;
      content: string;
      createdAt: string;
    }>;
  };
  source: 'supabase' | 'local';
}

export interface ArchiveImageItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  artist?: string;
  storySlug?: string;
  storyId?: string;
  type: 'cover' | 'scene' | 'teaser' | 'extra' | 'file';
  sceneNumber?: number;
  caption?: string;
  credit?: string;
  date?: string;
  source: 'supabase' | 'r2';
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  badgeClass: string;
}
