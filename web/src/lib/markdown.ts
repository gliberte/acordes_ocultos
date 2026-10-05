/**
 * Strips YAML frontmatter (--- ... ---) from the beginning of a markdown string
 */
export function stripFrontmatter(md: string): string {
  if (!md) return '';
  return md.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n*/, '').trim();
}

/**
 * Extracts a clean plain-text summary from markdown content (stripping frontmatter, images, headers, and markdown syntax)
 */
export function extractCleanSummary(md: string, maxLength = 220): string {
  if (!md) return '';
  const withoutFrontmatter = stripFrontmatter(md);
  const plain = withoutFrontmatter
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/^\>+\s*/gm, '')
    .replace(/^---$/gm, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  return plain.length > maxLength ? plain.slice(0, maxLength).trim() + '...' : plain;
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-amber-200 font-bold"><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-neutral-100 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-neutral-200 italic">$1</em>');
}

/**
 * Lightweight, safe markdown-to-HTML converter for chronicles and articles
 */
export function formatChronicleMarkdown(md: string, slug?: string): string {
  if (!md) return '';

  // 1. Strip YAML frontmatter at top of file
  let html = stripFrontmatter(md);

  // 2. Strip leading H1 title if present (since page header already renders the main title)
  html = html.replace(/^#\s+[^\r\n]+\r?\n+/, '');

  // 3. Fix relative image links like images/foto.png (and optional immediate *caption* line) -> /articles/<slug>/images/foto.webp
  if (slug) {
    html = html.replace(
      /!\[(.*?)\]\((?:\.\/)?images\/(.*?)\)(?:\r?\n\*([^\r\n*]+)\*)?/gi,
      (_match, alt, filename, italicCaption) => {
        const baseName = filename.trim().replace(/\.[^.]+$/, '');
        const webpFilename = `${baseName}.webp`;
        const captionText = (italicCaption || alt || '').trim();
        return `\n\n<figure class="my-10 max-w-[440px] sm:max-w-[480px] mx-auto rounded-2xl overflow-hidden border border-[#2b2721] bg-[#12100d] shadow-2xl transition-all select-none">
        <div class="relative">
          <div class="absolute inset-0 z-10" data-image-shield="true" aria-hidden="true"></div>
          <picture>
            <source srcset="/articles/${slug}/images/${webpFilename}" type="image/webp" />
            <img src="/articles/${slug}/images/${webpFilename}" alt="${alt || captionText}" loading="lazy" decoding="async" draggable="false" class="w-full h-auto object-contain block mx-auto select-none pointer-events-none" />
          </picture>
        </div>
        ${captionText ? `<figcaption class="p-3.5 text-xs text-center text-neutral-400 font-sans italic border-t border-[#1f1d19] bg-[#0f0e0b] leading-relaxed">${formatInlineMarkdown(captionText)}</figcaption>` : ''}
      </figure>\n\n`;
      }
    );
  }

  // 4. Standard external/other images (and optional immediate *caption* line)
  html = html.replace(
    /!\[(.*?)\]\((.*?)\)(?:\r?\n\*([^\r\n*]+)\*)?/g,
    (_match, alt, src, italicCaption) => {
      const captionText = (italicCaption || alt || '').trim();
      return `\n\n<figure class="my-10 max-w-[440px] sm:max-w-[480px] mx-auto rounded-2xl overflow-hidden border border-[#2b2721] bg-[#12100d] shadow-2xl transition-all select-none">
      <div class="relative">
        <div class="absolute inset-0 z-10" data-image-shield="true" aria-hidden="true"></div>
        <img src="${src.trim()}" alt="${alt || captionText}" loading="lazy" decoding="async" draggable="false" class="w-full h-auto object-contain block mx-auto select-none pointer-events-none" />
      </div>
      ${captionText ? `<figcaption class="p-3.5 text-xs text-center text-neutral-400 font-sans italic border-t border-[#1f1d19] bg-[#0f0e0b] leading-relaxed">${formatInlineMarkdown(captionText)}</figcaption>` : ''}
    </figure>\n\n`;
    }
  );

  // 5. Process blocks and lines cleanly
  const blocks = html.split(/\n\n+/);
  const renderedBlocks: string[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    // Pass-through already rendered <figure> blocks
    if (block.startsWith('<figure')) {
      renderedBlocks.push(block);
      continue;
    }

    // Horizontal rule
    if (/^---|\*\*\*|___$/.test(block)) {
      // Avoid consecutive duplicate <hr> tags
      if (renderedBlocks.length > 0 && !renderedBlocks[renderedBlocks.length - 1].startsWith('<hr')) {
        renderedBlocks.push('<hr class="my-10 border-[#26231e]" />');
      }
      continue;
    }

    // Headers
    if (block.startsWith('### ')) {
      renderedBlocks.push(
        `<h3 class="font-serif text-xl sm:text-2xl font-bold text-amber-300 mt-10 mb-4 tracking-tight">${formatInlineMarkdown(block.slice(4).trim())}</h3>`
      );
      continue;
    }
    if (block.startsWith('## ')) {
      renderedBlocks.push(
        `<h2 class="font-serif text-2xl sm:text-3xl font-bold text-neutral-100 mt-12 mb-6 tracking-tight border-b border-[#26231e] pb-3">${formatInlineMarkdown(block.slice(3).trim())}</h2>`
      );
      continue;
    }
    if (block.startsWith('# ')) {
      renderedBlocks.push(
        `<h1 class="font-serif text-3xl sm:text-4xl font-bold text-white mt-12 mb-6 tracking-tight">${formatInlineMarkdown(block.slice(2).trim())}</h1>`
      );
      continue;
    }

    const lines = block.split(/\r?\n/);

    // Multi-line or single-line Blockquote
    if (lines.every(l => l.trim().startsWith('>'))) {
      const quoteLines = lines.map(l => formatInlineMarkdown(l.trim().replace(/^>\s?/, '')));
      renderedBlocks.push(
        `<blockquote class="border-l-2 border-amber-500 bg-amber-500/5 my-6 py-3.5 px-5 text-sm sm:text-base text-neutral-200 italic font-serif leading-relaxed">${quoteLines.join('<br />')}</blockquote>`
      );
      continue;
    }

    // Unordered list (* or -)
    if (lines.every(l => /^\s*[\*\-]\s+/.test(l))) {
      const items = lines.map(l => {
        const content = l.replace(/^\s*[\*\-]\s+/, '').trim();
        return `<li class="pl-1">${formatInlineMarkdown(content)}</li>`;
      });
      renderedBlocks.push(
        `<ul class="my-5 space-y-2.5 list-disc list-inside text-neutral-300 text-base sm:text-lg leading-relaxed font-sans font-light">${items.join('\n')}</ul>`
      );
      continue;
    }

    // Ordered list or structured bibliography block (1. ... with optional sub-bullets)
    if (/^\s*\d+\.\s+/.test(lines[0])) {
      const listHtml = lines
        .map(l => {
          const trimmed = l.trim();
          if (/^\d+\.\s+/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              return `<div class="mt-3 first:mt-0"><span class="text-amber-400 font-semibold mr-1.5">${numMatch[1]}.</span>${formatInlineMarkdown(numMatch[2])}</div>`;
            }
          }
          if (/^[\*\-]\s+/.test(trimmed)) {
            return `<div class="pl-5 text-sm sm:text-base text-neutral-400 mt-1">• ${formatInlineMarkdown(trimmed.replace(/^[\*\-]\s+/, ''))}</div>`;
          }
          return `<div>${formatInlineMarkdown(trimmed)}</div>`;
        })
        .join('\n');
      renderedBlocks.push(
        `<div class="my-5 text-neutral-300 text-base sm:text-lg leading-relaxed font-sans font-light">${listHtml}</div>`
      );
      continue;
    }

    // Regular paragraph (process line by line to protect any inline sub-elements)
    const formattedLines = lines.map(l => {
      const t = l.trim();
      if (/^[\*\-]\s+/.test(t)) {
        return `• ${formatInlineMarkdown(t.replace(/^[\*\-]\s+/, ''))}`;
      }
      return formatInlineMarkdown(t);
    });

    renderedBlocks.push(
      `<p class="my-5 text-neutral-300 text-base sm:text-lg leading-relaxed font-sans font-light">${formattedLines.join('<br />')}</p>`
    );
  }

  return renderedBlocks.join('\n');
}
