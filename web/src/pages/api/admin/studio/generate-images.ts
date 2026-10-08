import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { resolve } from 'node:path';
import { imageInput, studioBody, StudioInputError } from '../../../../lib/studio-contract';
import { generateFlow, withFlowLock, FlowBusyError } from '../../../../lib/studio-flow';
export const prerender = false;
const projectRoot = resolve(process.cwd(), '..');

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const R2_ACCOUNT_ID =
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    import.meta.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    '0c0aad7fd951028fbe9eded107092686';

  const R2_ACCESS_KEY_ID =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    '';

  const R2_SECRET_ACCESS_KEY =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    '';

  const R2_BUCKET =
    process.env.CLOUDFLARE_R2_BUCKET ||
    import.meta.env.CLOUDFLARE_R2_BUCKET ||
    'nexo-gaming-news-videos';

  const R2_PUBLIC_URL = (
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    import.meta.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev'
  ).replace(/\/$/, '');

  try {
    const { storyData, sceneNumber, force } = imageInput(await studioBody(request));
    if (process.env.VERCEL) {
      return new Response(JSON.stringify({ success: false, error: 'La generación visual en la nube requiere un worker configurado. Puedes subir fotografías históricas.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    const { jobId, outputRelative, files } = await withFlowLock(projectRoot, () => generateFlow(projectRoot, storyData, sceneNumber, force));
    const uploadedImages: Record<string | number, string> = {};

    let s3: S3Client | null = null;
    if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
      s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY
        }
      });
    }

    for (const { index, filename, buffer } of files) {
      if (s3) {
        const key = `studio/${storyData.slug}/${jobId}/${filename}`;
        await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: 'image/png', CacheControl: 'public, max-age=31536000, immutable' }));
        uploadedImages[index] = `${R2_PUBLIC_URL}/${key}`;
      } else {
        // Astro serves web/public; the local generator uses the root public directory.
        const { mkdir, copyFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const target = join(projectRoot, 'web/public', outputRelative);
        await mkdir(target, { recursive: true });
        await copyFile(join(projectRoot, 'public', outputRelative, filename), join(target, filename));
        uploadedImages[index] = `/${outputRelative}/${filename}`;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      images: uploadedImages,
      singleImageUrl: sceneNumber !== 'all' ? uploadedImages[sceneNumber] : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Error en generación con Google Flow:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof StudioInputError || err instanceof FlowBusyError ? err.message : 'No se pudo completar la generación visual. Revisa el generador local y vuelve a intentar.'
    }), {
      status: err instanceof StudioInputError || err instanceof FlowBusyError ? err.status : 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
