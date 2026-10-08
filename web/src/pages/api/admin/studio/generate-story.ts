import type { APIRoute } from 'astro';
import { GoogleGenAI } from '@google/genai';
import { editorialInput, generatedStory, studioBody, StudioInputError } from '../../../../lib/studio-contract';

export const prerender = false;

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    '';

  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY no está configurada en las variables de entorno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let inputValidated = false;
  try {
    const { song, artist, category, audioMode, notes } = editorialInput(await studioBody(request, 20000));
    inputValidated = true;
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000 } });
    const deadline = AbortSignal.timeout(60000);

    const systemPrompt = `Eres el Director Editorial y Guionista Principal de «Acordes Ocultos», una cuenta de alta divulgación musical con millones de reproducciones.
Tu misión es generar el paquete narrativo completo para la canción "${song}" de "${artist}".
Categoría seleccionada: "${category}".
Modo de audio: "${audioMode}".
Notas adicionales del usuario: "${notes}".

REGLAS EDITORIALES INNEGOCIABLES (ESTRICTO CUMPLIMIENTO):
1. FACTOR HUMANO SOBRE DATO TÉCNICO: Foco total en el conflicto íntimo, la vulnerabilidad humana, el duelo, la superación, la censura o el destino. Cero datos fríos de ingeniería acústica a menos que conmuevan el corazón.
2. RIGOR FACTUAL ABSOLUTO: No inventes citas, fechas, fuentes ni anécdotas. Marca como pendiente de verificación cualquier afirmación sin respaldo; una bibliografía generada no constituye verificación documental.
3. ESTRUCTURA DE 9 ESCENAS PARA REELS (90s):
   - Exactamente 9 escenas.
   - Cada subtítulo debe tener entre 18 y 24 palabras. Estilo poético, dramático y sensible.
   - La Escena 9 DEBE SER UNA METÁFORA VISUAL REFLEXIVA (estrictamente prohibido usar tocadiscos, vinilos o agujas).
4. ESTRUCTURA DE 9 ESCENAS PARA TIKTOK (60s):
   - Mismas 9 escenas pero subtítulos condensados de 12 a 16 palabras.
   - Protocolo "TikTok-Proofing": Suavizado léxico obligatorio para evitar censura algorítmica (no usar palabras como "murió desangrado", "sangre", "asesinato", "balazo"; usar metáforas poéticas como "su vida se apagó", "la tragedia quebró su destino", "el dolor de la sombra").
5. PROMPTS VISUALES CINEMATOGRÁFICOS:
   - Para cada escena, redacta un prompt en inglés para generador de imagen IA fotográfico (estilo 35mm film grain, 1970s/1980s color grading, cinematic lighting, accurate historical clothes and accurate facial features of the artist).
6. COPYS DE PUBLICACIÓN:
   - Copy de Instagram (900 - 1.200 caracteres): Gancho inicial visible (1-2 líneas), microhistoria en 2 párrafos breves, cierre lírico con CTA a comentar, y 6-8 hashtags.
   - Copy de TikTok: Adaptado ágil y suavizado.
7. CRÓNICA EXTENDIDA PARA SUBSTACK (~1.000 a 1.300 palabras):
   - Estructura: Prólogo cinematográfico, Acto I, Acto II, Acto III, Epílogo y Reflexión humana.
   - Bloque final obligatorio: "### 📚 Fuentes y Archivo Documental" con registros hemerográficos, autobiografías y discografía contrastada.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO (sin markdown decorativo, sin backticks de bloque triple a menos que sea JSON parseable) con la siguiente estructura exacta:
{
  "title": "Título sugerente de la historia para el video",
  "song": "${song}",
  "artist": "${artist}",
  "slug": "${slugify(`${artist}-${song}-${category}`)}",
  "topic": "${category}",
  "audioMode": "${audioMode}",
  "audioRecommendation": "Nombre exacto de la pista oficial a buscar en la librería de Instagram/TikTok",
  "scenes90s": [
    { "scene": 1, "subtitle": "Texto poético (18-24 palabras)", "prompt": "Cinematic 35mm photograph of...", "imageAlt": "Descripción de la escena" }
  ],
  "scenes60s": [
    { "scene": 1, "subtitle": "Texto poético suavizado (12-16 palabras)" }
  ],
  "copys": {
    "instagram": "Texto completo del post para IG...",
    "tiktok": "Texto completo del post para TikTok..."
  },
  "chronicle": {
    "title": "Título de la crónica para Substack",
    "markdown": "Texto completo de la crónica (1000-1300 palabras)..."
  }
}`;

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      if (deadline.aborted) break;
      for (let attempt = 1; attempt <= 2 && !deadline.aborted; attempt++) {
        try {
          console.log(`[Studio] Intentando generar historia con modelo: ${modelName} (intento ${attempt})`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: systemPrompt,
            config: {
              responseMimeType: 'application/json', abortSignal: deadline
            }
          });
          if (response && response.text) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[Studio] Fallo en ${modelName} (intento ${attempt}):`, err?.message || err);
          // Si es un 503 (sobrecarga temporal), esperar 1 segundo antes de reintentar
          if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('demand')) {
            await new Promise((r) => setTimeout(r, 1200));
          } else {
            // Si es 404 u otro error no transitorio, pasar al siguiente modelo
            break;
          }
        }
      }
      if (response && response.text) break;
    }

    if (!response || !response.text) {
      throw new Error(`Los servidores de Google Gemini están experimentando alta demanda momentánea. Por favor intenta de nuevo en unos segundos. Detalle: ${lastError?.message || 'Error desconocido'}`);
    }

    const responseText = response.text || '{}';
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Clean possible wrapping
      const cleaned = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify({ success: true, data: generatedStory({ ...data, slug: slugify(`${artist}-${song}-${category}`).slice(0,120).replace(/-$/, ''), topic: category, audioMode }) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Error generando historia:', err);
    return new Response(JSON.stringify({ success: false, error: !inputValidated && err instanceof StudioInputError ? err.message : 'La IA no entregó un paquete válido. Intenta nuevamente.' }), {
      status: !inputValidated && err instanceof StudioInputError ? 400 : 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
