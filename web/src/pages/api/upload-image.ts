import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ADMIN_PASSWORD =
    import.meta.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    '';

  const R2_ACCOUNT_ID =
    import.meta.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    '0c0aad7fd951028fbe9eded107092686';

  const R2_ACCESS_KEY_ID =
    import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    '';

  const R2_SECRET_ACCESS_KEY =
    import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    '';

  const R2_BUCKET =
    import.meta.env.CLOUDFLARE_R2_BUCKET ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    'nexo-gaming-news-videos';

  const R2_PUBLIC_URL = (
    import.meta.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev'
  ).replace(/\/$/, '');

  try {
    const body = await request.json();
    const { password, imageBase64, filename, mimeType, storySlug } = body || {};

    const cleanPw = (password || '').trim();
    const valid =
      cleanPw === ADMIN_PASSWORD ||
      Buffer.from(cleanPw).toString('base64') === Buffer.from(ADMIN_PASSWORD).toString('base64');

    if (!ADMIN_PASSWORD || !valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contraseña de administrador incorrecta' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Datos de imagen requeridos (base64)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clean base64 and parse mime type
    let finalMime = mimeType || 'image/jpeg';
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    if (mimeMatch) {
      finalMime = mimeMatch[1];
    }

    const rawData = imageBase64.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, '');
    const buffer = Buffer.from(rawData, 'base64');

    if (buffer.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'El archivo de imagen está vacío' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const safeSlug = (storySlug || 'general').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const safeRawName = (filename || 'foto.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const s3Key = `nexo-gaming-news-videos/extra-images/${safeSlug}/${timestamp}-${safeRawName}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: finalMime
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${s3Key}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        key: s3Key,
        sizeBytes: buffer.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error al subir la imagen a Cloudflare R2' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
