# Protocolo y Flujo de Trabajo: Video de Presentación del Canal

Este protocolo establece el marco de trabajo y los pasos específicos para generar y actualizar el **Video de Presentación Oficial del Canal** ("Acordes Ocultos"), sin interferir con la línea de producción de videos regulares de 60 segundos.

---

## 🎯 Diferencias Clave con la Línea de Producción Regular

| Característica | Video Regular (StoryVideo) | Video de Presentación (PresentationVideo) |
| :--- | :--- | :--- |
| **Duración** | Exactamente 60 segundos | Exactamente 90 segundos (1:30 minutos) |
| **Composición Remotion** | `StoryVideo` | `PresentationVideo` |
| **Origen del Audio** | Banda sonora de fondo única (Mute en clips) | Audio original de cada fragmento desmutado |
| **Origen de los Videos** | Imágenes estáticas + 1 transición de IA | Secuencia de fragmentos de videos anteriores |
| **Subtítulos** | Estilo tradicional narrativo | Grandes, dinámicos, de impacto y frases cortas |
| **Filtro Visual** | Estilo grano de película normal | Glitch en transiciones, partículas doradas y filtro retro de TV |
| **Comando de Render** | `npm run render` | `npm run render:presentation` |

---

## 🛠️ Pipeline de Producción del Video de Presentación

### 1. Configuración de Datos (`src/data/presentation.json`)
El archivo JSON contiene el listado de fragmentos que componen el video y el texto que aparecerá sobre ellos. Cada fragmento dura 13 segundos (6 clips = 78 segundos) más un Outro de 12 segundos con el logo y llamado a la acción.

### 2. Descarga y Preparación de los Fragmentos
Para preparar los fragmentos locales recortándolos de producciones pasadas, ejecuta:
```bash
npm run prepare:presentation
```
Este script descarga las producciones en MP4 desde Cloudflare R2 y extrae el fragmento exacto a 30 fps en `public/videos/presentation/clip-X.mp4`.

### 3. Modificaciones en Remotion
* **Componente**: `src/PresentationVideo.tsx`.
* **Registro de Composición**: Habilitado en `src/Root.tsx` con el ID `PresentationVideo`.

### 4. Compilación y Render
Para previsualizar localmente:
```bash
npm run dev
```
(Selecciona `PresentationVideo` en el menú izquierdo de Remotion Studio).

Para renderizar el archivo final:
```bash
npm run render:presentation
```
El video final se compilará en `out/presentation.mp4`.

### 5. Publicación
Para publicar el paquete editorial y el video de presentación a R2 y Supabase:
```bash
npm run publish:presentation
```
