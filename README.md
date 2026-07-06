# Acordes Ocultos

Generador de videos verticales con Remotion para convertir una anecdota sobre un artista o tema musical en una pieza de 60 segundos para TikTok e Instagram.

## Flujo

1. Escribe una anecdota y genera un archivo de historia. Las historias nuevas salen preparadas para Reels de 60 segundos:

```bash
npm run create:story -- "Artista" "Titulo del video" "Anecdota completa..."
```

2. Reemplaza o completa los campos en el JSON generado:

- `music.src`: archivo local dentro de `public/`, por ejemplo `music/cancion.mp3`.
- `assets[].src`: imagenes dentro de `public/`, por ejemplo `generated/mi-escena.png`.
- `clip.src`: clip vertical de transicion dentro de `public/`, por ejemplo `clips/clip.mp4`.
- `assets[].prompt` y `clip.prompt`: prompts listos para conectar a un proveedor de generacion.

3. Genera los assets. Primero revisa el plan de prompts y rutas:

```bash
npm run assets:plan -- --story src/data/generated/mi-historia.json
```

Las imagenes 9:16 se generan con Codex/imagegen y se guardan en `public/` en las rutas indicadas por el plan.

Cuando las imagenes existan, genera el clip de transicion con Veo:

```bash
npm run assets:generate -- --story src/data/generated/mi-historia.json
```

El clip usa la imagen inicial y la imagen final indicadas por `clip.transitionFromAssetIndex` y `clip.transitionToAssetIndex`, para integrarse como puente natural entre dos secuencias de imagenes.

4. Previsualiza:

```bash
npm run dev
```

5. Renderiza:

```bash
npm run render
```

El render sale en `out/story.mp4`.

## Paquete de produccion

Genera un copy unico para Instagram/TikTok y el paquete editorial:

```bash
npm run publish:dry-run
```

Publica el paquete real en los destinos configurados: Cloudflare R2, Supabase y Telegram.

```bash
npm run publish:package
```

Tambien puedes probar destinos individuales:

```bash
npm run publish:telegram
npm run publish:cloud
```

`publish:dry-run` solo genera archivos locales y no envia ni sube nada.

Variables de Telegram en `.env`:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Variables de Cloudflare R2:

- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_URL`: URL publica del bucket o dominio custom, sin slash final.
- `CLOUDFLARE_R2_PREFIX`: prefijo opcional para organizar objetos.

Variables de Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_SECRET_KEY`
- `SUPABASE_PUBLICATIONS_TABLE`: por defecto `published_news`.

Variables de Veo / Gemini:

- `GEMINI_API_KEY` o `VEO_API_KEY`

Las publicaciones se registran en la tabla existente `published_news`.

Archivos generados:

- `out/production-package/*-package.json`
- `out/production-package/*-copys.md`

## Plantilla

- Formato: 1080 x 1920, 30 fps.
- Historias nuevas: 60 segundos exactos para Reels.
- Historias largas o densas se dividen en Parte 1 y Parte 2.
- Estilo: documental musical, alto contraste, tipografia editorial, acentos rojo/ambar.
- Estructura nueva: hook, beats narrativos, clip puente generado entre dos imagenes y cierre.

## Nota de publicacion

Para TikTok e Instagram, usa musica con licencia o las herramientas de musica propias de cada plataforma. El campo `music.src` sirve para renders internos o material autorizado.

Para Instagram, el proyecto guarda `music.instagram.status` como control editorial. El conector actual publica Reels, pero no expone busqueda directa del catalogo musical de Instagram. Si se va a asignar el audio desde la app, confirma la disponibilidad dentro de Instagram antes de publicar.
