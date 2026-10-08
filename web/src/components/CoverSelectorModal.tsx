import React, { useState } from 'react';
import type { StoryAdminItem } from './AdminPanel';
import ArchiveImageBrowserModal from './ArchiveImageBrowserModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  story: StoryAdminItem;
  onSuccess: (newCoverUrl: string) => void;
}

export default function CoverSelectorModal({ isOpen, onClose, story, onSuccess }: Props) {
  const [coverUrl, setCoverUrl] = useState<string>(story.coverUrl || '');
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showArchivePicker, setShowArchivePicker] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;

          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              filename: file.name,
              mimeType: file.type,
              storySlug: story.slug || 'covers'
            })
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Error subiendo imagen a Cloudflare R2');
          }

          setCoverUrl(data.url);
        } catch (uploadErr: any) {
          setError(uploadErr?.message || 'Error en la subida');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err?.message || 'No se pudo leer el archivo');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!coverUrl.trim()) {
      setError('Debes especificar una URL de portada');
      return;
    }

    setSaving(true);
    setError('');

    try {

      const res = await fetch('/api/update-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          slug: story.slug,
          title: story.title,
          artist: story.artist,
          coverUrl: coverUrl.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar la portada en Supabase');
      }

      onSuccess(coverUrl.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error guardando portada');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-xl bg-[#12100d] border border-[#2b2721] rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#24211c] bg-[#161411]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-neutral-100">
                  Cambiar Portada
                </h3>
                <p className="text-xs text-neutral-400 truncate max-w-sm">
                  {story.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Preview Box */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-[#161411] border border-[#24211b]">
              <div className="relative w-28 h-44 rounded-xl overflow-hidden bg-neutral-900 border border-[#2f2b23] shadow-lg flex-shrink-0">
                <img
                  src={coverUrl}
                  alt="Vista previa de portada"
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/brand/acordes-ocultos-logo.png';
                  }}
                />
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-amber-300 border border-amber-500/20">
                  9:16
                </span>
              </div>

              <div className="space-y-2 text-xs text-neutral-300">
                <h4 className="font-semibold text-neutral-100">Vista Previa de Carátula</h4>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Esta imagen se usará como portada principal en el feed de la web, cuadrícula de historias y Open Graph.
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowArchivePicker(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors flex items-center gap-1.5"
                  >
                    <span>🔍 Buscar en Archivo</span>
                  </button>

                  <label className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 bg-[#221f1a] border border-[#332e26] hover:bg-[#2b2720] transition-colors cursor-pointer flex items-center gap-1.5">
                    <span>{uploading ? 'Subiendo...' : '📁 Subir Archivo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-400">
                URL de la Imagen de Portada
              </label>
              <input
                type="text"
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181512] border border-[#2d2821] text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 text-xs font-mono"
              />
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#24211c] bg-[#161411]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-950/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando Portada...' : 'Guardar Portada'}
            </button>
          </div>

        </div>
      </div>

      {/* Global Archive Image Browser Nested Modal */}
      {showArchivePicker && (
        <ArchiveImageBrowserModal
          isOpen={showArchivePicker}
          onClose={() => setShowArchivePicker(false)}
          onSelectImage={item => {
            setCoverUrl(item.url);
            setShowArchivePicker(false);
          }}
          actionLabel="Usar como Portada"
          modalTitle="Elegir Portada desde el Archivo Histórico"
        />
      )}
    </>
  );
}
