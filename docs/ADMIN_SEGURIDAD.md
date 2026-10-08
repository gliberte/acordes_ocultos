# Administración: primera etapa de robustez

Implementación local del 30 de septiembre de 2026. No confirma ni modifica el despliegue.

## Acceso

`/admin` exige una sesión antes de consultar o entregar el catálogo privado. `/admin/login` envía la contraseña únicamente al endpoint de inicio de sesión. El navegador recibe una cookie firmada con HMAC, HttpOnly, SameSite=Strict, Secure en producción y vencimiento de cuatro horas. No se almacena la contraseña en el navegador; al entrar se eliminan los valores de sessionStorage de la versión anterior.

El middleware protege las seis API editoriales, la eliminación de comentarios y el cierre de sesión. Las mutaciones administrativas requieren Origin idéntico al del servidor. No se aceptan contraseñas enviadas en las API editoriales como sustituto de una sesión. El cierre de sesión borra la cookie del navegador.

Las vistas `?preview=true` requieren sesión y sus respuestas llevan `private, no-store` y `X-Robots-Tag`. Las páginas administrativas y API privadas tienen esas mismas cabeceras. El catálogo público mantiene su caché actual.

`web/server.mjs` ahora inicia Astro en segundo plano: se retiró el servidor paralelo que duplicaba los endpoints y podía omitir el middleware. Para gestionarlo se usan `astro dev status`, `astro dev logs` y `astro dev stop` dentro de `web/`.

## Configuración antes del despliegue

Configurar `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` en el entorno de ejecución de Vercel. El segundo debe ser aleatorio, independiente y tener al menos 32 caracteres. Se generó una clave local en `web/.env`, ignorado por Git. No copiar sus valores a documentación, repositorio ni variables PUBLIC_. La administración falla cerrada si falta configuración.

Cambiar cualquiera de los dos valores invalida todas las cookies emitidas. Las cookies son firmadas, no cifradas; su contenido solo incluye vencimiento y un nonce aleatorio, sin contraseña ni clave de servicio.

## Límites pendientes

- El límite de cinco intentos por dirección en quince minutos reside en memoria de cada instancia. Hace falta un contador compartido o regla del firewall de producción para resistir intentos distribuidos; no se considera una defensa completa.
- Una cookie sustraída sigue siendo válida hasta vencer; cerrar sesión no revoca una copia externa. Rotar la clave invalida todas las sesiones. Para revocación individual conviene un almacén de sesiones o Supabase Auth.
- La rotación de las credenciales expuestas sigue pendiente. Eliminar secretos de código y HTML no revoca credenciales antiguas.
- Siguen pendientes el saneamiento del HTML editorial, la selección inequívoca de historias y evitar sobrescrituras concurrentes de `production_plan`. Esta etapa no resuelve esos hallazgos de la auditoría.

## Verificación

Desde la raíz: `npm run build --prefix web` y `node_modules/.bin/tsc --noEmit --project web/tsconfig.json`.

Pruebas criptográficas, expiración, rotación, configuración ausente, protección de origen, cobertura de rutas y límite de intentos: `npm run test:security --prefix web`.

Integración HTTP sin modificaciones de publicaciones: iniciar `astro dev --background --port 4328` dentro de `web/`, ejecutar `npm run test:security:http --prefix web` y detener con `astro dev stop`. Requiere las variables locales de `web/.env`; `ADMIN_TEST_BASE_URL` permite indicar otro servidor local. Comprueba 17 condiciones, incluido el HTML autenticado sin secretos y una edición inválida que termina antes de escribir en la base de datos. No ejecutar contra un despliegue ajeno.

Resultado: cinco pruebas unitarias, 17 comprobaciones HTTP, TypeScript y build aprobados. El adaptador advierte de Node 26 local frente a Node 24 de Vercel; falta comprobar el despliegue con sus variables reales.
