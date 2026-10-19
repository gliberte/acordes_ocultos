import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function getR2Credentials() {
  const accountId =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.CLOUDFLARE_R2_ACCOUNT_ID) ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.CLOUDFLARE_R2_ACCESS_KEY_ID) ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY) ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.CLOUDFLARE_R2_BUCKET) ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    'nexo-gaming-news-videos';
  const publicUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.CLOUDFLARE_R2_PUBLIC_URL) ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev';

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export const r2Bucket = getR2Credentials().bucket;
export const r2PublicUrl = getR2Credentials().publicUrl;

let _r2ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (_r2ClientInstance) return _r2ClientInstance;
  const { accountId, accessKeyId, secretAccessKey } = getR2Credentials();
  if (accountId && accessKeyId && secretAccessKey) {
    _r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }
  return _r2ClientInstance;
}

export const r2Client = getR2Client();

/**
 * Saves a JSON object or string to Cloudflare R2
 */
export async function saveToR2(key: string, data: any, contentType = 'application/json'): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;
  try {
    const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await client.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
    return true;
  } catch (err: any) {
    console.warn(`[R2] Error al guardar ${key}:`, err.message);
    return false;
  }
}

/**
 * Reads a JSON object or string from Cloudflare R2
 */
export async function getFromR2<T = any>(key: string): Promise<T | null> {
  const client = getR2Client();
  if (!client) return null;
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: key
      })
    );
    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text) as T;
  } catch (err: any) {
    if (err.name !== 'NoSuchKey') {
      console.warn(`[R2] Error al leer ${key}:`, err.message);
    }
    return null;
  }
}
