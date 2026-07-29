# Auditoría de robustez — Acordes Ocultos

Fecha: 30 de septiembre de 2026. Alcance: código local, configuración declarada y comprobaciones locales. Esta revisión no confirma el estado del despliegue ni las políticas, permisos o copias existentes en servicios remotos.

## Objetivo operativo

Sostener una producción diaria con versiones de Instagram y TikTok, archivo editorial recuperable y portal público estable. La difusión es orgánica según confirmación del propietario. Las mejoras deben proteger ese flujo y permitir volver a una versión anterior sin perder episodios ni cambios editoriales.

## Verificaciones realizadas

- `npm run check`: pasa. Cubre TypeScript del motor de video; no comprueba por sí solo todos los JSON, scripts ni el portal.
- `npm run build` en `web/`: pasa. El adaptador advierte que Node local es 26 y el runtime desplegable seleccionado es 24. El shell también presenta un aviso de configuración de nvm.
- `node --check` para 31 scripts `.mjs`: todos pasan. Es comprobación de sintaxis, no de comportamiento ni integraciones.
- Historia activa: pasa el esquema Zod.
- Pruebas locales sin render ni publicación: el esquema acepta duración negativa y segmentos con fin anterior al inicio e índice de imagen inexistente. El conversor Markdown conserva atributos de evento de un HTML de prueba. No se ejecutó el contenido de prueba en un navegador.
- Git: `web/` y varias herramientas/editoriales están sin seguimiento. `src/data/story.json` sí está registrado; los patrones actuales ignoran gran parte de los JSON generados.

## Prioridad 0: administración y secretos

**Evidencia.** `web/src/pages/admin.astro:46` entrega al componente cliente `supabaseKey`, `expectedSecret` y el catálogo con historias ocultas. `expectedSecret` es la contraseña codificada en Base64, reversible. `web/src/components/AdminPanel.tsx:54` usa sessionStorage para la pantalla de acceso; no constituye autorización del servidor. Hay credenciales de respaldo en `web/src/lib/supabase.ts`, endpoints, `web/src/pages/api/upload-image.ts` y scripts. Se omiten sus valores en este informe.

**Propuesta.** Eliminar secretos y contraseñas de props cliente y fallbacks literales. Centralizar variables de entorno y fallar explícitamente cuando falten. Proteger página y endpoints en el servidor. Como transición compatible con un único administrador, usar una sesión opaca validada en el servidor, cookie HttpOnly/Secure/SameSite, vencimiento, cierre de sesión, protección de origen/CSRF y límite de intentos; luego adoptar Supabase Auth con permiso administrativo explícito si se requiere gestión de usuarios. El navegador no debe recibir el secreto de la sesión ni una contraseña verificable. Los permisos administrativos deben depender de datos controlados por el servidor.

**Rotación.** Preparar nuevas credenciales en los entornos consumidores, validar la transición y retirar las anteriores. Tratar los valores expuestos como comprometidos si el código se desplegó o compartió. Eliminar valores del código no revoca claves ya filtradas. Revisar logs y acceso a datos; no asumir explotación sin evidencia. Escanear historial antes de decidir una limpieza de Git, sin reescribirlo automáticamente.

**Aceptación.** Un visitante recibe rechazo antes de cargar datos ocultos o administrar; ninguna respuesta HTML/props cliente incluye secretos; sesión válida permite el trabajo habitual; sesión cerrada o vencida no permite escritura. Verificar rotación en cada consumidor antes de retirar el valor antiguo.

## Prioridad 0: previews y contenido web

**Evidencia.** `web/src/pages/historias/[slug].astro:15` habilita `includeHidden` con `?preview=true` sin autenticar. La misma página aplica caché pública incluso al preview. `web/src/lib/markdown.ts` conserva HTML sin sanitización y la página lo inserta mediante `set:html`.

**Propuesta.** Exigir sesión administrativa para preview; usar `private, no-store` y excluir previews de indexación. Impedir acceso público a borradores también en APIs sociales. Sustituir la conversión por un parser Markdown y sanitizador con etiquetas/atributos permitidos y validación de protocolos de URL. Mantener figuras, captions y tipografía actuales. Restringir uploads a formatos de imagen comprobados por decodificación, con límites de tamaño y dimensiones; no confiar en el MIME enviado por el cliente.

**Aceptación.** Cambiar una query no desbloquea borradores; un preview autenticado no se cachea públicamente. HTML con scripts, atributos de evento y URLs peligrosas queda neutralizado. Una crónica con imágenes y citas mantiene su presentación.

## Prioridad 1: integridad de datos

**Evidencia.** `web/src/pages/api/update-story.ts:79` toma la primera coincidencia por slug/título parcial o artista. Comentarios y reacciones hacen búsquedas parciales similares. `comments.ts:117`, `reactions.ts:91` y `scripts/sync-instagram-metrics.mjs:86` leen y reemplazan `production_plan` completo. Dos escrituras simultáneas pueden sobrescribir cambios independientes. Suscriptores también se guardan en un arreglo de una fila especial de publicaciones.

**Propuesta.** Exigir identificadores exactos al modificar. Definir un identificador estable de episodio y otro de versión; mantener slugs históricos como alias de lectura, sin usarlos para decidir escrituras ambiguas. A corto plazo, introducir operaciones atómicas o control de versión para detectar conflictos. Después separar comentarios, reacciones, suscriptores y snapshots de métricas del documento editorial. Establecer unicidad y permisos por operación tras inspeccionar el esquema real. Migrar de forma aditiva, con respaldo y compatibilidad temporal; no borrar `production_plan` para implantar el cambio.

**Aceptación.** Dos temas de un artista no se confunden. Dos comentarios simultáneos permanecen. Actualizar métricas no revierte una edición editorial. Reacciones no admiten inflación ilimitada ni decrementos ajenos. Datos de suscriptores no forman parte del catálogo público.

## Prioridad 1: respuestas fiables y abuso

**Evidencia.** `web/src/pages/api/subscribe.ts:45` y `:57` no comprueban el error devuelto por Supabase antes de responder éxito. `comments.ts:200` tampoco comprueba el resultado de borrado. La API de suscripción registra consentimiento y edad de forma constante, sin recibir una aceptación explícita; el checkbox solo se valida en el navegador. No se encontró un mecanismo de límite de solicitudes en las rutas examinadas.

**Propuesta.** Validar entradas con esquemas compartidos; comprobar toda respuesta de escritura; no convertir fallos de infraestructura en éxito o ausencia de datos. Exigir aceptación explícita y registrar versión del texto y fecha. La captura local de email no equivale a suscripción confirmada en Substack. Establecer límites persistentes de solicitudes para login, comentarios, reacciones, suscripción y uploads, con controles adicionales según el volumen real de abuso. No usar solo memoria del proceso en un despliegue serverless.

**Aceptación.** Una escritura fallida devuelve un error y la interfaz permite reintentar. Una solicitud sin aceptación no crea un registro de consentimiento. Los límites funcionan entre instancias y no impiden el uso normal.

## Prioridad 1: producción por episodio

**Evidencia.** `scripts/publish-package.mjs:350` incorpora `out/story_tiktok.mp4` si existe, sin verificar correspondencia con el episodio seleccionado. También usa rutas globales de portadas, copys y versiones para Telegram. Los nombres de publicación derivan del título mientras otras rutas respetan `story.slug`. El esquema valida tipos pero no coherencia de timeline. La publicación hace POST y usa un prefijo nuevo de R2 en cada ejecución, sin un mecanismo visible de reanudación o deduplicación.

**Propuesta.** Crear un manifiesto por episodio/versión con IDs, JSON exacto usado, archivos explícitos, duración, huellas SHA-256 y fecha de render. Guardar salidas en una carpeta propia del episodio; conservar comandos actuales como envoltorios de compatibilidad. Un preflight debe validar intervalos, cobertura, índices, recursos, audio, duración/fps y correspondencia entre manifiesto y archivos antes de render/publicación. Los borradores incompletos pueden existir, pero no publicarse como paquetes listos.

**Reanudación.** Registrar por separado el estado de subida, base de datos, Telegram, bóveda y recursos web. Usar una clave estable por episodio/versión/revisión y restricciones de unicidad. Agregar tiempos límite y reintentos acotados a operaciones cuya repetición es segura. Si Telegram devuelve un resultado incierto, marcar revisión pendiente antes de reenviar. El fallo de entrega o respaldo debe dejar un estado parcial explícito y no exigir rehacer destinos ya completados.

**Aceptación.** Empaquetar episodio B no toma el TikTok, portada o copy de A. Interrumpir tras subir a R2 permite continuar sin duplicar filas. Un fallo de Telegram no elimina el paquete preparado. Una timeline inválida se rechaza antes del render.

## Prioridad 1: respaldo recuperable

**Evidencia.** `scripts/backup-vault.mjs:119` decide actualización por tamaño/mtime, sin verificación de contenido. El lote omite carpetas ya existentes por defecto aunque su contenido pueda estar incompleto. La detección de audio busca nombres `audio.*` dentro de la carpeta visual; no recorre necesariamente `story.music.src`, que puede apuntar a `public/music`. `scripts/restore-vault.mjs:101` cambia la historia activa antes de completar la restauración y copia los audios a la carpeta visual, sin reconstruir necesariamente sus rutas originales.

**Propuesta.** Archivar todos los recursos referenciados por el manifiesto y preservar rutas relativas; declarar obligatorios y opcionales. Verificar huellas y completitud, escribir a una carpeta temporal y marcar completo al finalizar. Distinguir copia local a la carpeta de Drive de sincronización remota confirmada. Restaurar primero a una carpeta aislada, validar JSON/recursos y solo después activar. Incluir exportación recuperable de datos y ediciones administrativas, además de los medios. Mantener revisiones anteriores.

**Aceptación.** Un episodio puede restaurarse en una carpeta vacía con audio y versiones correctas. Una carpeta de respaldo incompleta no aparece como terminada. Un fallo de restauración conserva intacto el episodio activo.

## Prioridad 2: portal y mantenimiento

**Evidencia.** `web/src/lib/stories.ts` consulta todas las columnas de todas las filas y resuelve artículos mediante alias y heurísticas. El fallback local no asigna Instagram URL, pero el filtro público la exige: durante un fallo de Supabase puede quedar un catálogo vacío. `web/package.json` no declara un comando de comprobación de tipos del portal. No hay un flujo CI registrado encontrado. Node local y despliegue difieren.

**Propuesta.** Seleccionar únicamente campos necesarios y filtrar contenido público en la consulta. Materializar un catálogo público de último estado válido con enlaces de Instagram y crónicas, sin datos privados; actualizarlo de forma atómica y definir invalidación tras cambios de visibilidad. Ante una ocultación, evitar servir un snapshot obsoleto sin una política explícita. Resolver relaciones por IDs y aliases curados. Fijar Node compatible y lockfiles. Versionar código, configuraciones, manifiestos e historias fuente; mantener medios grandes en la bóveda con referencias y huellas. Agregar un único comando de diagnóstico y CI con pruebas de permisos, integridad, preflight y reanudación. Evitar upgrades masivos mientras se corrigen riesgos operativos.

**Métricas.** Conservar snapshots con media_id, episodio/versión, hora de captura, edad y alcance de la métrica. No sobrescribir históricos ni tratar métricas ausentes como cero. La API enumeró más publicaciones que el contador del perfil: guardar cobertura/paginación y discrepancias. Una ejecución solo debe declarar completitud después de recorrer todas las páginas.

**Aceptación.** Un checkout limpio permite verificar el proyecto usando fixtures y configuración de ejemplo. Una caída externa tiene un comportamiento público definido. El diagnóstico distingue datos incompletos, fallo externo y error local. Las métricas pueden compararse por ventanas equivalentes cuando existan snapshots.

## Secuencia recomendada

1. Preparar la corrección de administración, secretos y preview; probar localmente y en un entorno de prueba. Coordinar la rotación y despliegue con un mapa de consumidores y reversión segura del código sin volver a exponer secretos.
2. Añadir validación/sanitización, respuestas de escritura y límites. Verificar que edición, uploads y lectura habitual siguen funcionando.
3. Implantar manifiestos y preflight con compatibilidad con episodios actuales. Luego reanudación de publicación y respaldo verificable.
4. Inspeccionar esquema/permisos reales, migrar integridad de datos de forma aditiva y verificar concurrencia y permisos. No asumir RLS ausente por el código local.
5. Completar CI, documentación, runtime común, catálogo de contingencia e históricos de métricas.

Referencias oficiales: [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [autenticación SSR](https://supabase.com/docs/guides/auth/server-side), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [renderizado bajo demanda en Astro](https://docs.astro.build/en/guides/on-demand-rendering/).

Este turno agrega únicamente el informe de auditoría. No cambia código de funcionamiento, credenciales, base de datos ni despliegue. La compilación local genera artefactos de build.
