/**
 * Lightweight, safe markdown-to-HTML converter for chronicles and articles
 */
export function formatChronicleMarkdown(md: string, slug?: string): string {
  if (!md) return '';

  let html = md;

  // Fix relative image links like images/foto.png -> /articles/<slug>/images/foto.webp with fallback
  if (slug) {
    html = html.replace(/!\[(.*?)\]\((?:\.\/)?images\/(.*?)\)/gi, (_match, alt, filename) => {
      const baseName = filename.replace(/\.[^.]+$/, '');
      const webpFilename = `${baseName}.webp`;
      return `<figure class="my-10 max-w-[440px] sm:max-w-[480px] mx-auto rounded-2xl overflow-hidden border border-[#2b2721] bg-[#12100d] shadow-2xl transition-all">
        <picture>
          <source srcset="/articles/${slug}/images/${webpFilename}" type="image/webp" />
          <img src="/articles/${slug}/images/${webpFilename}" alt="${alt}" loading="lazy" decoding="async" class="w-full h-auto object-contain block mx-auto" />
        </picture>
        ${alt ? `<figcaption class="p-3.5 text-xs text-center text-neutral-400 font-sans italic border-t border-[#1f1d19] bg-[#0f0e0b] leading-relaxed">${alt}</figcaption>` : ''}
      </figure>`;
    });
  }

  // Standard images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
    return `<figure class="my-10 max-w-[440px] sm:max-w-[480px] mx-auto rounded-2xl overflow-hidden border border-[#2b2721] bg-[#12100d] shadow-2xl transition-all">
      <img src="${src}" alt="${alt}" loading="lazy" decoding="async" class="w-full h-auto object-contain block mx-auto" />
      ${alt ? `<figcaption class="p-3.5 text-xs text-center text-neutral-400 font-sans italic border-t border-[#1f1d19] bg-[#0f0e0b] leading-relaxed">${alt}</figcaption>` : ''}
    </figure>`;
  });

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="font-serif text-xl sm:text-2xl font-bold text-amber-300 mt-10 mb-4 tracking-tight">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="font-serif text-2xl sm:text-3xl font-bold text-neutral-100 mt-12 mb-6 tracking-tight border-b border-[#26231e] pb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="font-serif text-3xl sm:text-4xl font-bold text-white mt-12 mb-6 tracking-tight">$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-amber-500 bg-amber-500/5 my-6 py-3 px-5 text-sm sm:text-base text-neutral-200 italic font-serif leading-relaxed">$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-amber-200 font-bold"><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-neutral-100 font-semibold">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="text-neutral-200 italic">$1</em>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr class="my-10 border-[#26231e]" />');

  // Paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<figure') || p.startsWith('<blockquote') || p.startsWith('<hr')) {
        return p;
      }
      return `<p class="my-5 text-neutral-300 text-base sm:text-lg leading-relaxed font-sans font-light">${p.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}
