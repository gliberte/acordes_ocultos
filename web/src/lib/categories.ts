import type { CategoryInfo } from './types';

export const CATEGORIES: Record<string, CategoryInfo> = {
  'acordes-ocultos': {
    id: 'acordes-ocultos',
    name: 'Acordes Ocultos',
    description: 'Historias secretas, misterios y giros del destino detrás de las grabaciones más icónicas.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  'historia-en-los-acordes': {
    id: 'historia-en-los-acordes',
    name: 'Historia en los Acordes',
    description: 'La narrativa poética y los universos dramáticos que cobran vida dentro de cada letra.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  'destellos-de-gloria': {
    id: 'destellos-de-gloria',
    name: 'Destellos de Gloria',
    description: 'Estrellas fugaces que vivieron con furia e iluminaron la historia antes de partir demasiado pronto.',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  },
  'catedrales-de-leyenda': {
    id: 'catedrales-de-leyenda',
    name: 'Catedrales de Leyenda',
    description: 'Monumentos incombustibles y titanes que reinventaron la música a lo largo de décadas.',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  }
};

export function getCategoryInfo(topicOrCategory?: string): CategoryInfo {
  if (!topicOrCategory) return CATEGORIES['acordes-ocultos'];
  const key = topicOrCategory.toLowerCase().trim();
  if (CATEGORIES[key]) return CATEGORIES[key];

  if (key.includes('destello')) return CATEGORIES['destellos-de-gloria'];
  if (key.includes('catedral')) return CATEGORIES['catedrales-de-leyenda'];
  if (key.includes('letra') || key.includes('historia-en-los-acordes')) return CATEGORIES['historia-en-los-acordes'];

  return CATEGORIES['acordes-ocultos'];
}
