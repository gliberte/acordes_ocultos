import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const vaultBase = process.env.GOOGLE_DRIVE_VAULT_PATH || 
  '/Users/luissolano/Library/CloudStorage/GoogleDrive-luis.solano.l@gmail.com/Mi unidad/Acordes Ocultos - Bóveda Maestra';

function getMimeType(ext) {
  switch (ext.toLowerCase()) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    default: return 'image/jpeg';
  }
}

function parseInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function markdownToHtml(md, articleDir) {
  md = md.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
    let cleanSrc = src.trim();
    let imgPath = join(articleDir, cleanSrc);
    if (!existsSync(imgPath) && cleanSrc.startsWith('images/')) {
      imgPath = join(articleDir, cleanSrc);
    }
    if (existsSync(imgPath)) {
      // Priorizar versión .webp optimizada para reducir el HTML de 25MB a ~1.2MB
      const webpCandidate = imgPath.replace(/\.[^.]+$/, '.webp');
      const finalImgPath = existsSync(webpCandidate) ? webpCandidate : imgPath;
      const ext = extname(finalImgPath);
      const mime = getMimeType(ext);
      const b64 = readFileSync(finalImgPath).toString('base64');
      return `<figure class="article-img"><img src="data:${mime};base64,${b64}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`;
    }
    return match;
  });

  const lines = md.split('\n');
  const htmlLines = [];
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (inBlockquote && !line.startsWith('>')) {
      htmlLines.push('</blockquote>');
      inBlockquote = false;
    }

    if (line.startsWith('# ')) {
      htmlLines.push(`<h1>${parseInline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      htmlLines.push(`<h2>${parseInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      htmlLines.push(`<h3>${parseInline(line.slice(4))}</h3>`);
      continue;
    }

    if (/^---|\*\*\*|___$/.test(line.trim())) {
      htmlLines.push('<hr>');
      continue;
    }

    if (line.startsWith('>')) {
      if (!inBlockquote) {
        htmlLines.push('<blockquote>');
        inBlockquote = true;
      }
      const quoteText = line.replace(/^>\s*/, '');
      htmlLines.push(`<p>${parseInline(quoteText)}</p>`);
      continue;
    }

    if (line.includes('<figure class="article-img">')) {
      htmlLines.push(line);
      continue;
    }

    if (line.trim().startsWith('*') && line.trim().endsWith('*') && !line.trim().startsWith('**')) {
      const caption = line.trim().slice(1, -1);
      htmlLines.push(`<p class="sub-caption">${parseInline(caption)}</p>`);
      continue;
    }

    if (line.trim().length > 0) {
      htmlLines.push(`<p>${parseInline(line)}</p>`);
    }
  }

  if (inBlockquote) {
    htmlLines.push('</blockquote>');
  }

  return htmlLines.join('\n');
}

function generateHtmlDocument(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title} | Acordes Ocultos</title>
  <style>
    :root {
      --bg: #fdfdfc;
      --text: #1f2937;
      --accent: #b45309;
      --subtle: #6b7280;
      --border: #e5e7eb;
      --quote-bg: #fffbeb;
      --card-bg: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --text: #f3f4f6;
        --accent: #f59e0b;
        --subtle: #9ca3af;
        --border: #374151;
        --quote-bg: #1f2937;
        --card-bg: #1f2937;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Charter", "Georgia", "Merriweather", serif;
      font-size: 19px;
      line-height: 1.8;
      padding: 24px 18px 80px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--accent);
      background: var(--quote-bg);
      border: 1px solid var(--border);
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 30px;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 16px;
      color: var(--text);
    }
    h2 {
      font-size: 22px;
      line-height: 1.35;
      font-weight: 700;
      margin: 36px 0 16px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      color: var(--text);
    }
    h3 {
      font-size: 17px;
      line-height: 1.5;
      font-weight: 400;
      color: var(--subtle);
      margin-bottom: 24px;
    }
    p {
      margin-bottom: 22px;
      word-break: break-word;
    }
    hr {
      border: none;
      height: 1px;
      background: var(--border);
      margin: 32px 0;
    }
    blockquote {
      background: var(--quote-bg);
      border-left: 4px solid var(--accent);
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: var(--text);
    }
    blockquote p {
      margin-bottom: 10px;
    }
    blockquote p:last-child {
      margin-bottom: 0;
    }
    figure.article-img {
      margin: 32px 0 12px;
      border-radius: 12px;
      overflow: hidden;
      background: var(--card-bg);
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    figure.article-img img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    figcaption {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      color: var(--subtle);
      padding: 10px 14px;
      text-align: center;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
    }
    p.sub-caption {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      font-style: italic;
      color: var(--subtle);
      text-align: center;
      margin-top: -12px;
      margin-bottom: 24px;
    }
    strong { font-weight: 700; }
    em { font-style: italic; }
    .footer-brand {
      text-align: center;
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      color: var(--subtle);
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">ACORDES OCULTOS • CRÓNICA DE SUBSTACK</span>
    ${bodyHtml}
    <div class="footer-brand">
      <strong>ACORDES OCULTOS</strong> — Historia, Cultura y Secretos de la Música
    </div>
  </div>
</body>
</html>`;
}

function copyDirRecursive(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function processAllArticles() {
  const articlesDir = join(rootDir, 'articles');
  if (!existsSync(articlesDir)) return;

  const dirs = readdirSync(articlesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(articlesDir, d.name, 'article.md')));

  console.log(`\n📚 Encontradas ${dirs.length} crónicas para compilar a HTML móvil...`);

  const driveSubstackDir = join(vaultBase, '02_Cronicas_Substack');
  try {
    mkdirSync(driveSubstackDir, { recursive: true });
  } catch (_) {}

  for (const d of dirs) {
    const slug = d.name;
    const articleFolder = join(articlesDir, slug);
    const mdPath = join(articleFolder, 'article.md');
    const mdContent = readFileSync(mdPath, 'utf8');

    const firstLine = mdContent.split('\n').find(l => l.startsWith('# ')) || `# Crónica - ${slug}`;
    const title = firstLine.replace('# ', '').trim();

    const bodyHtml = markdownToHtml(mdContent, articleFolder);
    const fullHtml = generateHtmlDocument(title, bodyHtml);

    // 1. Local
    const localOut = join(articleFolder, 'lectura_movil.html');
    writeFileSync(localOut, fullHtml, 'utf8');

    // 2. Google Drive: Bóveda Episodio (01_Episodios_Completados/<slug>/substack/)
    try {
      const driveEpisodeDir = join(vaultBase, '01_Episodios_Completados', slug, 'substack');
      if (existsSync(dirname(driveEpisodeDir))) {
        mkdirSync(driveEpisodeDir, { recursive: true });
        writeFileSync(join(driveEpisodeDir, 'lectura_movil.html'), fullHtml, 'utf8');
        copyFileSync(mdPath, join(driveEpisodeDir, 'article.md'));
        copyDirRecursive(join(articleFolder, 'images'), join(driveEpisodeDir, 'images'));
      }

      // 3. Google Drive: Biblioteca de Crónicas (02_Cronicas_Substack/)
      if (existsSync(driveSubstackDir)) {
        const libraryOut = join(driveSubstackDir, `${slug}.html`);
        writeFileSync(libraryOut, fullHtml, 'utf8');

        const libraryFolder = join(driveSubstackDir, slug);
        mkdirSync(libraryFolder, { recursive: true });
        copyFileSync(mdPath, join(libraryFolder, 'article.md'));
        writeFileSync(join(libraryFolder, 'lectura_movil.html'), fullHtml, 'utf8');
        copyDirRecursive(join(articleFolder, 'images'), join(libraryFolder, 'images'));

        console.log(`  ✅ Compilada y sincronizada: "${title.slice(0, 45)}..." -> 02_Cronicas_Substack/${slug}/ (con carpeta images/)`);
      }
    } catch (driveErr) {
      console.warn(`  ⚠️ Google Drive no accesible para ${slug}: ${driveErr.message}`);
    }
  }

  console.log('\n✨ ¡Todas las crónicas y sus carpetas images/ han sido sincronizadas con éxito!');
}

processAllArticles();
