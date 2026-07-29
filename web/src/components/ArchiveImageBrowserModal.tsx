import React, { useState, useEffect, useMemo } from 'react';
import type { ArchiveImageItem } from '../lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (image: ArchiveImageItem) => void;
  actionLabel?: string;
  modalTitle?: string;
}

export default function ArchiveImageBrowserModal({
  isOpen,
  onClose,
  onSelectImage,
  actionLabel = 'Seleccionar Imagen',
  modalTitle = 'Buscador Global de Archivo (Supabase & Cloudflare)'
}: Props) {
  const [images, setImages] = useState<ArchiveImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cover' | 'scene' | 'teaser' | 'extra'>('all');
  const [selectedPreview, setSelectedPreview] = useState<ArchiveImageItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string>('');

  const fetchImages = async (refresh: boolean = false) => {
    setLoading(true);
    setError('');
    try {
      const pw = sessionStorage.getItem('acordes_admin_pw') || '';
      const res = await fetch('/api/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: pw,
          refresh
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar el archivo de imágenes');
      }

      setImages(data.items || []);
    } catch (err: any) {
      setError(err?.message || 'No se pudo conectar con el archivo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && images.length === 0) {
      fetchImages();
    }
  }, [isOpen]);

  const filteredImages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return images.filter(img => {
      if (typeFilter !== 'all' && img.type !== typeFilter) return false;
      if (!q) return true;
      const matchTitle = (img.title || '').toLowerCase().includes(q);
      const matchArtist = (img.artist || '').toLowerCase().includes(q);
      const matchSlug = (img.storySlug || '').toLowerCase().includes(q);
      const matchCaption = (img.caption || '').toLowerCase().includes(q);
      return matchTitle || matchArtist || matchSlug || matchCaption;
    });
  }, [images, search, typeFilter]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#12100d] border border-[#2b2721] rounded-2xl shadow-2xl overflow-hidden text-neutral-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24211c] bg-[#161411]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-neutral-100">
                {modalTitle}
              </h2>
              <p className="text-xs text-neutral-400">
                {images.length > 0 ? `${filteredImages.length} de ${images.length} imágenes encontradas` : 'Cargando archivo histórico...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchImages(true)}
              disabled={loading}
              title="Sincronizar archivo con Supabase y Cloudflare R2"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 bg-[#1e1b17] border border-[#332e26] hover:bg-[#292520] transition-colors flex items-center gap-1.5"
            >
              <svg className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#221f1a] bg-[#14120f] space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-grow">
              <svg className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por artista, canción, escena, palabras clave..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1c1915] border border-[#2d2922] text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'cover', label: 'Portadas' },
                { id: 'scene', label: 'Escenas' },
                { id: 'teaser', label: 'Teasers' },
                { id: 'extra', label: 'Fotos Extra' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    typeFilter === f.id
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-neutral-400 hover:text-neutral-200 bg-[#1a1714] border border-[#29251f]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Image Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
          {loading && images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-neutral-400">Consultando archivo de Supabase y Cloudflare R2...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
              ⚠️ {error}
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-20 bg-[#161411] rounded-2xl border border-[#24211b] p-8 space-y-2">
              <p className="text-sm text-neutral-300 font-medium">No se encontraron imágenes en el archivo</p>
              <p className="text-xs text-neutral-500">Prueba con otro término de búsqueda o cambia de filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredImages.map(item => {
                const isSelected = selectedPreview?.id === item.id;
                const isCopied = copiedUrl === item.url;

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-xl overflow-hidden bg-[#181512] border transition-all flex flex-col ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-[#29251f] hover:border-amber-500/40'
                    }`}
                  >
                    {/* Image Aspect Box */}
                    <div
                      onClick={() => setSelectedPreview(item)}
                      className="relative aspect-[9/16] bg-neutral-900 cursor-pointer overflow-hidden"
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/brand/acordes-ocultos-logo.png';
                        }}
                      />
                      
                      {/* Badge of type */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-[10px] uppercase font-bold tracking-wider text-amber-400 border border-amber-500/20 backdrop-blur-sm">
                        {item.type === 'cover' ? 'Carátula' : item.type === 'scene' ? `Escena ${item.sceneNumber || ''}` : item.type === 'teaser' ? 'Teaser' : 'Archivo'}
                      </span>

                      {/* Zoom Overlay icon */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-lg bg-black/80 text-[11px] font-semibold text-white border border-white/20">
                          🔍 Ver Zoom
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2 text-[11px]">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-200 truncate" title={item.title}>
                          {item.title}
                        </p>
                        {item.artist && (
                          <p className="text-[10px] text-amber-500 font-medium truncate">
                            {item.artist}
                          </p>
                        )}
                        {item.caption && (
                          <p className="text-[10px] text-neutral-400 line-clamp-1 italic mt-0.5" title={item.caption}>
                            "{item.caption}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        {/* Copy URL Button */}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleCopy(item.url);
                          }}
                          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#221f1a] text-neutral-300 hover:bg-[#2c2822]'
                          }`}
                        >
                          {isCopied ? '¡Copiada! ✓' : '📋 Copiar'}
                        </button>

                        {/* Select Button if callback provided */}
                        {onSelectImage && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onSelectImage(item);
                            }}
                            className="py-1 px-2.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black transition-all shadow"
                          >
                            {actionLabel}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lightbox Preview Drawer / Modal */}
        {selectedPreview && (
          <div className="p-4 border-t border-[#24211c] bg-[#161411] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-20 rounded-lg overflow-hidden bg-neutral-900 border border-[#2e2a23] flex-shrink-0">
                <img src={selectedPreview.url} alt={selectedPreview.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="font-serif text-sm font-bold text-neutral-100 truncate">
                  {selectedPreview.title}
                </h4>
                <p className="text-xs text-amber-400">
                  {selectedPreview.artist ? `${selectedPreview.artist} • ` : ''}{selectedPreview.type.toUpperCase()}
                </p>
                {selectedPreview.caption && (
                  <p className="text-xs text-neutral-300 italic line-clamp-2 max-w-xl">
                    "{selectedPreview.caption}"
                  </p>
                )}
                {selectedPreview.credit && (
                  <p className="text-[10px] text-neutral-500">
                    Crédito / Fuente: {selectedPreview.credit}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={selectedPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 bg-[#221f1a] hover:bg-[#2c2822] transition-colors"
              >
                Abrir en Grande ↗
              </a>

              <button
                type="button"
                onClick={() => handleCopy(selectedPreview.url)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  copiedUrl === selectedPreview.url
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#221f1a] text-neutral-200 hover:bg-[#2c2822]'
                }`}
              >
                {copiedUrl === selectedPreview.url ? '¡URL Copiada! ✓' : 'Copiar URL'}
              </button>

              {onSelectImage && (
                <button
                  type="button"
                  onClick={() => onSelectImage(selectedPreview)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg"
                >
                  {actionLabel}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedPreview(null)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
