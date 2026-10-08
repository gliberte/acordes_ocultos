import type { APIRoute } from 'astro';
import { GoogleGenAI } from '@google/genai';
import { editorialInput, potentialAnalysis, studioBody, StudioInputError } from '../../../../lib/studio-contract';

export const prerender = false;

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
    return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY no configurada' }), {
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

    const systemPrompt = `Eres el Director Editorial y Estratega de Contenidos de «Acordes Ocultos», «Destellos de Gloria» y «Catedrales de Leyenda».
Tu función es realizar una auditoría rigurosa y objetiva del POTENCIAL VIRAL y la HONDURA HUMANA de una canción antes de invertir tiempo en su producción.

El puntaje es una hipótesis editorial cualitativa: no está calibrado con métricas históricas y nunca garantiza viralidad.
CRITERIOS DE EVALUACIÓN:
1. Factor Humano y Vulnerabilidad: ¿Toca la fibra del duelo, el amor, el miedo, la redención o el destino de personas reales? (Innegociable: el dato técnico frío resta puntos).
2. Tensión Narrativa y Conflicto: ¿Hay rivalidad, censura, dictadura, guerra, traición o encrucijada moral?
3. Reconocimiento y Resonancia: ¿El artista o la canción tienen recordación mundial o arraigo cultural profundo?
4. El Gancho de Segundo Cero: ¿Se puede resumir el conflicto en una sola frase potente sin spoilers que despierte alta intriga?
5. Metáfora Visual de Cierre: ¿Existe una imagen simbólica profunda ligada a la canción que invite a la reflexión sin caer en clichés?
6. Potencial de Conversación / Debate: ¿Provocará que la audiencia comente sus recuerdos o debata en comentarios?

CANCIÓN A EVALUAR:
- Canción: "${song}"
- Artista: "${artist}"
- Categoría propuesta: "${category}"
- Notas de contexto del usuario: "${notes}"

Genera una respuesta en formato JSON estricto con la siguiente estructura:
{
  "score": 9.2, // Número decimal del 1.0 al 10.0
  "verdict": "Excelente Potencial Editorial / Regular / Descartar",
  "categoryRecommendation": "${category}", // o sugerir si encaja mejor en 'destellos-de-gloria', 'catedrales-de-leyenda' o 'historia-en-los-acordes'
  "oneLineHook": "Frase de intriga para el segundo cero...",
  "humanConflict": "Explicación breve del drama humano real íntimo...",
  "viralComponents": [
    "Punto clave 1 (ej. Censura militar o duelo)",
    "Punto clave 2 (ej. Anécdota oculta de grabación)",
    "Punto clave 3 (ej. Transformación emocional del artista)"
  ],
  "metaphorClosingIdea": "Idea para la imagen poética de cierre en la escena 09...",
  "riskOrWeakness": "Si existe algún riesgo (ej. datos poco contrastados o riesgo de spoiler prematuro)",
  "verdictDetail": "Párrafo de 3-4 líneas resumiendo por qué vale la pena producir esta pieza y cómo enfocarla para favorecer retención y conversación orgánica, sin prometer reproducciones."
}`;

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      if (deadline.aborted) break;
      for (let attempt = 1; attempt <= 2 && !deadline.aborted; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: systemPrompt,
            config: { responseMimeType: 'application/json', abortSignal: deadline }
          });
          if (response && response.text) break;
        } catch (err: any) {
          lastError = err;
          if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('demand')) {
            await new Promise((r) => setTimeout(r, 1200));
          } else {
            break;
          }
        }
      }
      if (response && response.text) break;
    }

    if (!response || !response.text) {
      throw new Error(`Error en motor de análisis: ${lastError?.message || 'Servidores ocupados'}`);
    }

    let data;
    try {
      data = JSON.parse(response.text);
    } catch {
      const cleaned = response.text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify({ success: true, analysis: potentialAnalysis(data) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Error analizando potencial:', err);
    return new Response(JSON.stringify({ success: false, error: !inputValidated && err instanceof StudioInputError ? err.message : 'No se pudo obtener un análisis editorial válido.' }), {
      status: !inputValidated && err instanceof StudioInputError ? 400 : 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
