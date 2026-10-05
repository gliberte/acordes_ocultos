import type { APIRoute } from 'astro';
import { getAllStories } from '../lib/stories';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.acordesocultos.com';
  const stories = await getAllStories({ includeHidden: false });

  // Escape XML characters
  const escapeXml = (unsafe: string) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // Format ISO date to YYYY-MM-DD
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const latestDate = stories.length > 0 ? formatDate(stories[0].publishedAt) : formatDate();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Páginas Estáticas y Legales -->
  <url>
    <loc>${siteUrl}/privacidad</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/aviso-legal</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/cookies</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Crónicas y Relatos Individuales -->
${stories
  .map(
    (story) => `  <url>
    <loc>${siteUrl}/historias/${escapeXml(story.slug)}</loc>
    <lastmod>${formatDate(story.publishedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
};
