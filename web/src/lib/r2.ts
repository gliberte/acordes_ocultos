import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

export const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';
export const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev';

export const r2Client = (accountId && accessKeyId && secretAccessKey)
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  : null;

/**
 * Saves a JSON object or string to Cloudflare R2
 */
export async function saveToR2(key: string, data: any, contentType = 'application/json'): Promise<boolean> {
  if (!r2Client) return false;
  try {
    const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await r2Client.send(
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
  if (!r2Client) return null;
  try {
    const res = await r2Client.send(
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
