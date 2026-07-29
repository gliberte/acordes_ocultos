import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = join(rootDir, ".env");

if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...valueParts] = line.split("=");
    process.env[key] = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
}

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucket = process.env.CLOUDFLARE_R2_BUCKET;
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Missing Cloudflare R2 credentials in .env");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});

const videoPath = join(rootDir, "out/special_montage.mp4");
const key = "nexo-gaming-news-videos/especial-mosaico/special_montage_1080p.mp4";

console.log("📤 Subiendo video especial (110.9 MB) a Cloudflare R2...");
const fileBuffer = readFileSync(videoPath);

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: "video/mp4"
  })
);

const downloadUrl = `${publicUrl}/${key}`;
console.log("✅ ¡Video subido con éxito!");
console.log("🔗 URL de Descarga Directa:", downloadUrl);

// Enviar enlace a Telegram para abrirlo directo en el teléfono
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (token && chatId) {
  console.log("📲 Enviando enlace de descarga directa a Telegram...");
  const text = [
    "<b>✨ Video Especial Acordes Ocultos (1080p Calidad Máster) ✨</b>",
    "",
    "<b>Música:</b> Cass Elliot — <i>Make Your Own Kind of Music</i> (arranque seg. 47)",
    "<b>Duración:</b> 90 segundos | <b>Formato:</b> 1080x1920 (9:16 vertical)",
    "<b>Tamaño:</b> 110.9 MB (Tasa de bits máxima, sin compresión)",
    "",
    "Toca el enlace de abajo en tu móvil para abrirlo y guardarlo directamente en tu galería con el 100% de la calidad original:",
    "",
    `📥 <a href="${downloadUrl}">DESCARGAR VIDEO MÁSTER 1080P</a>`
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false
    })
  });
  const data = await response.json();
  if (data.ok) {
    console.log("✅ Notificación enviada a Telegram con éxito.");
  }
}
