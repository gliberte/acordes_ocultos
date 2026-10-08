import React, { useState, useRef, useEffect } from 'react';

import { generatedStory, potentialAnalysis } from '../lib/studio-contract';
import type { GeneratedStoryData, PotentialAnalysis } from '../lib/studio-contract';
import { DRAFT_KEY, parseDraft } from '../lib/studio-draft';
import type { StudioDraft } from '../lib/studio-draft';

export default function CloudStudio() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<PotentialAnalysis | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form Inputs
  const [song, setSong] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [category, setCategory] = useState<string>('acordes-ocultos');
  const [audioMode, setAudioMode] = useState<string>('official-library');
  const [notes, setNotes] = useState<string>('');

  // Generated Editorial Data
  const [storyData, setStoryData] = useState<GeneratedStoryData | null>(null);
  const [activeTab, setActiveTab] = useState<'90s' | '60s' | 'copys' | 'chronicle'>('90s');

  // Visuals State
  const [images, setImages] = useState<Record<string | number, string>>({});
  const [generatingImages, setGeneratingImages] = useState<boolean>(false);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<string | number | null>(null);
  const [editingPromptModal, setEditingPromptModal] = useState<{ scene: number | string; prompt: string } | null>(null);

  // File Upload Reference for Custom Archive Photos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetScene, setUploadTargetScene] = useState<number | string | null>(null);

  const [draftReady, setDraftReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const [draftBlocked, setDraftBlocked] = useState(false);
  const revision = useRef<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = parseDraft(raw);
        revision.current = draft.revision;
        setSong(draft.song); setArtist(draft.artist); setCategory(draft.category);
        setAudioMode(draft.audioMode); setNotes(draft.notes); setStep(draft.step);
        setStoryData(draft.storyData); setAnalysis(draft.analysis); setImages(draft.images);
        setDraftNotice('Borrador recuperado de este navegador.');
      }
      setDraftReady(true);
    } catch {
      setDraftBlocked(true);
      setDraftNotice('No se pudo recuperar el borrador. Se conserva sin sobrescribir; exporta tu trabajo actual antes de reiniciar.');
    }
    const changed = (event: StorageEvent) => {
      if (event.key === DRAFT_KEY) {
        setDraftBlocked(true);
        setDraftNotice('Otra pestaña cambió el borrador. El guardado se detuvo para evitar sobrescrituras. Exporta tu trabajo y vuelve a abrir el estudio.');
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  useEffect(() => {
    if (!draftReady || draftBlocked) return;
    const timer = window.setTimeout(() => {
      try {
        const current = localStorage.getItem(DRAFT_KEY);
        if ((current ? parseDraft(current).revision : null) !== revision.current) {
          setDraftBlocked(true); setDraftNotice('El borrador cambió en otra pestaña. Exporta tu trabajo antes de recargar.'); return;
        }
        const draft: StudioDraft = { version: 1, revision: crypto.randomUUID(), updatedAt: new Date().toISOString(), step,
          song, artist, category, audioMode, notes, storyData, analysis, images };
        const raw = JSON.stringify(draft);
        parseDraft(raw);
        localStorage.setItem(DRAFT_KEY, raw);
        revision.current = draft.revision;
        setDraftNotice('Borrador guardado en este navegador.');
      } catch { setDraftNotice('No se pudo guardar el borrador. Exporta una copia antes de cerrar.'); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draftReady, draftBlocked, step, song, artist, category, audioMode, notes, storyData, analysis, images]);
  const exportDraft = () => {
    const draft: StudioDraft = { version: 1, revision: crypto.randomUUID(), updatedAt: new Date().toISOString(), step,
      song, artist, category, audioMode, notes, storyData, analysis, images };
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${storyData?.slug || 'borrador'}-estudio.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Step 0: Analyze Potential
  const handleAnalyzePotential = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!song.trim() || !artist.trim()) {
      setErrorMessage('Por favor ingresa la canción y el artista para auditar el potencial.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage('');
    setStatusMessage(`🔍 Auditando potencial viral, tensión dramática y hondura humana de "${song}" de "${artist}"...`);

    try {
      const res = await fetch('/api/admin/studio/analyze-potential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song: song.trim(),
          artist: artist.trim(),
          category,
          notes: notes.trim()
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Error HTTP ${res.status}`);
      }

      setAnalysis(potentialAnalysis(json.analysis));
      setStatusMessage(`✅ Análisis completado con éxito. Puntaje asignado: ${json.analysis.score} / 10.`);
    } catch (err: any) {
      console.error('Error analizando potencial:', err);
      setErrorMessage(err.message || 'Error evaluando el tema musical');
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 1: Generate Story & Chronicle via LLM
  const handleGenerateStory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!song.trim() || !artist.trim()) {
      setErrorMessage('Por favor ingresa tanto el nombre de la canción como el artista.');
      return;
    }

    if (generatingImages || currentGeneratingIndex !== null) { setErrorMessage('Espera a que termine la generación visual antes de cambiar de historia.'); return; }
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('🧠 Investigando contexto histórico, redactando guion dual y componiendo crónica...');

    try {
      const res = await fetch('/api/admin/studio/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song: song.trim(),
          artist: artist.trim(),
          category,
          audioMode,
          notes: notes.trim()
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Error HTTP ${res.status}`);
      }

      setStoryData(generatedStory(json.data));
      setImages({});
      setAnalysis(null);
      setStep(2);
      setStatusMessage('✅ Guion y crónica generados con éxito. Revisa el contenido antes de continuar.');
    } catch (err: any) {
      console.error('Error generando historia:', err);
      setErrorMessage(err.message || 'Error desconocido al contactar con la IA');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Visual Generation Actions with Google Flow PRO
  const generateSingleImage = async (sceneNumber: number | string, promptText?: string): Promise<string | null> => {
    if (!storyData || generatingImages || currentGeneratingIndex !== null) return null;
    setCurrentGeneratingIndex(sceneNumber);
    setErrorMessage('');
    setStatusMessage(`🌊 Regenerando ${sceneNumber === 'cover' ? 'Portada Oficial' : `Escena ${sceneNumber}`} con Google Flow PRO...`);

    let updatedStory = { ...storyData };
    if (promptText) {
      if (sceneNumber === 'cover') {
        updatedStory.coverPrompt = promptText;
      } else {
        updatedStory.scenes90s = storyData.scenes90s.map(s => s.scene === sceneNumber ? { ...s, prompt: promptText } : s);
      }
      setStoryData(updatedStory);
    }

    try {
      const res = await fetch('/api/admin/studio/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyData: updatedStory,
          sceneNumber,
          force: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      const newUrl = data.singleImageUrl || (data.images && data.images[sceneNumber]);
      if (newUrl) {
        setImages(prev => ({ ...prev, [sceneNumber]: newUrl }));
        setStatusMessage(`✅ ${sceneNumber === 'cover' ? 'Portada' : `Escena ${sceneNumber}`} actualizada con éxito.`);
        return newUrl;
      }
      return null;
    } catch (err: any) {
      console.error(`Error generando escena ${sceneNumber}:`, err);
      setErrorMessage(`Error en escena ${sceneNumber}: ${err.message}`);
      return null;
    } finally {
      setCurrentGeneratingIndex(null);
    }
  };

  // Generate All 10 Images with Google Flow PRO
  const handleGenerateAllImages = async () => {
    if (!storyData || generatingImages || currentGeneratingIndex !== null) return;
    setGeneratingImages(true);
    setErrorMessage('');
    setStatusMessage('🌊 Iniciando Google Flow PRO para las 10 imágenes (Portada + 9 escenas)...');

    try {
      const res = await fetch('/api/admin/studio/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyData,
          sceneNumber: 'all',
          force: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error ejecutando Google Flow');
      }

      if (data.images) {
        setImages(prev => ({ ...prev, ...data.images }));
      }
      setStatusMessage(`✅ Generación completada: ${Object.keys(data.images || {}).length} imágenes recibidas.`);
    } catch (err: any) {
      console.error('Error generando imágenes:', err);
      setErrorMessage(err.message || 'Error en generación con Google Flow');
    } finally {
      setGeneratingImages(false);
    }
  };

  // Upload Custom Archive Photo for a Scene
  const handleTriggerUpload = (sceneNum: number | string) => {
    setUploadTargetScene(sceneNum);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadTargetScene === null || !storyData) return;

    setStatusMessage(`📁 Subiendo fotografía histórica para ${uploadTargetScene === 'cover' ? 'Portada' : `Escena ${uploadTargetScene}`}...`);
    const targetScene = uploadTargetScene;
    const targetStory = storyData;
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: `${targetStory.slug}-${targetScene}.jpg`,
            mimeType: file.type || 'image/jpeg',
            storySlug: targetStory.slug
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error subiendo imagen');
        }

        setImages(prev => ({ ...prev, [targetScene]: data.imageUrl }));
        setStatusMessage(`✅ Foto histórica asignada con éxito a ${uploadTargetScene === 'cover' ? 'Portada' : `Escena ${uploadTargetScene}`}`);
      } catch (err: any) {
        console.error('Error subiendo foto:', err);
        setErrorMessage(err.message || 'Error al subir la fotografía');
      }
    };

    reader.readAsDataURL(file);
  };

  // Update scene subtitle inline
  const handleUpdateSubtitle90s = (sceneNum: number, text: string) => {
    if (!storyData) return;
    setStoryData({
      ...storyData,
      scenes90s: storyData.scenes90s.map(s => s.scene === sceneNum ? { ...s, subtitle: text } : s)
    });
  };

  const handleUpdateSubtitle60s = (sceneNum: number, text: string) => {
    if (!storyData) return;
    setStoryData({
      ...storyData,
      scenes60s: storyData.scenes60s.map(s => s.scene === sceneNum ? { ...s, subtitle: text } : s)
    });
  };

  const handleSaveEditedPrompt = () => {
    if (!editingPromptModal || !storyData) return;
    const { scene, prompt } = editingPromptModal;

    if (scene === 'cover') {
      setStoryData({ ...storyData, coverPrompt: prompt });
    } else {
      setStoryData({
        ...storyData,
        scenes90s: storyData.scenes90s.map(s => s.scene === scene ? { ...s, prompt } : s)
      });
    }

    setEditingPromptModal(null);
    // Regenerate immediately with new prompt
    generateSingleImage(scene, prompt);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
        <p role="status">{draftNotice || 'El borrador se guardará en este navegador; exporta una copia para conservarlo fuera del dispositivo.'}</p>
        <button type="button" onClick={exportDraft} className="px-3 py-2 rounded border border-amber-500/30 text-amber-300">Exportar borrador</button>
      </div>
      {/* Hidden File Input for Archive Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#24211c]">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold font-mono">
              Cloud Studio • Mesa de Creación
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-100 mt-1">
            Estudio de Producción en la Nube
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Crea piezas maestras completas (Reels 90s, TikTok 60s, Portadas y Crónica para Substack) sin consumir recursos locales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/admin"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-100 bg-[#14120f] border border-[#2b2721] hover:border-neutral-600 transition-colors"
          >
            ← Volver al Catálogo
          </a>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { num: 1, title: '1. Parámetros', desc: 'Canción y enfoque' },
          { num: 2, title: '2. Revisión Editorial', desc: 'Guion dual y crónica' },
          { num: 3, title: '3. Curaduría Visual', desc: '9 Escenas + Portada' },
          { num: 4, title: '4. Render Cloud', desc: 'Remotion y Telegram' },
        ].map(item => (
          <div
            key={item.num}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              step === item.num
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-950/20'
                : step > item.num
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#14120f] border-[#22201c] text-neutral-500'
            }`}
          >
            <div className="text-xs font-bold font-mono">{item.title}</div>
            <div className="text-[11px] text-neutral-400">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3 animate-fade-in">
          <span className="text-base">💡</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: FORM INPUT */}
      {step === 1 && (
        <div className="bg-[#14120f] border border-[#24211c] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#24211c] pb-4">
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <span>🎵</span> Parámetros de la Canción y Enfoque Histórico
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              La IA investigará los archivos hemerográficos para extraer el conflicto humano, el drama real y el milagro de la historia.
            </p>
          </div>

          <form onSubmit={handleGenerateStory} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                  Título de la Canción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Jealous Guy, Son of a Preacher Man..."
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0c0a] border border-[#2b2721] text-neutral-100 text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                  Artista o Banda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. John Lennon, Dusty Springfield, Tormenta..."
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0c0a] border border-[#2b2721] text-neutral-100 text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                  Línea Editorial / Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0c0a] border border-[#2b2721] text-neutral-100 text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
                >
                  <option value="acordes-ocultos">Acordes Ocultos (Anécdota, misterio y conflicto humano)</option>
                  <option value="historia-en-los-acordes">Historia en los Acordes (La narrativa dentro de la letra)</option>
                  <option value="destellos-de-gloria">Destellos de Gloria (9 hitos de estrellas fugaces)</option>
                  <option value="catedrales-de-leyenda">Catedrales de Leyenda (9 hitos de monumentos vivos)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                  Modo de Audio
                </label>
                <select
                  value={audioMode}
                  onChange={(e) => setAudioMode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0c0a] border border-[#2b2721] text-neutral-100 text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
                >
                  <option value="official-library">
                    🚀 Modo Librería Oficial (Recomendado: Video visual puro para vincular canción en IG/TikTok)
                  </option>
                  <option value="baked-audio">
                    🎵 Modo Audio Mezclado (Video con pista de audio pre-mezclada)
                  </option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  {audioMode === 'official-library'
                    ? '💡 Máximo alcance algorítmico y cero strikes de copyright al seleccionar la canción oficial en la app.'
                    : 'ℹ️ Incrusta la pista sonora directamente en el archivo MP4 generado.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Notas, Hechos Reales o Giro Histórico (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Indica cualquier detalle clave que deba enfatizarse (ej. censura en dictadura, reconciliación íntima, año fatídico, anécdota de estudio...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0d0c0a] border border-[#2b2721] text-neutral-100 text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-[#24211c] flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-500">
                Audita la tensión dramática y la fibra humana antes de comprometer producción.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAnalyzePotential()}
                  disabled={analyzing || loading}
                  className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 text-amber-300 transition-all shadow-lg shadow-amber-950/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Auditando Potencial...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍 1. Analizar Potencial (1 - 10)</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={loading || analyzing}
                  className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Generando Historia...</span>
                    </>
                  ) : (
                    <>
                      <span>✨ Generar Guion y Crónica</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Interactive Potential Analysis Card */}
          {analysis && (
            <div className="mt-8 pt-6 border-t border-[#2b2721] space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#0d0c0a] border border-[#2b2721]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                      Veredicto Editorial
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                      {analysis.categoryRecommendation || category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-100">
                    {analysis.verdict}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`px-5 py-2.5 rounded-xl font-mono font-black text-2xl border shadow-xl flex items-center gap-1.5 ${
                    analysis.score >= 8.5
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : analysis.score >= 7.0
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  }`}>
                    <span>{analysis.score.toFixed(1)}</span>
                    <span className="text-xs text-neutral-400 font-normal">/ 10</span>
                  </div>
                </div>
              </div>

              {/* Grid of Key Diagnostic Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Hook of Second Zero */}
                <div className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    🎯 Gancho de Segundo Cero Recomendado
                  </span>
                  <p className="text-neutral-200 italic font-medium">
                    "{analysis.oneLineHook}"
                  </p>
                </div>

                {/* Human Conflict */}
                <div className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                    ❤️ Conflicto Humano Central
                  </span>
                  <p className="text-neutral-300">
                    {analysis.humanConflict}
                  </p>
                </div>
              </div>

              {/* Viral Components & Metaphor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    🔥 Factores de Retención y Viralidad
                  </span>
                  <ul className="space-y-1 text-neutral-300">
                    {(analysis.viralComponents || []).map((comp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    💡 Metáfora Visual de Cierre (Escena 09)
                  </span>
                  <p className="text-neutral-300">
                    {analysis.metaphorClosingIdea || 'Metáfora reflexiva ligada al corazón lírico del tema.'}
                  </p>
                  {analysis.riskOrWeakness && (
                    <div className="text-[11px] text-amber-400/90 pt-1 border-t border-[#24211c]">
                      ⚠️ <strong>Cuidado editorial:</strong> {analysis.riskOrWeakness}
                    </div>
                  )}
                </div>
              </div>

              {/* Editorial Summary */}
              {analysis.verdictDetail && (
                <div className="p-4 rounded-xl bg-[#14120f] border border-[#24211c] text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-amber-300 font-mono text-[10px] uppercase tracking-wider block mb-1">
                    Dictamen del Consejo Editorial
                  </strong>
                  <p className="mb-2 text-neutral-400">Valoración editorial sin calibración con métricas orgánicas. Las fuentes y afirmaciones históricas requieren contrastación.</p>
                  {analysis.verdictDetail}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAnalysis(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 bg-[#0d0c0a] border border-[#2b2721]"
                >
                  ✕ Descartar Evaluación
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateStory()}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  <span>🚀 Proceder a Generar Historia y Crónica</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: EDITORIAL REVIEW & APPROVAL */}
      {step === 2 && storyData && (
        <div className="bg-[#14120f] border border-[#24211c] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24211c] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                {storyData.topic} • {storyData.artist}
              </span>
              <h2 className="text-xl font-bold text-neutral-100 mt-0.5">
                {storyData.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-neutral-200 bg-[#0d0c0a] border border-[#2b2721]"
              >
                Editar Parámetros
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Aprobar y Pasar a Visuales</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-[#24211c] gap-4 text-xs font-semibold">
            {[
              { id: '90s', label: '🎬 Subtítulos Reels (90s)' },
              { id: '60s', label: '📱 Subtítulos TikTok (60s)' },
              { id: 'copys', label: '📝 Copys & Hashtags' },
              { id: 'chronicle', label: '📰 Crónica Substack' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-amber-400 text-amber-300 font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: 90s Subtitles */}
          {activeTab === '90s' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                Calibrados a 18-24 palabras por escena. Escena 09 es estrictamente una metáfora reflexiva.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storyData.scenes90s.map(scene => (
                  <div key={scene.scene} className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-400 font-mono">Escena {String(scene.scene).padStart(2, '0')}</span>
                      <span className="text-[10px] text-neutral-400">{scene.subtitle.split(/\s+/).filter(Boolean).length} palabras</span>
                    </div>
                    <textarea
                      rows={3}
                      value={scene.subtitle}
                      onChange={(e) => handleUpdateSubtitle90s(scene.scene, e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-[#14120f] border border-[#24211c] text-xs text-neutral-200 focus:outline-none focus:border-amber-400/50"
                    />
                    {scene.prompt && (
                      <p className="text-[10px] text-neutral-400 italic">
                        <strong>Prompt Visual:</strong> {scene.prompt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: 60s TikTok Subtitles */}
          {activeTab === '60s' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                Condensados a 12-16 palabras con protocolo de suavizado léxico (TikTok-Proofing).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storyData.scenes60s.map(scene => (
                  <div key={scene.scene} className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-400 font-mono">TikTok Escena {String(scene.scene).padStart(2, '0')}</span>
                      <span className="text-[10px] text-neutral-400">{scene.subtitle.split(/\s+/).filter(Boolean).length} palabras</span>
                    </div>
                    <textarea
                      rows={2}
                      value={scene.subtitle}
                      onChange={(e) => handleUpdateSubtitle60s(scene.scene, e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-[#14120f] border border-[#24211c] text-xs text-neutral-200 focus:outline-none focus:border-emerald-400/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Copys & Hashtags */}
          {activeTab === 'copys' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-200">
                  <span>📸 Copy para Instagram Reels</span>
                  <span className="text-amber-400 font-mono">{storyData.copys.instagram.length} caracteres</span>
                </div>
                <textarea
                  rows={14}
                  value={storyData.copys.instagram}
                  onChange={(e) => setStoryData({
                    ...storyData,
                    copys: { ...storyData.copys, instagram: e.target.value }
                  })}
                  className="w-full p-3 rounded-lg bg-[#14120f] border border-[#24211c] text-xs text-neutral-200 font-mono leading-relaxed"
                />
              </div>

              <div className="p-5 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-200">
                  <span>📱 Copy para TikTok</span>
                  <span className="text-emerald-400 font-mono">{storyData.copys.tiktok.length} caracteres</span>
                </div>
                <textarea
                  rows={14}
                  value={storyData.copys.tiktok}
                  onChange={(e) => setStoryData({
                    ...storyData,
                    copys: { ...storyData.copys, tiktok: e.target.value }
                  })}
                  className="w-full p-3 rounded-lg bg-[#14120f] border border-[#24211c] text-xs text-neutral-200 font-mono leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Substack Chronicle */}
          {activeTab === 'chronicle' && (
            <div className="p-5 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-neutral-200">
                <span>📰 Crónica para Substack: {storyData.chronicle.title}</span>
                <span className="text-amber-400 font-mono">
                  ~{storyData.chronicle.markdown.split(/\s+/).filter(Boolean).length} palabras
                </span>
              </div>
              <textarea
                rows={18}
                value={storyData.chronicle.markdown}
                onChange={(e) => setStoryData({
                  ...storyData,
                  chronicle: { ...storyData.chronicle, markdown: e.target.value }
                })}
                className="w-full p-4 rounded-xl bg-[#14120f] border border-[#24211c] text-xs text-neutral-200 font-mono leading-relaxed"
              />
            </div>
          )}
        </div>
      )}

      {/* STEP 3: VISUALS REVIEW GATE */}
      {step === 3 && storyData && (
        <div className="bg-[#14120f] border border-[#24211c] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24211c] pb-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <span>🖼️</span> Mesa de Control Visual y Fisonómica (10 Imágenes)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Genera las 9 escenas + Portada con motor FLUX 9:16 o sube fotos históricas reales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStep(2)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-neutral-200 bg-[#0d0c0a] border border-[#2b2721]"
              >
                ← Volver al Guion
              </button>

              <button
                type="button"
                onClick={handleGenerateAllImages}
                disabled={generatingImages || currentGeneratingIndex !== null}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {generatingImages ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Generando ({currentGeneratingIndex !== null ? `Escena ${currentGeneratingIndex}` : '...'})</span>
                  </>
                ) : (
                  <>
                    <span>🎨 Generar Todas las Imágenes</span>
                  </>
                )}
              </button>

              <button
                disabled={generatingImages || currentGeneratingIndex !== null || ['cover',1,2,3,4,5,6,7,8,9].some(index => !images[index])}
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Aprobar y Pasar al Render</span>
                <span>🚀</span>
              </button>
            </div>
          </div>

          {/* Cards Grid: 1 Cover + 9 Scenes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {/* Card 0: Cover Background */}
            <div className="p-3.5 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-amber-400 font-mono">Portada Oficial</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                    Cover 9:16
                  </span>
                </div>

                <div className="aspect-[9/16] bg-[#14120f] border border-[#24211c] rounded-lg overflow-hidden flex flex-col items-center justify-center text-center relative group">
                  {images['cover'] ? (
                    <img
                      src={images['cover']}
                      alt="Portada Oficial"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : currentGeneratingIndex === 'cover' ? (
                    <div className="p-4 flex flex-col items-center gap-2">
                      <span className="animate-spin text-2xl">⏳</span>
                      <span className="text-[11px] text-amber-400 font-mono">Generando imagen...</span>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      <div className="text-2xl">📸</div>
                      <div className="text-[11px] text-neutral-400 line-clamp-4">
                        {storyData.coverPrompt || `Retrato vertical de ${storyData.artist}`}
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-neutral-950/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => setEditingPromptModal({ scene: 'cover', prompt: storyData.coverPrompt || `Vertical 9:16 portrait of ${storyData.artist}, iconic studio photograph` })}
                      className="w-full py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-[11px] font-bold"
                    >
                      🔄 Regenerar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload('cover')}
                      className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold"
                    >
                      📁 Subir Archivo
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-neutral-400 font-medium truncate">
                {storyData.song} — {storyData.artist}
              </div>
            </div>

            {/* Cards 1 to 9 */}
            {storyData.scenes90s.map(scene => {
              const currentImg = images[scene.scene];
              const isGenerating = currentGeneratingIndex === scene.scene;

              return (
                <div key={scene.scene} className="p-3.5 rounded-xl bg-[#0d0c0a] border border-[#2b2721] space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-2">
                      <span className="text-amber-400 font-mono">Escena {String(scene.scene).padStart(2, '0')}</span>
                      {scene.scene === 9 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] uppercase tracking-wider font-mono">
                          Metáfora
                        </span>
                      )}
                    </div>

                    <div className="aspect-[9/16] bg-[#14120f] border border-[#24211c] rounded-lg overflow-hidden flex flex-col items-center justify-center text-center relative group">
                      {currentImg ? (
                        <img
                          src={currentImg}
                          alt={`Escena ${scene.scene}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : isGenerating ? (
                        <div className="p-4 flex flex-col items-center gap-2">
                          <span className="animate-spin text-2xl">⏳</span>
                          <span className="text-[11px] text-amber-400 font-mono">Generando imagen...</span>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          <div className="text-2xl">📸</div>
                          <div className="text-[11px] text-neutral-400 line-clamp-4">
                            {scene.prompt || scene.subtitle}
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-neutral-950/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => setEditingPromptModal({ scene: scene.scene, prompt: scene.prompt || `${scene.subtitle}, cinematic 35mm film photograph of ${storyData.artist}` })}
                          className="w-full py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-[11px] font-bold"
                        >
                          🔄 Regenerar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(scene.scene)}
                          className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold"
                        >
                          📁 Subir Archivo
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 line-clamp-2 italic leading-snug">
                    "{scene.subtitle}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROMPT & REGENERATE */}
      {editingPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14120f] border border-[#2b2721] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#24211c] pb-3">
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span>🎨</span> Regenerar {editingPromptModal.scene === 'cover' ? 'Portada Oficial' : `Escena ${editingPromptModal.scene}`}
              </h3>
              <button
                onClick={() => setEditingPromptModal(null)}
                className="text-neutral-500 hover:text-neutral-300 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Prompt Visual (en inglés con especificaciones fisonómicas y de época)
              </label>
              <textarea
                rows={4}
                value={editingPromptModal.prompt}
                onChange={(e) => setEditingPromptModal({ ...editingPromptModal, prompt: e.target.value })}
                className="w-full p-3 rounded-xl bg-[#0d0c0a] border border-[#2b2721] text-xs text-neutral-100 font-mono leading-relaxed focus:outline-none focus:border-amber-400/50"
              />
              <p className="text-[11px] text-neutral-500">
                Tip: Incluye época (ej. 1971), vestimenta, iluminación cinematográfica y detalles del rostro del artista.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPromptModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 bg-[#0d0c0a] border border-[#2b2721]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedPrompt}
                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-lg shadow-amber-500/20"
              >
                Regenerar Imagen Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: RENDER & DEPLOY */}
      {step === 4 && storyData && (
        <div className="bg-[#14120f] border border-[#24211c] rounded-2xl p-6 sm:p-8 space-y-6 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl mx-auto">
              🚀
            </div>
            <h2 className="text-xl font-bold text-neutral-100">
              Paquete editorial en revisión
            </h2>
            <p className="text-xs text-neutral-400">
              El renderizado y despacho en la nube están pendientes de conexión. Puedes guardar el borrador y revisar los diez visuales.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d0c0a] border border-[#2b2721] max-w-lg mx-auto text-left text-xs space-y-2 text-neutral-300">
            <div className="flex justify-between">
              <span className="text-neutral-400">Canción / Artista:</span>
              <span className="font-semibold text-neutral-100">{storyData.song} — {storyData.artist}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Categoría:</span>
              <span className="font-semibold text-amber-300">{storyData.topic}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Modo de Audio:</span>
              <span className="font-semibold text-emerald-300">{storyData.audioMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Imágenes Listas:</span>
              <span className="font-semibold text-neutral-100">{Object.keys(images).length} / 10 generadas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Destinos:</span>
              <span className="font-semibold text-neutral-100">Telegram Bot, Cloudflare R2, Supabase DB</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 bg-[#0d0c0a] border border-[#2b2721]"
            >
              ← Volver a Visuales
            </button>
            <button
              type="button"
              disabled
              title="El worker de renderizado todavía no está conectado"
              className="px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-neutral-700 text-neutral-400 cursor-not-allowed transition-all flex items-center gap-2"
            >
              <span>Renderizado pendiente de conexión</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
