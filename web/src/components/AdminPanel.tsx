import React, { useState, useEffect, useMemo } from 'react';
import StoryEditorModal, { type ExtraImageItem } from './StoryEditorModal';
import CoverSelectorModal from './CoverSelectorModal';
import ArchiveImageBrowserModal from './ArchiveImageBrowserModal';

export interface StoryAdminItem {
  id: string;
  slug: string;
  slugEn?: string;
  articleSlug?: string;
  title: string;
  artist: string;
  coverUrl: string;
  categoryLabel: string;
  instagramUrl?: string;
  publishedAt: string;
  content: string;
  extraImages?: ExtraImageItem[];
  isHidden?: boolean;
}

interface Props {
  initialStories: StoryAdminItem[];
  mode?: 'es' | 'en';
}

export default function AdminPanel({ initialStories, mode = 'es' }: Props) {
  const isEn = mode === 'en';
  useEffect(() => {
    // Remove plaintext credentials left by the previous client-side login.
    try {
      sessionStorage.removeItem('acordes_admin_pw');
      sessionStorage.removeItem('acordes_admin_auth');
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  const [stories, setStories] = useState<StoryAdminItem[]>(initialStories);
  const [search, setSearch] = useState<string>('');
  const [tab, setTab] = useState<'all' | 'pending' | 'linked' | 'hidden'>('all');
  const [editingStory, setEditingStory] = useState<StoryAdminItem | null>(null);
  const [editingCoverStory, setEditingCoverStory] = useState<StoryAdminItem | null>(null);
  const [showGlobalArchive, setShowGlobalArchive] = useState<boolean>(false);
  const [togglingVisibility, setTogglingVisibility] = useState<Record<string, boolean>>({});
  
  // Track per-story reel inputs and saving statuses
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of initialStories) {
      initial[s.id] = s.instagramUrl || '';
    }
    return initial;
  });

  const [savingStatus, setSavingStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleLogout = async () => {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (response.ok) window.location.assign('/admin/login');
    else setStatusMessage('No se pudo cerrar la sesión. Intenta nuevamente.');
  };

  const handleInputChange = (id: string, value: string) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const handlePaste = async (id: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputs(prev => ({ ...prev, [id]: text.trim() }));
      }
    } catch (err) {
      console.warn('No se pudo acceder al portapapeles:', err);
    }
  };

  function cleanInstagramUrl(raw: string): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';

    // Support pasting a bare Reel ID / shortcode (e.g. "DfXItzBxR_0")
    if (/^[a-zA-Z0-9_-]{6,32}$/.test(trimmed)) {
      return `https://www.instagram.com/reel/${trimmed}/`;
    }

    // Support partial paths like "reel/DfXItzBxR_0" or "/p/DfXItzBxR_0/"
    const partialMatch = trimmed.match(/^\/?(reel|reels|p)\/([a-zA-Z0-9_-]{6,32})/i);
    if (partialMatch) {
      const kind = partialMatch[1].toLowerCase() === 'p' ? 'p' : 'reel';
      return `https://www.instagram.com/${kind}/${partialMatch[2]}/`;
    }

    // Support full or domain-only URLs (including /<username>/reel/<id>/)
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const match = withProto.match(/^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:[a-zA-Z0-9_.]+\/)?(reel|reels|p)\/([a-zA-Z0-9_-]{6,32})/i);
    if (match) {
      const kind = match[1].toLowerCase() === 'p' ? 'p' : 'reel';
      return `https://www.instagram.com/${kind}/${match[2]}/`;
    }
    return '';
  }

  const handleSave = async (story: StoryAdminItem) => {
    const rawUrl = (inputs[story.id] || '').trim();
    const newUrl = rawUrl ? cleanInstagramUrl(rawUrl) : '';

    if (rawUrl && !newUrl) {
      const errMsg = 'Formato inválido. Pega el Reel ID (ej. DfXItzBxR_0) o la URL completa de Instagram.';
      setSavingStatus(prev => ({ ...prev, [story.id]: 'error' }));
      setRowErrors(prev => ({ ...prev, [story.id]: errMsg }));
      setStatusMessage(`❌ ${errMsg}`);
      setTimeout(() => setSavingStatus(prev => ({ ...prev, [story.id]: 'idle' })), 5000);
      return;
    }

    if (newUrl !== rawUrl) {
      setInputs(prev => ({ ...prev, [story.id]: newUrl }));
    }

    setSavingStatus(prev => ({ ...prev, [story.id]: 'saving' }));
    setRowErrors(prev => ({ ...prev, [story.id]: '' }));
    setStatusMessage('');

    try {
      const res = await fetch('/api/set-reel', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          storyId: story.id,
          slug: story.slug,
          slugEn: story.slugEn,
          articleSlug: story.articleSlug,
          title: story.title,
          artist: story.artist,
          reelUrl: newUrl,
          lang: mode
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      // Update local state (linking a Reel also un-hides the chronicle in this language)
      setStories(prev =>
        prev.map(s =>
          s.id === story.id
            ? { ...s, instagramUrl: newUrl || undefined, isHidden: newUrl ? false : s.isHidden }
            : s
        )
      );
      setSavingStatus(prev => ({ ...prev, [story.id]: 'saved' }));
      setRowErrors(prev => ({ ...prev, [story.id]: '' }));
      setStatusMessage(
        newUrl
          ? (isEn
              ? `✅ Reel de @secretchords72 guardado. "${story.title}" ya es visible en /en`
              : `✅ Reel guardado con éxito para: "${story.title}"`)
          : (isEn
              ? `⏳ Reel desvinculado. "${story.title}" volvió a estado privado en /en`
              : `⏳ Reel desvinculado para: "${story.title}"`)
      );
      setTimeout(() => setStatusMessage(''), 5000);
      setTimeout(() => setSavingStatus(prev => ({ ...prev, [story.id]: 'idle' })), 3000);
    } catch (err: any) {
      console.error('Error guardando reel:', err);
      const errMsg = err?.message || 'Error desconocido al guardar';
      setSavingStatus(prev => ({ ...prev, [story.id]: 'error' }));
      setRowErrors(prev => ({ ...prev, [story.id]: errMsg }));
      setStatusMessage(`❌ ${errMsg}`);
      setTimeout(() => setSavingStatus(prev => ({ ...prev, [story.id]: 'idle' })), 5000);
    }
  };

  const handleToggleVisibility = async (story: StoryAdminItem) => {
    const nextHidden = !story.isHidden;
    setTogglingVisibility(prev => ({ ...prev, [story.id]: true }));
    try {
      const res = await fetch('/api/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          slug: story.slug,
          slugEn: story.slugEn,
          articleSlug: story.articleSlug,
          isHidden: nextHidden,
          lang: mode
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      setStories(prev => prev.map(s => s.id === story.id ? { ...s, isHidden: nextHidden } : s));
      setStatusMessage(nextHidden
        ? (isEn
            ? `🔒 "${story.title}" ahora está OCULTA en la edición en inglés (/en)`
            : `🔒 "${story.title}" ahora está OCULTA de la web pública`)
        : (isEn
            ? `🟢 "${story.title}" ahora está VISIBLE en la edición en inglés (/en)`
            : `🟢 "${story.title}" ahora está VISIBLE para el público`)
      );
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err: any) {
      console.error('Error toggling visibility:', err);
      setStatusMessage(`❌ ${err?.message || 'Error al cambiar visibilidad'}`);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setTogglingVisibility(prev => ({ ...prev, [story.id]: false }));
    }
  };

  const handleCoverUpdated = (storyId: string, newCoverUrl: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, coverUrl: newCoverUrl } : s));
    setStatusMessage(`✅ Portada actualizada con éxito`);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  // Filtered stories calculation
  const filteredStories = useMemo(() => {
    const q = search.toLowerCase();
    return stories.filter(s => {
      const matchSearch =
        q === '' ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.slugEn || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (tab === 'pending') return !s.instagramUrl && !s.isHidden;
      if (tab === 'linked') return Boolean(s.instagramUrl) && !s.isHidden;
      if (tab === 'hidden') return Boolean(s.isHidden);
      return true;
    });
  }, [stories, search, tab]);

  const hiddenCount = useMemo(() => stories.filter(s => Boolean(s.isHidden)).length, [stories]);
  const linkedCount = useMemo(() => stories.filter(s => Boolean(s.instagramUrl) && !s.isHidden).length, [stories]);
  const pendingCount = useMemo(() => stories.filter(s => !s.instagramUrl && !s.isHidden).length, [stories]);

  // 2. Render Main Admin Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Edition Switcher Bar (ES / EN) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#13110e] border border-[#26231e]">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin"
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
              !isEn
                ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40'
                : 'text-neutral-300 hover:text-amber-300 bg-[#1a1713] border border-[#2b2721]'
            }`}
          >
            <span>🇪🇸</span>
            <span>Panel Español (@acordesocultos72)</span>
          </a>
          <a
            href="/admin/en"
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
              isEn
                ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40'
                : 'text-neutral-300 hover:text-amber-300 bg-[#1a1713] border border-[#2b2721]'
            }`}
          >
            <span>🇺🇸</span>
            <span>Panel Inglés (@secretchords72)</span>
          </a>
        </div>

        <a
          href={isEn ? '/en' : '/'}
          target="_blank"
          rel="noopener"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-amber-300 bg-[#1a1713] border border-[#2b2721] hover:border-amber-500/40 transition-colors inline-flex items-center gap-1.5"
        >
          <span>{isEn ? 'Ver Secret Chords (/en)' : 'Ver Acordes Ocultos (/)'}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#24211c]">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold font-mono">
              {isEn ? 'Sesión Activa • Edición Inglés (@secretchords72)' : 'Sesión de Administrador Activa'}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-100 mt-1">
            {isEn ? 'Panel Editorial en Inglés (Secret Chords)' : 'Panel Editorial de Publicaciones'}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {isEn
              ? 'Pega el Reel ID (ej. DfXItzBxR_0) o URL de @secretchords72 para activar y publicar al instante la crónica extendida en /en.'
              : 'Gestiona Reels de Instagram, portadas, visibilidad pública y crónicas de Acordes Ocultos.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isEn && (
            <>
              {/* Cloud Studio Creation Button */}
              <a
                href="/admin/estudio"
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/30"
              >
                <span className="text-sm">✨</span>
                <span>Estudio Cloud (Crear Nueva)</span>
              </a>

              {/* Global Archive Browser Button */}
              <button
                type="button"
                onClick={() => setShowGlobalArchive(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/30"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Buscador de Archivo</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#14120f] border border-[#26231e] text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold">
              {linkedCount} Con Reel
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-semibold">
              {pendingCount} Pendientes
            </span>
            {hiddenCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 font-semibold">
                {hiddenCount} Ocultas
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300">
              {stories.length} Total
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-rose-400 bg-[#161411] border border-[#2b2721] hover:border-rose-500/30 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center justify-between shadow-lg">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-emerald-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <svg className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por canción, artista o slug..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14120f] border border-[#28251f] text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 text-xs"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#12100d] border border-[#221f1a] text-xs">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              tab === 'all' ? 'bg-amber-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Todas ({stories.length})
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              tab === 'pending' ? 'bg-amber-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ⚠️ Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setTab('linked')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              tab === 'linked' ? 'bg-amber-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ✅ Con Reel ({linkedCount})
          </button>
          <button
            onClick={() => setTab('hidden')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              tab === 'hidden' ? 'bg-rose-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            🔒 Ocultas ({hiddenCount})
          </button>
        </div>
      </div>

      {/* Stories Management List */}
      <div className="space-y-4">
        {filteredStories.length === 0 ? (
          <div className="text-center py-16 bg-[#13110e] rounded-2xl border border-[#22201b] p-8">
            <p className="text-sm text-neutral-400">No se encontraron historias con los filtros actuales.</p>
          </div>
        ) : (
          filteredStories.map(story => {
            const currentVal = inputs[story.id] || '';
            const status = savingStatus[story.id] || 'idle';
            const isLinked = Boolean(story.instagramUrl);
            const isPublic = isLinked && !story.isHidden;
            const storyHref = isEn
              ? `/en/stories/${story.slugEn || story.slug}${isPublic ? '' : '?preview=true'}`
              : `/historias/${story.slug}?preview=true`;

            return (
              <div
                key={story.id}
                className={`p-5 rounded-2xl bg-[#14120f] border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-lg shadow-black/40 ${
                  story.isHidden
                    ? 'border-rose-950/40 bg-[#120f0d]/80 opacity-90'
                    : !isLinked
                    ? 'border-amber-500/25 hover:border-amber-500/50'
                    : 'border-[#26231e] hover:border-amber-500/30'
                }`}
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-center gap-4 min-w-0 max-w-xl">
                  {/* Cover thumbnail (clickable to change cover in ES mode) */}
                  <div
                    onClick={!isEn ? () => setEditingCoverStory(story) : undefined}
                    className={`group relative w-16 h-20 rounded-xl overflow-hidden bg-neutral-900 border border-[#2a2620] flex-shrink-0 shadow-md ${!isEn ? 'cursor-pointer' : ''}`}
                    title={!isEn ? 'Haz clic para cambiar la portada' : story.title}
                  >
                    <img
                      src={story.coverUrl}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={e => { (e.target as HTMLImageElement).src = isEn ? '/brand/secret-chords-logo-sm.webp' : '/brand/acordes-ocultos-logo.png'; }}
                    />
                    {!isEn && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-bold text-amber-300 text-center px-1">
                        Cambiar Portada
                      </div>
                    )}
                    {isLinked && !story.isHidden && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500 border border-black shadow"></div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-500">
                        {story.artist || 'Artista'}
                      </span>
                      <span className="text-[10px] text-neutral-500">•</span>
                      <span className="text-[10px] text-neutral-400">
                        {story.categoryLabel}
                      </span>
                      <span className="text-[10px] text-neutral-500">•</span>
                      {story.isHidden ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {isEn ? '🔒 Oculta en /en' : '🔒 Oculta'}
                        </span>
                      ) : isLinked ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {isEn ? '🟢 Visible en /en' : '🟢 Pública'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {isEn ? '⏳ Pendiente de Reel EN (Privada)' : '⏳ Pendiente de Reel'}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-base font-bold text-neutral-100 truncate">
                      {story.title}
                    </h3>

                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <a
                        href={storyHref}
                        target="_blank"
                        rel="noopener"
                        className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>
                          {isEn
                            ? (isPublic ? 'Ver en /en' : 'Vista Previa EN')
                            : (isPublic ? 'Ver en la Web' : 'Vista Previa')}
                        </span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      {story.isHidden && (
                        <span className="text-neutral-500 text-[11px] italic">
                          (Oculto)
                        </span>
                      )}

                      {story.instagramUrl && (
                        <a
                          href={story.instagramUrl}
                          target="_blank"
                          rel="noopener"
                          className="text-neutral-400 hover:text-rose-400 font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>{isEn ? 'Probar Reel (@secretchords72)' : 'Probar Reel'}</span>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Input Field & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow max-w-xl">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={currentVal}
                      onChange={e => handleInputChange(story.id, e.target.value)}
                      placeholder={
                        isEn
                          ? 'Pega el Reel ID (ej. DfXItzBxR_0) o URL de @secretchords72...'
                          : 'Pega el Reel ID o https://www.instagram.com/reel/...'
                      }
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-[#1a1714] border text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none transition-colors ${
                        isLinked
                          ? 'border-emerald-500/40 focus:border-emerald-500'
                          : 'border-[#332e26] focus:border-amber-500'
                      }`}
                    />
                    {rowErrors[story.id] && (
                      <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded mt-1 font-mono">
                        ⚠️ {rowErrors[story.id]}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {/* Paste Button */}
                    <button
                      type="button"
                      onClick={() => handlePaste(story.id)}
                      title="Pegar del portapapeles"
                      className="px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-300 bg-[#1e1b17] border border-[#332e26] hover:bg-[#26221c] transition-colors"
                    >
                      Pegar
                    </button>

                    {/* Save Button */}
                    <button
                      type="button"
                      disabled={status === 'saving'}
                      onClick={() => handleSave(story)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${
                        status === 'saving'
                          ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                          : status === 'saved'
                          ? 'bg-emerald-600 text-white'
                          : status === 'error'
                          ? 'bg-rose-600 text-white'
                          : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-md'
                      }`}
                    >
                      {status === 'saving' && <span>Guardando...</span>}
                      {status === 'saved' && <span>¡Listo! ✅</span>}
                      {status === 'error' && <span>Error ❌</span>}
                      {status === 'idle' && <span>Guardar</span>}
                    </button>

                    {!isEn && (
                      <>
                        {/* Cover Change Button */}
                        <button
                          type="button"
                          onClick={() => setEditingCoverStory(story)}
                          className="px-2.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-[#1a1713] border border-[#2e2922] hover:border-amber-500/40 hover:text-amber-300 transition-all flex items-center gap-1"
                          title="Cambiar portada de la publicación"
                        >
                          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="hidden xl:inline">Portada</span>
                        </button>
                      </>
                    )}

                    {/* Visibility Toggle Button */}
                    <button
                      type="button"
                      disabled={togglingVisibility[story.id]}
                      onClick={() => handleToggleVisibility(story)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                        story.isHidden
                          ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'text-neutral-400 bg-[#181512] border border-[#2a2620] hover:text-rose-400 hover:border-rose-500/30'
                      }`}
                      title={
                        story.isHidden
                          ? (isEn ? 'Hacer visible en /en' : 'Hacer pública en la web')
                          : (isEn ? 'Ocultar de /en' : 'Ocultar del público en la web')
                      }
                    >
                      <span>{story.isHidden ? '👁️ Publicar' : '👁️‍🗨️ Ocultar'}</span>
                    </button>

                    {!isEn && (
                      /* Edit Story & Photos Button */
                      <button
                        type="button"
                        onClick={() => setEditingStory(story)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 flex-shrink-0"
                        title="Editar crónica y gestionar fotos de archivo"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Editar Crónica</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Editorial Story Editor Modal */}
      {editingStory && (
        <StoryEditorModal
          isOpen={Boolean(editingStory)}
          onClose={() => setEditingStory(null)}
          story={editingStory}
          onSaveSuccess={(updatedContent, updatedExtraImages) => {
            setStories(prev =>
              prev.map(s =>
                s.id === editingStory.id
                  ? { ...s, content: updatedContent, extraImages: updatedExtraImages }
                  : s
              )
            );
            setStatusMessage(`✅ ¡Crónica y fotos actualizadas para "${editingStory.title}"!`);
            setTimeout(() => setStatusMessage(''), 5000);
            setEditingStory(null);
          }}
        />
      )}

      {/* Cover Selector Modal */}
      {editingCoverStory && (
        <CoverSelectorModal
          isOpen={Boolean(editingCoverStory)}
          onClose={() => setEditingCoverStory(null)}
          story={editingCoverStory}
          onSuccess={(newCover) => handleCoverUpdated(editingCoverStory.id, newCover)}
        />
      )}

      {/* Global Archive Image Browser Modal */}
      {showGlobalArchive && (
        <ArchiveImageBrowserModal
          isOpen={showGlobalArchive}
          onClose={() => setShowGlobalArchive(false)}
        />
      )}

    </div>
  );
}
