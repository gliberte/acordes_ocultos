import React, { useState, useRef } from 'react';
import ArchiveImageBrowserModal from './ArchiveImageBrowserModal';
import type { ArchiveImageItem } from '../lib/types';

export interface ExtraImageItem {
  url: string;
  caption?: string;
  credit?: string;
}

interface StoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: {
    id: string;
    slug: string;
    title: string;
    artist: string;
    content: string;
    extraImages?: ExtraImageItem[];
  };
  onSaveSuccess: (updatedContent: string, updatedExtraImages: ExtraImageItem[]) => void;
}

export default function StoryEditorModal({
  isOpen,
  onClose,
  story,
  onSaveSuccess
}: StoryEditorModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'images'>('edit');
  const [content, setContent] = useState<string>(story.content || '');
  const [extraImages, setExtraImages] = useState<ExtraImageItem[]>(story.extraImages || []);
  
  // Image uploader state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageCaption, setImageCaption] = useState<string>('');
  const [imageCredit, setImageCredit] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccessUrl, setUploadSuccessUrl] = useState<string>('');
  const [showArchiveBrowser, setShowArchiveBrowser] = useState<boolean>(false);

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Formatting helpers
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError('');
    setUploadSuccessUrl('');

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    setUploadError('');
    setUploadSuccessUrl('');

    if (!selectedFile && !imageUrlInput.trim()) {
      setUploadError('Selecciona un archivo de imagen o ingresa una URL.');
      return;
    }

    // If using direct URL
    if (!selectedFile && imageUrlInput.trim()) {
      setUploadSuccessUrl(imageUrlInput.trim());
      return;
    }

    if (!selectedFile || !filePreview) return;

    setIsUploading(true);
    try {


      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: filePreview,
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          storySlug: story.slug
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error subiendo la imagen');
      }

      setUploadSuccessUrl(data.url);
      setSelectedFile(null);
      setFilePreview('');
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir la imagen a Cloudflare R2');
    } finally {
      setIsUploading(false);
    }
  };

  // Insert image into markdown text at cursor
  const insertImageIntoMarkdown = (url: string, caption?: string) => {
    const textarea = textareaRef.current;
    const imageMarkdown = `\n\n![${caption || 'Fotografía de archivo'}](${url})\n\n`;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);
      setContent(newContent);
    } else {
      setContent(prev => prev + imageMarkdown);
    }

    setSaveStatus('Foto insertada en el texto.');
    setTimeout(() => setSaveStatus(''), 3000);
    setActiveTab('edit');
  };

  // Add image to extra gallery
  const addToGallery = (url: string, caption?: string, credit?: string) => {
    if (!url) return;
    setExtraImages(prev => [
      ...prev,
      { url, caption: caption?.trim(), credit: credit?.trim() }
    ]);
    setSaveStatus('Foto añadida a la galería documental.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const removeGalleryImage = (index: number) => {
    setExtraImages(prev => prev.filter((_, i) => i !== index));
  };

  // Save story to Supabase
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveStatus('');

    try {


      const res = await fetch('/api/update-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          slug: story.slug,
          title: story.title,
          artist: story.artist,
          content: content.trim(),
          extraImages
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar la historia');
      }

      setSaveStatus('✅ ¡Crónica y fotos guardadas exitosamente!');
      onSaveSuccess(content.trim(), extraImages);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Error guardando en Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  // Word counter
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl h-[92vh] flex flex-col bg-[#12100d] border border-[#2c2822] rounded-2xl shadow-2xl shadow-black overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24201a] flex items-center justify-between bg-[#161410] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-500">
                Editor Editorial
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-xs text-neutral-400">{story.artist}</span>
            </div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-neutral-100 truncate max-w-xl">
              {story.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            title="Cerrar editor"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#24201a] bg-[#14120e] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'edit'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>✍️ Texto de la Crónica</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#201d18] text-neutral-400">
                {wordCount} palabras
              </span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'preview'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>👁️ Previsualizar Web</span>
            </button>

            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'images'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>🖼️ Fotos de Archivo</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#201d18] text-amber-400 font-mono">
                {extraImages.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500">
            <span>{charCount} caracteres</span>
          </div>
        </div>

        {/* Body Content by Tab */}
        <div className="flex-grow overflow-y-auto p-6 bg-[#0f0e0b]">
          
          {/* TAB 1: Edit Markdown */}
          {activeTab === 'edit' && (
            <div className="flex flex-col h-full space-y-3">
              
              {/* Quick Markdown Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#161410] border border-[#2b2720] rounded-xl text-xs flex-shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold px-2">
                  Formato:
                </span>
                
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**', 'texto en negrita')}
                  className="px-2.5 py-1 rounded bg-[#201d17] hover:bg-[#2c2820] text-neutral-200 font-bold"
                  title="Negrita"
                >
                  B
                </button>

                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*', 'texto en cursiva')}
                  className="px-2.5 py-1 rounded bg-[#201d17] hover:bg-[#2c2820] text-neutral-200 italic"
                  title="Cursiva"
                >
                  I
                </button>

                <button
                  type="button"
                  onClick={() => insertFormatting('### ', '\n', 'Subtítulo')}
                  className="px-2.5 py-1 rounded bg-[#201d17] hover:bg-[#2c2820] text-amber-300 font-serif font-bold"
                  title="Subtítulo H3"
                >
                  H3
                </button>

                <button
                  type="button"
                  onClick={() => insertFormatting('> «', '»', 'Cita textual')}
                  className="px-2.5 py-1 rounded bg-[#201d17] hover:bg-[#2c2820] text-neutral-200 font-serif"
                  title="Bloque de Cita"
                >
                  “ Cita ”
                </button>

                <button
                  type="button"
                  onClick={() => insertFormatting('\n---\n\n', '', '')}
                  className="px-2.5 py-1 rounded bg-[#201d17] hover:bg-[#2c2820] text-neutral-400"
                  title="Separador"
                >
                  — Divisor
                </button>

                <div className="h-4 w-px bg-neutral-700 mx-1" />

                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  className="px-3 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-medium"
                >
                  <span>📷 Subir / Insertar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowArchiveBrowser(true)}
                  className="px-3 py-1 rounded bg-[#201d17] hover:bg-[#2c2820] text-neutral-300 border border-[#332e26] flex items-center gap-1 font-medium"
                  title="Abrir buscador global de archivo"
                >
                  <span>🔍 Buscar en Archivo</span>
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Escribe o corrige la crónica en formato Markdown..."
                className="w-full flex-grow p-4 rounded-xl bg-[#14120e] border border-[#26221b] text-neutral-200 placeholder-neutral-600 font-sans text-sm sm:text-base leading-relaxed focus:outline-none focus:border-amber-500/50 resize-none font-light min-h-[360px]"
              />
            </div>
          )}

          {/* TAB 2: Live Preview */}
          {activeTab === 'preview' && (
            <div className="max-w-3xl mx-auto py-4 space-y-6">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300 mb-6 flex items-center justify-between">
                <span>Visualizando cómo se renderiza el texto en la página pública:</span>
                <span className="font-mono text-[11px]">{wordCount} palabras</span>
              </div>

              <div className="prose prose-invert prose-amber max-w-none text-neutral-300 leading-relaxed font-light font-sans">
                {content.split(/\n\n+/).map((p, idx) => {
                  const trimmed = p.trim();
                  if (!trimmed) return null;

                  // Heading
                  if (trimmed.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="font-serif text-xl sm:text-2xl font-bold text-amber-300 mt-8 mb-3">
                        {trimmed.replace(/^###\s*/, '')}
                      </h3>
                    );
                  }
                  if (trimmed.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="font-serif text-2xl sm:text-3xl font-bold text-neutral-100 mt-10 mb-4 border-b border-[#26231e] pb-2">
                        {trimmed.replace(/^##\s*/, '')}
                      </h2>
                    );
                  }

                  // Blockquote
                  if (trimmed.startsWith('> ')) {
                    return (
                      <blockquote key={idx} className="border-l-2 border-amber-500 bg-amber-500/5 my-6 py-3 px-5 text-sm sm:text-base text-neutral-200 italic font-serif leading-relaxed">
                        {trimmed.replace(/^>\s*/, '')}
                      </blockquote>
                    );
                  }

                  // Image Markdown ![alt](url)
                  const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
                  if (imgMatch) {
                    const [, alt, src] = imgMatch;
                    return (
                      <figure key={idx} className="my-8 rounded-xl overflow-hidden border border-[#2b2721] bg-[#12100d] shadow-xl">
                        <img src={src} alt={alt} className="w-full object-cover max-h-[500px]" />
                        {alt && (
                          <figcaption className="p-3 text-xs text-center text-neutral-400 font-sans italic border-t border-[#1f1d19]">
                            {alt}
                          </figcaption>
                        )}
                      </figure>
                    );
                  }

                  // Paragraph
                  return (
                    <p key={idx} className="my-4 text-neutral-300 text-sm sm:text-base leading-relaxed font-light">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Images & Archive Gallery */}
          {activeTab === 'images' && (
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Uploader Card */}
              <div className="p-6 bg-[#161410] border border-[#2c2720] rounded-2xl space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-bold text-neutral-100">
                    Subir Fotografía Documental a Cloudflare R2
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Las fotos se almacenan en el bucket CDN y quedan disponibles al instante en alta definición.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
                  <span>¿Deseas reutilizar una imagen existente de cualquier otra historia o escena?</span>
                  <button
                    type="button"
                    onClick={() => setShowArchiveBrowser(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors shadow"
                  >
                    🔍 Buscar en el Archivo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* File Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300">
                      1. Selecciona Archivo de Imagen
                    </label>
                    <div className="border-2 border-dashed border-[#383228] hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-[#110f0c]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="image-file-input"
                      />
                      <label htmlFor="image-file-input" className="cursor-pointer block">
                        {filePreview ? (
                          <div className="space-y-2">
                            <img src={filePreview} alt="Preview" className="max-h-36 mx-auto rounded-lg object-contain" />
                            <span className="text-[11px] text-amber-400 block truncate">{selectedFile?.name}</span>
                          </div>
                        ) : (
                          <div className="py-6 space-y-2 text-neutral-400">
                            <svg className="w-8 h-8 mx-auto text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs block text-neutral-300 font-medium">Haz clic o arrastra una foto aquí</span>
                            <span className="text-[10px] text-neutral-500 block">PNG, JPG, WEBP hasta 15MB</span>
                          </div>
                        )}
                      </label>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] text-neutral-500 block text-center mb-1">— o también —</span>
                      <input
                        type="text"
                        value={imageUrlInput}
                        onChange={e => setImageUrlInput(e.target.value)}
                        placeholder="Pega una URL directa de imagen (https://...)"
                        className="w-full px-3 py-2 rounded-xl bg-[#110f0c] border border-[#2b2720] text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-1">
                          2. Pie de Foto / Leyenda Documental
                        </label>
                        <input
                          type="text"
                          value={imageCaption}
                          onChange={e => setImageCaption(e.target.value)}
                          placeholder="Ej: Rueda de prensa en el Teatro Lope de Vega, 1985"
                          className="w-full px-3 py-2 rounded-xl bg-[#110f0c] border border-[#2b2720] text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-1">
                          3. Crédito / Archivo
                        </label>
                        <input
                          type="text"
                          value={imageCredit}
                          onChange={e => setImageCredit(e.target.value)}
                          placeholder="Ej: Archivo EFE / RTVE"
                          className="w-full px-3 py-2 rounded-xl bg-[#110f0c] border border-[#2b2720] text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Upload or Prepared URL button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={isUploading || (!selectedFile && !imageUrlInput.trim())}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-md"
                      >
                        {isUploading ? 'Subiendo a Cloudflare R2...' : 'Subir Imagen y Preparar'}
                      </button>

                      {uploadError && (
                        <p className="text-xs text-rose-400 mt-2 font-mono">⚠️ {uploadError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Success Card with Action Buttons */}
                {uploadSuccessUrl && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={uploadSuccessUrl} alt="Ready" className="w-16 h-16 rounded-lg object-cover border border-emerald-500/40" />
                      <div className="flex-grow min-w-0">
                        <span className="text-xs font-bold text-emerald-400 block">¡Imagen Lista en Cloudflare R2!</span>
                        <p className="text-[11px] text-neutral-300 truncate font-mono mt-0.5">{uploadSuccessUrl}</p>
                        {imageCaption && <p className="text-xs text-neutral-400 italic mt-0.5">«{imageCaption}»</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/20">
                      <button
                        type="button"
                        onClick={() => insertImageIntoMarkdown(uploadSuccessUrl, imageCaption)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors"
                      >
                        📝 Insertar en el Texto de la Crónica
                      </button>

                      <button
                        type="button"
                        onClick={() => addToGallery(uploadSuccessUrl, imageCaption, imageCredit)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#24211a] hover:bg-[#302b22] text-neutral-200 border border-[#3f392e] text-xs font-semibold transition-colors"
                      >
                        🖼️ Añadir a la Galería de Archivo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Images Gallery List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#24201a] pb-2">
                  <h3 className="font-serif text-base font-bold text-neutral-200 flex items-center gap-2">
                    <span>Fotografías en la Galería Documental</span>
                    <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {extraImages.length}
                    </span>
                  </h3>
                </div>

                {extraImages.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-[#2b2720] rounded-xl text-neutral-500 text-xs">
                    No hay fotografías adicionales en la galería de archivo aún. Sube una arriba y pulsa «Añadir a la Galería».
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {extraImages.map((img, idx) => (
                      <div key={idx} className="group relative bg-[#151310] border border-[#2b2720] rounded-xl overflow-hidden shadow-lg">
                        <div className="aspect-[4/3] bg-black/40 overflow-hidden">
                          <img src={img.url} alt={img.caption || 'Foto'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-xs text-neutral-200 line-clamp-2 font-sans font-light">
                            {img.caption || '(Sin descripción)'}
                          </p>
                          {img.credit && (
                            <p className="text-[10px] text-amber-500/80 uppercase tracking-wider font-mono truncate">
                              {img.credit}
                            </p>
                          )}
                        </div>

                        {/* Action buttons on card */}
                        <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-[#201d17] pt-2">
                          <button
                            type="button"
                            onClick={() => insertImageIntoMarkdown(img.url, img.caption)}
                            title="Insertar en la crónica"
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                          >
                            + En texto
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            title="Eliminar de la galería"
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Eliminar 🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer with Save / Status */}
        <div className="px-6 py-4 border-t border-[#24201a] bg-[#14120e] flex items-center justify-between flex-shrink-0">
          <div>
            {saveStatus && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                {saveStatus}
              </span>
            )}
            {saveError && (
              <span className="text-xs text-rose-400 font-mono">
                ⚠️ {saveError}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800/80 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios 💾'}
            </button>
          </div>
        </div>

      </div>

      {showArchiveBrowser && (
        <ArchiveImageBrowserModal
          isOpen={showArchiveBrowser}
          onClose={() => setShowArchiveBrowser(false)}
          onSelectImage={(item) => {
            setUploadSuccessUrl(item.url);
            setImageUrlInput(item.url);
            if (item.caption) setImageCaption(item.caption);
            if (item.artist || item.credit) setImageCredit(item.artist || item.credit || '');
            setShowArchiveBrowser(false);
            setActiveTab('images');
          }}
          actionLabel="Usar en esta Crónica"
          modalTitle="Elegir Imagen del Archivo Histórico"
        />
      )}
    </div>
  );
}
