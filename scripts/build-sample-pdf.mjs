import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bookDir = path.join(rootDir, 'book/volumen-01');
const outputDir = path.join(bookDir, 'output');
const rootOutputDir = path.join(rootDir, 'output');
const webPublicBookDir = path.join(rootDir, 'web/public/book');
const pdfImagesDir = path.join(outputDir, 'pdf_images');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(rootOutputDir)) fs.mkdirSync(rootOutputDir, { recursive: true });
if (!fs.existsSync(webPublicBookDir)) fs.mkdirSync(webPublicBookDir, { recursive: true });
if (!fs.existsSync(pdfImagesDir)) fs.mkdirSync(pdfImagesDir, { recursive: true });

const estructura = JSON.parse(fs.readFileSync(path.join(bookDir, 'ESTRUCTURA_EDITORIAL.json'), 'utf8'));
const prelims = JSON.parse(fs.readFileSync(path.join(bookDir, 'PRELIMINARES.json'), 'utf8'));
const reelsMapPath = path.join(bookDir, 'INSTAGRAM_REELS.json');
const reelsMap = fs.existsSync(reelsMapPath) ? JSON.parse(fs.readFileSync(reelsMapPath, 'utf8')) : {};

const HISTORICAL_CHRONICLES_META = {
  'pink-floyd-the-great-gig-in-the-sky': {
    releaseYear: 1973,
    editorialYear: 2026,
    song: 'The Great Gig in the Sky',
    artist: 'Pink Floyd'
  },
  'elvis-presley-thats-all-right-acordes-ocultos': {
    releaseYear: 1954,
    editorialYear: 2026,
    song: "That's All Right",
    artist: 'Elvis Presley'
  },
  'mocedades-eres-tu': {
    releaseYear: 1973,
    editorialYear: 2026,
    song: 'Eres tú',
    artist: 'Mocedades'
  }
};

function resolveImage(articleDir, relSrc) {
  const clean = relSrc.replace(/^\/+/, '');
  const candidate1 = path.join(articleDir, clean);
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.join(articleDir, 'images', path.basename(clean));
  if (fs.existsSync(candidate2)) return candidate2;
  const webCandidate = path.join(rootDir, 'web/public/articles', path.basename(articleDir), 'images', path.basename(clean));
  if (fs.existsSync(webCandidate)) return webCandidate;
  return null;
}

function getOptimizedPdfImage(srcPath, slug) {
  const ext = path.extname(srcPath).toLowerCase();
  const baseName = path.basename(srcPath, ext);
  const outJpgName = `${slug}_${baseName}_pdf.jpg`;
  const outJpgPath = path.join(pdfImagesDir, outJpgName);

  if (fs.existsSync(outJpgPath) && fs.statSync(outJpgPath).size > 1000) {
    return outJpgPath;
  }

  try {
    execSync(`sips -s format jpeg -s formatOptions 82 "${srcPath}" --out "${outJpgPath}"`, { stdio: 'ignore' });
    if (fs.existsSync(outJpgPath)) return outJpgPath;
  } catch (err) {}

  return srcPath;
}

function extractArticle(slug) {
  const articleDir = path.join(rootDir, 'articles', slug);
  const articlePath = path.join(articleDir, 'article.md');
  if (!fs.existsSync(articlePath)) {
    throw new Error(`No se encontró article.md para el slug: ${slug} en ${articlePath}`);
  }

  const raw = fs.readFileSync(articlePath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const meta = {};
  let body = raw;

  if (fmMatch) {
    const rawFm = fmMatch[1];
    body = fmMatch[2];
    for (const line of rawFm.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        let v = line.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        meta[k] = v;
      }
    }
  }

  let coverData = null;
  const firstImgMatch = body.match(/!\[(.*?)\]\((.*?)\)/);
  if (firstImgMatch) {
    const alt = firstImgMatch[1];
    const src = firstImgMatch[2];
    const afterMatch = body.slice(firstImgMatch.index + firstImgMatch[0].length);
    const captionMatch = afterMatch.match(/^\s*\n\*(.*?)\*\s*\n/);
    const caption = captionMatch ? captionMatch[1] : '';

    coverData = { alt, src, caption };
    body = body.slice(0, firstImgMatch.index) + (captionMatch ? afterMatch.slice(captionMatch[0].length) : afterMatch);
  }

  return { meta, body, articleDir, coverData };
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToEditorialHtml(markdown, articleDir, slug) {
  let content = markdown.replace(/^#\s+[^\n]+\n+/, '');

  content = content.replace(/!\[(.*?)\]\((.*?)\)(?:\s*\n\*(.*?)\*)?/g, (match, alt, src, caption) => {
    const rawPath = resolveImage(articleDir, src);
    if (!rawPath) return '';
    const optPath = getOptimizedPdfImage(rawPath, slug);
    const imgSrc = `file://${optPath}`;
    const cleanCap = caption || alt || '';

    return `
      <figure class="editorial-figure">
        <div class="figure-frame">
          <img src="${imgSrc}" alt="${escapeHtml(alt || '')}" loading="eager" />
        </div>
        ${cleanCap ? `<figcaption class="figure-caption"><span>✦</span> ${inlineMarkdown(cleanCap)}</figcaption>` : ''}
      </figure>
    `;
  });

  const blocks = content.split(/\n{2,}/);
  const htmlParts = [];
  let isFirstParagraph = true;

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const b = blocks[bIdx].trim();
    if (!b) continue;

    if (b.startsWith('### Fuentes') || b.startsWith('### 📚 Fuentes') || b.startsWith('## Fuentes')) {
      const remaining = blocks.slice(bIdx).join('\n\n');
      htmlParts.push(`
        <section class="sources-section">
          <h3 class="sources-title">Fuentes y Archivo Documental</h3>
          <div class="sources-content">
            ${markdownListToHtml(remaining.replace(/^###?\s+[^\n]+\n+/, ''))}
          </div>
        </section>
      `);
      break;
    }

    if (b.startsWith('###') || b.startsWith('##')) {
      const cleanH = b.replace(/^#+\s*/, '').replace(/^[✦𝄞\s]+/, '').trim();
      htmlParts.push(`
        <div class="act-separator">
          <div class="act-ornament">✦ · 𝄞 · ✦</div>
          <h3 class="act-title">${escapeHtml(cleanH)}</h3>
        </div>
      `);
      continue;
    }

    if (b.startsWith('>')) {
      const qText = b.replace(/^>\s*/gm, '').trim();
      htmlParts.push(`
        <blockquote class="pull-quote">
          <p>${inlineMarkdown(qText)}</p>
        </blockquote>
      `);
      continue;
    }

    if (b.startsWith('---') || b.startsWith('***')) {
      htmlParts.push(`<hr class="section-rule" />`);
      continue;
    }

    if (b.startsWith('<figure')) {
      htmlParts.push(b);
      continue;
    }

    if (/^(\*|-|\d+\.)\s/.test(b)) {
      htmlParts.push(markdownListToHtml(b));
      continue;
    }

    if (isFirstParagraph) {
      htmlParts.push(`<p class="drop-cap-p">${inlineMarkdown(b)}</p>`);
      isFirstParagraph = false;
    } else {
      htmlParts.push(`<p>${inlineMarkdown(b)}</p>`);
    }
  }

  return htmlParts.join('\n');
}

function markdownListToHtml(listMarkdown) {
  const lines = listMarkdown.split('\n');
  const items = [];
  for (const line of lines) {
    const clean = line.replace(/^(\*|-|\d+\.)\s+/, '').trim();
    if (clean) items.push(`<li>${inlineMarkdown(clean)}</li>`);
  }
  return `<ul class="editorial-list">${items.join('\n')}</ul>`;
}

// -------------------------------------------------------------------------------------------------
// SELECCIÓN DE LAS 3 HISTORIAS EMBLEMÁTICAS PARA LA MUESTRA
// -------------------------------------------------------------------------------------------------
const sampleSlugs = [
  'pink-floyd-the-great-gig-in-the-sky',
  'elvis-presley-thats-all-right-acordes-ocultos',
  'mocedades-eres-tu'
];

console.log('📖 Cargando los 3 capítulos oficiales de muestra...');
const sampleChapters = [];
let sampleOrder = 1;

for (const sec of estructura.sections) {
  for (const ch of sec.chapters) {
    if (!sampleSlugs.includes(ch.slug)) continue;

    const art = extractArticle(ch.slug);
    const histMeta = HISTORICAL_CHRONICLES_META[ch.slug] || {};
    const releaseYear = histMeta.releaseYear || '1970';
    const songName = histMeta.song || ch.song;
    const artistName = histMeta.artist || ch.artist;

    let coverImg = null;
    if (art.coverData) {
      const rawCover = resolveImage(art.articleDir, art.coverData.src);
      if (rawCover) {
        const optPdfCover = getOptimizedPdfImage(rawCover, ch.slug);
        coverImg = {
          alt: art.coverData.alt,
          caption: art.coverData.caption,
          pdfSrc: `file://${optPdfCover}`
        };
      }
    }

    sampleChapters.push({
      order: sampleOrder++,
      originalNumber: ch.number || sampleOrder,
      sectionTitle: sec.title,
      slug: ch.slug,
      title: ch.title,
      song: songName,
      artist: artistName,
      releaseYear,
      editorialYear: 2026,
      reelUrl: reelsMap[ch.slug]?.reelUrl || (typeof reelsMap[ch.slug] === 'string' ? reelsMap[ch.slug] : null),
      coverImg,
      body: art.body,
      articleDir: art.articleDir
    });
  }
}

// -------------------------------------------------------------------------------------------------
// CONSTRUCCIÓN DEL DOCUMENTO HTML COMPLETO
// -------------------------------------------------------------------------------------------------
function buildSampleHtml(pageMap = {}) {
  const officialCoverPath = path.join(outputDir, 'Portada_Acordes_Ocultos_Volumen_I.jpg');
  const coverSrc = `file://${officialCoverPath}`;

  const chaptersHtml = [];
  for (const ch of sampleChapters) {
    const parsedContent = markdownToEditorialHtml(ch.body, ch.articleDir, ch.slug);

    chaptersHtml.push(`
      <article class="chapter-article" id="capitulo-${ch.order}">
        <header class="chapter-header">
          ${ch.coverImg ? `
          <div class="chapter-cover-container">
            <div class="chapter-cover-frame">
              <img src="${ch.coverImg.pdfSrc}" alt="${escapeHtml(ch.coverImg.alt || ch.song)}" class="chapter-cover-img" />
            </div>
            ${ch.coverImg.caption ? `<div class="chapter-cover-caption"><span>✦</span> ${inlineMarkdown(ch.coverImg.caption)}</div>` : ''}
          </div>` : ''}
          <div class="chapter-kicker">MUESTRA EDITORIAL · CRÓNICA ${ch.order} DE 3</div>
          <h1 class="chapter-title">${escapeHtml(ch.title)}</h1>
          <div class="chapter-meta-line">
            <span class="meta-work">«${escapeHtml(ch.song)}» — <strong>${escapeHtml(ch.artist)}</strong></span>
            <span class="meta-sep">·</span>
            <span class="meta-year">Grabación original: ${ch.releaseYear}</span>
            <span class="meta-sep">·</span>
            <span class="meta-ed">Edición documental: 2026</span>
          </div>
          ${ch.reelUrl ? `
          <div class="reel-badge-container">
            <a href="${ch.reelUrl}" class="reel-badge-link" target="_blank">
              <span class="reel-icon">▶</span>
              <span>Ver minidocumental original en Instagram (@acordesocultos72)</span>
            </a>
          </div>` : ''}
        </header>

        <div class="chapter-body">
          ${parsedContent}
        </div>
      </article>
    `);
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acordes Ocultos — Volumen 01 · Muestra Gratuita de Colección</title>
  <style>
    @page {
      size: 170mm 240mm;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'EB Garamond', 'Garamond', Georgia, serif;
        font-size: 8.5pt;
        color: #736b5e;
      }
      @bottom-left {
        content: "Acordes Ocultos · Muestra Oficial";
        font-family: 'EB Garamond', 'Garamond', Georgia, serif;
        font-size: 8pt;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #736b5e;
      }
    }

    @page:first {
      margin: 0;
      @bottom-right { content: none; }
      @bottom-left { content: none; }
    }

    * { box-sizing: border-box; }
    body {
      font-family: 'EB Garamond', Georgia, serif;
      font-size: 10.5pt;
      line-height: 1.62;
      color: #1a1714;
      background-color: #fff;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* PORTADA OFICIAL CON BADGE DE MUESTRA */
    .cover-page {
      page-break-after: always;
      width: 170mm;
      height: 240mm;
      position: relative;
      overflow: hidden;
      background: #0d0b09;
    }
    .cover-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .sample-ribbon {
      position: absolute;
      top: 14mm;
      left: 12mm;
      right: 12mm;
      background: rgba(18, 15, 12, 0.88);
      border: 1px solid rgba(212, 160, 23, 0.65);
      border-radius: 4px;
      padding: 6px 12px;
      text-align: center;
      color: #f7d582;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }

    /* PÁGINA DE BIENVENIDA Y CRÉDITOS */
    .prelim-page {
      page-break-after: always;
      padding-top: 14mm;
    }
    .prelim-badge {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 7pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #8c6a2d;
      font-weight: 700;
      text-align: center;
      margin-bottom: 6px;
    }
    .prelim-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 18pt;
      text-align: center;
      color: #1a1714;
      margin: 0 0 14px 0;
      letter-spacing: 0.04em;
    }
    .prelim-intro {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #332f2a;
      text-align: justify;
      margin-bottom: 14px;
    }
    .sample-box {
      background: #faf7f2;
      border: 1px solid #e3dac9;
      border-left: 3px solid #8c6a2d;
      padding: 12px 14px;
      margin: 18px 0;
      border-radius: 2px;
    }
    .sample-box h4 {
      margin: 0 0 6px 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8c6a2d;
    }
    .sample-box p {
      margin: 0;
      font-size: 9.5pt;
      line-height: 1.5;
      color: #4a443b;
    }

    /* ÍNDICE DE LA MUESTRA */
    .toc-section {
      margin-top: 20px;
      border-top: 1px solid #e6ded3;
      padding-top: 16px;
    }
    .toc-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1a1714;
      margin-bottom: 12px;
      text-align: center;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9.5pt;
      padding: 6px 0;
      border-bottom: 1px dashed #e8e2d8;
    }
    .toc-item strong {
      color: #1a1714;
    }
    .toc-item span {
      color: #736b5e;
      font-size: 8.5pt;
    }

    /* CAPÍTULOS */
    .chapter-article {
      page-break-before: always;
      padding-top: 4mm;
    }
    .chapter-kicker {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #8c6a2d;
      text-align: center;
      margin-bottom: 4px;
    }
    .chapter-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 16pt;
      line-height: 1.3;
      text-align: center;
      margin: 4px 0 10px 0;
      color: #1a1714;
    }
    .chapter-meta-line {
      text-align: center;
      font-size: 8.5pt;
      color: #736b5e;
      margin-bottom: 14px;
    }
    .meta-sep { margin: 0 4px; color: #b8ad9e; }
    .reel-badge-container {
      text-align: center;
      margin: 8px 0 18px 0;
    }
    .reel-badge-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f4efe6;
      border: 1px solid #dfd5c4;
      border-radius: 20px;
      padding: 4px 12px;
      color: #8c6a2d;
      text-decoration: none;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .reel-icon { font-size: 8pt; }

    .chapter-cover-container {
      margin-bottom: 16px;
      text-align: center;
    }
    .chapter-cover-frame {
      border: 1px solid #d4c8b6;
      padding: 3px;
      background: #faf7f2;
      display: inline-block;
      max-width: 100%;
    }
    .chapter-cover-img {
      max-width: 100%;
      max-height: 85mm;
      display: block;
      object-fit: cover;
    }
    .chapter-cover-caption {
      font-size: 8pt;
      color: #736b5e;
      margin-top: 5px;
      font-style: italic;
    }

    .chapter-body p {
      margin: 0 0 11pt 0;
      text-align: justify;
      text-indent: 14pt;
    }
    .chapter-body p.drop-cap-p {
      text-indent: 0;
    }
    .chapter-body p.drop-cap-p::first-letter {
      float: left;
      font-family: 'Cinzel', Georgia, serif;
      font-size: 38pt;
      line-height: 0.85;
      padding-top: 4px;
      padding-right: 8px;
      padding-bottom: 0;
      color: #8c6a2d;
    }

    .act-separator {
      text-align: center;
      margin: 20pt 0 14pt 0;
      page-break-after: avoid;
    }
    .act-ornament {
      font-size: 8pt;
      color: #bfa15f;
      letter-spacing: 0.2em;
    }
    .act-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 11.5pt;
      letter-spacing: 0.08em;
      margin: 4px 0 0 0;
      color: #2b2620;
    }

    .pull-quote {
      margin: 16pt 18pt;
      padding: 8pt 14pt;
      border-left: 2px solid #bfa15f;
      background: #faf7f2;
      font-style: italic;
      color: #2c2721;
      font-size: 10pt;
      line-height: 1.5;
    }
    .pull-quote p { text-indent: 0 !important; margin: 0; }

    .editorial-figure {
      margin: 16pt 0;
      text-align: center;
      page-break-inside: avoid;
    }
    .figure-frame {
      display: inline-block;
      border: 1px solid #d4c8b6;
      padding: 3px;
      background: #faf7f2;
      max-width: 100%;
    }
    .figure-frame img {
      max-width: 100%;
      max-height: 75mm;
      display: block;
    }
    .figure-caption {
      font-size: 8pt;
      color: #736b5e;
      font-style: italic;
      margin-top: 5px;
    }

    .sources-section {
      margin-top: 22pt;
      padding-top: 12pt;
      border-top: 1px solid #e3dac9;
      font-size: 8pt;
      color: #635b50;
      page-break-inside: avoid;
    }
    .sources-title {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 7.5pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #8c6a2d;
      margin-bottom: 8px;
    }
    .editorial-list {
      padding-left: 14pt;
      margin: 0;
    }
    .editorial-list li {
      margin-bottom: 4pt;
    }

    /* PÁGINA FINAL: LLAMADO A LA EDICIÓN COMPLETA */
    .cta-final-page {
      page-break-before: always;
      padding-top: 10mm;
      text-align: center;
    }
    .cta-card {
      background: #14120e;
      color: #f5f2eb;
      border: 1px solid #bfa15f;
      border-radius: 6px;
      padding: 24px 20px;
      margin-top: 10px;
    }
    .cta-kicker {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #e5b958;
      margin-bottom: 8px;
    }
    .cta-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 17pt;
      margin: 0 0 12px 0;
      color: #ffffff;
      line-height: 1.3;
    }
    .cta-desc {
      font-size: 9.5pt;
      line-height: 1.6;
      color: #d1c9bd;
      margin-bottom: 18px;
      text-align: justify;
    }
    .full-index-preview {
      background: #1e1a14;
      border: 1px solid #383226;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 20px;
      text-align: left;
    }
    .full-index-title {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #e5b958;
      margin-bottom: 8px;
      text-align: center;
    }
    .full-index-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
      font-size: 7.5pt;
      color: #b3a99a;
    }
    .btn-buy {
      display: inline-block;
      background: #e5b958;
      color: #0d0b09;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 9.5pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 10px 24px;
      border-radius: 24px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(229, 185, 88, 0.35);
    }
    .cta-footer-note {
      font-size: 7.5pt;
      color: #8c8273;
      margin-top: 14px;
    }
  </style>
</head>
<body>

  <!-- PORTADA DE LA MUESTRA -->
  <div class="cover-page">
    <img src="${coverSrc}" alt="Acordes Ocultos Volumen 01" class="cover-bg" />
    <div class="sample-ribbon">
      ✦ Muestra Gratuita de Colección · 3 Crónicas Completas ✦
    </div>
  </div>

  <!-- PÁGINA DE BIENVENIDA -->
  <div class="prelim-page">
    <div class="prelim-badge">EDICIÓN DE CORTESÍA · LA COFRADÍA</div>
    <h2 class="prelim-title">La Música que Guarda lo que el Tiempo Olvida</h2>
    
    <p class="prelim-intro">
      Hay canciones que forman parte de la memoria sentimental del mundo, pero cuyos orígenes más íntimos permanecieron ocultos bajo el barniz del éxito comercial y las versiones oficiales.
    </p>

    <div class="sample-box">
      <h4>Bienvenido a esta Muestra Oficial</h4>
      <p>
        Este ejemplar digital de cortesía reúne <strong>tres crónicas completas</strong> extraídas directamente de la primera edición oficial de <em>Acordes Ocultos — Volumen I (28 Historias Humanas detrás de la Música)</em>. Ha sido maquetado con la misma devoción tipográfica, rigor documental y enlaces interactivos a los videos originales que la obra íntegra de 241 páginas.
      </p>
    </div>

    <div class="toc-section">
      <div class="toc-title">Crónicas Incluidas en esta Muestra</div>
      
      <div class="toc-item">
        <strong>1. The Great Gig in the Sky — Pink Floyd</strong>
        <span>Abbey Road, 1973</span>
      </div>
      <div class="toc-item">
        <strong>2. That’s All Right — Elvis Presley</strong>
        <span>Sun Studio, 1954</span>
      </div>
      <div class="toc-item">
        <strong>3. Eres tú — Mocedades</strong>
        <span>Eurovisión, 1973</span>
      </div>
    </div>
  </div>

  <!-- LOS 3 CAPÍTULOS DE MUESTRA -->
  ${chaptersHtml.join('\n')}

  <!-- PÁGINA FINAL: INVITACIÓN A LA OBRA COMPLETA -->
  <div class="cta-final-page">
    <div class="cta-card">
      <div class="cta-kicker">¿TE CONMOVIERON ESTAS HISTORIAS?</div>
      <h2 class="cta-title">Continúa el Viaje con el Libro Completo</h2>
      
      <p class="cta-desc">
        La edición íntegra de <strong>Acordes Ocultos — Volumen I</strong> reúne <strong>28 crónicas documentales</strong>, más de 200 fotografías y documentos de archivo restaurados, divididos en cuatro partes temáticas: <em>El Destino y la Creación</em>, <em>El Vínculo Íntimo</em>, <em>La Herida Colectiva</em> y <em>El Precio del Éxito</em>.
      </p>

      <div class="full-index-preview">
        <div class="full-index-title">28 Obras Inmortales en 241 Páginas</div>
        <div class="full-index-grid">
          <div>4. California Dreamin' — Mamas & Papas</div>
          <div>16. Another Brick in the Wall — Pink Floyd</div>
          <div>5. Like a Rolling Stone — Bob Dylan</div>
          <div>17. Gimme Shelter — Rolling Stones</div>
          <div>6. My Heart Will Go On — Céline Dion</div>
          <div>18. Todo cambia — Mercedes Sosa</div>
          <div>7. Bohemian Rhapsody — Queen</div>
          <div>19. Zombie — The Cranberries</div>
          <div>8. Father and Son — Cat Stevens</div>
          <div>21. Redemption Song — Bob Marley</div>
          <div>10. Lovin' You — Minnie Riperton</div>
          <div>22. Piece of My Heart — Janis Joplin</div>
          <div>12. Time in a Bottle — Jim Croce</div>
          <div>24. Un beso y una flor — Nino Bravo</div>
          <div>14. Amor Eterno — Dúrcal & Juan Gabriel</div>
          <div>26. Marinero de Luces — Isabel Pantoja</div>
        </div>
      </div>

      <a href="https://acordesocultos.gumroad.com/l/acordes-ocultos-vol-1/LANZAMIENTO" class="btn-buy" target="_blank">
        📖 Adquirir Libro Completo — $7.99 USD (Descuento Especial) →
      </a>

      <div class="cta-footer-note">
        Edición 100% digital libre de DRM · Incluye PDF Editorial (241 págs.) + EPUB 3 para Kindle, iPad y móvil.
      </div>
    </div>
  </div>

</body>
</html>`;
}

// -------------------------------------------------------------------------------------------------
// COMPILACIÓN CON PLAYWRIGHT (CHROME HEADLESS)
// -------------------------------------------------------------------------------------------------
async function main() {
  const sampleHtmlPath = path.join(outputDir, 'Acordes_Ocultos_Volumen_I_Muestra.html');
  const samplePdfPath = path.join(outputDir, 'Acordes_Ocultos_Volumen_I_Muestra.pdf');
  const webSamplePdfPath = path.join(webPublicBookDir, 'Acordes_Ocultos_Volumen_I_Muestra.pdf');
  const rootSamplePdfPath = path.join(rootOutputDir, 'Acordes_Ocultos_Volumen_I_Muestra.pdf');

  console.log('✍️  Generando HTML editorial para la muestra...');
  fs.writeFileSync(sampleHtmlPath, buildSampleHtml(), 'utf8');

  console.log('🖨️  Renderizando PDF de muestra con Chromium...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('file://' + sampleHtmlPath, { waitUntil: 'load', timeout: 60000 });
  await page.pdf({
    path: samplePdfPath,
    preferCSSPageSize: true,
    printBackground: true,
    outline: true,
    tagged: true
  });
  await browser.close();

  const stat = fs.statSync(samplePdfPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ ¡PDF de muestra generado con éxito! Tamaño: ${sizeMb} MB`);

  // Copiar a web/public/book y output raíz
  fs.copyFileSync(samplePdfPath, webSamplePdfPath);
  fs.copyFileSync(samplePdfPath, rootSamplePdfPath);
  console.log(`📁 Copiado a web/public/book: ${webSamplePdfPath}`);
  console.log(`📁 Copiado a output raíz: ${rootSamplePdfPath}`);

  // Sincronizar con Google Drive si existe
  const gdriveDir = '/Users/luissolano/Library/CloudStorage/GoogleDrive-luis.solano.l@gmail.com/Mi unidad/Acordes Ocultos - Bóveda Maestra/05_Libro_Compendio_Digital';
  if (fs.existsSync(gdriveDir)) {
    try {
      fs.copyFileSync(samplePdfPath, path.join(gdriveDir, 'Acordes_Ocultos_Volumen_I_Muestra.pdf'));
      console.log('☁️  Copiado a Google Drive Bóveda Maestra.');
    } catch (e) {
      console.warn('No se pudo copiar a Google Drive:', e.message);
    }
  }

  // Subir a Cloudflare R2
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET || 'nexo-gaming-news-videos';
  const publicR2Base = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev';

  if (accountId && accessKeyId && secretAccessKey) {
    console.log('☁️  Subiendo PDF de muestra a Cloudflare R2...');
    try {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey }
      });

      const fileBuffer = fs.readFileSync(samplePdfPath);
      const r2Key = 'book/Acordes_Ocultos_Volumen_I_Muestra.pdf';

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: 'application/pdf',
          ContentDisposition: 'inline; filename="Acordes_Ocultos_Volumen_I_Muestra.pdf"'
        })
      );

      const r2Url = `${publicR2Base}/${r2Key}`;
      console.log(`🎉 ¡Subida a R2 completada con éxito!`);
      console.log(`🔗 Enlace CDN público R2: ${r2Url}`);
    } catch (r2Err) {
      console.error('⚠️  Error al subir a R2:', r2Err.message);
    }
  }

  console.log('\n======================================================');
  console.log('🎯 ENLACES DE DESCARGA DE LA DEMO / MUESTRA:');
  console.log('1. Web Oficial Directo: https://www.acordesocultos.com/book/Acordes_Ocultos_Volumen_I_Muestra.pdf');
  console.log('2. CDN Cloudflare R2: https://pub-66bcff63b213457b8f7b3c02bb87d06c.r2.dev/book/Acordes_Ocultos_Volumen_I_Muestra.pdf');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
