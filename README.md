# Acordes Ocultos

Generador de videos verticales con Remotion para convertir una anecdota sobre un artista o tema musical en una pieza de 60 segundos para TikTok e Instagram.

## Flujo

1. Escribe una anecdota y genera un archivo de historia:

```bash
npm run create:story -- "Artista" "Titulo del video" "Anecdota completa..."
```

2. Reemplaza o completa los campos en el JSON generado:

- `music.src`: archivo local dentro de `public/`, por ejemplo `music/cancion.mp3`.
- `assets[].src`: imagenes dentro de `public/`, por ejemplo `generated/mi-escena.png`.
- `clip.src`: clip vertical de 10 segundos dentro de `public/`, por ejemplo `clips/clip.mp4`.
- `assets[].prompt` y `clip.prompt`: prompts listos para conectar a un proveedor de generacion.

3. Previsualiza:

```bash
npm run dev
```

4. Renderiza:

```bash
npm run render
```

El render sale en `out/story.mp4`.

## Paquete de produccion

Genera un copy unico para Instagram/TikTok y el paquete editorial:

```bash
npm run publish:dry-run
```

Envia el paquete real al canal de Telegram: copy unico y video.

```bash
npm run publish:package
```

Variables necesarias en `.env`:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Archivos generados:

- `out/production-package/*-package.json`
- `out/production-package/*-copys.md`

## Plantilla

- Formato: 1080 x 1920, 30 fps, 60 segundos.
- Estilo: documental musical, alto contraste, tipografia editorial, acentos rojo/ambar.
- Estructura: hook, cuatro beats, clip de 10 segundos desde el segundo 38 y cierre.

## Nota de publicacion

Para TikTok e Instagram, usa musica con licencia o las herramientas de musica propias de cada plataforma. El campo `music.src` sirve para renders internos o material autorizado.
