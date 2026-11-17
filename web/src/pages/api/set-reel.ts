import type { APIRoute } from 'astro';
import { adminConfig, PRIVATE_HEADERS, sameOrigin, SESSION_COOKIE, validSession } from '../../lib/admin-session';
import { clearStoriesCache, normalizeInstagramReelInput, slugify } from '../../lib/stories';
import { getFromR2, saveToR2 } from '../../lib/r2';
import storiesCatalogFallback from '../../data/stories_catalog.json';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Origen no autorizado' }), {
      status: 403,
      headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  if (!validSession(cookies.get(SESSION_COOKIE)?.value, adminConfig())) {
    return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
      status: 401,
      headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const SUPABASE_URL =
    import.meta.env.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://dsyxiowlipttwjuhoqio.supabase.co';

  const SUPABASE_KEY =
    import.meta.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  try {
    const body = await request.json();
    const { storyId, reelUrl, slug, slugEn, articleSlug, title, artist, lang } = body || {};
    const isEn = lang === 'en';

    const rawReel = typeof reelUrl === 'string' ? reelUrl.trim() : '';
    const cleanReelUrl = rawReel ? normalizeInstagramReelInput(rawReel) : '';
    if (rawReel && !cleanReelUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Formato inválido. Pega el Reel ID (ej. DfXItzBxR_0) o la URL completa de Instagram.'
        }),
        { status: 400, headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // 1. Fetch live catalog from R2 with immediate fallback to precompiled catalog
    let catalog: any[] = [];
    try {
      const r2Data = await getFromR2<any[]>('catalog/stories_catalog.json');
      if (Array.isArray(r2Data) && r2Data.length > 0) {
        catalog = r2Data;
      }
    } catch (r2Err) {
      console.warn('[set-reel] Error fetching catalog from R2:', r2Err);
    }

    if (catalog.length === 0 && Array.isArray(storiesCatalogFallback)) {
      catalog = JSON.parse(JSON.stringify(storiesCatalogFallback));
    }

    // Prepare match identifiers (exact ID first, then exact slug/slugEn/articleSlug, then normalized)
    const cleanInputSlug = (slug || storyId || '').toLowerCase().replace(/^historia-/, '').replace(/[^a-z0-9]/g, '');
    const cleanInputSlugEn = (slugEn || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanInputArticleSlug = (articleSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanInputTitle = (title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');

    const findMatchIndex = (list: any[]) => {
      if (storyId) {
        const byId = list.findIndex((item: any) => item.id === storyId);
        if (byId >= 0) return byId;
      }
      const byExactSlug = list.findIndex((item: any) =>
        (slug && item.slug === slug) ||
        (articleSlug && item.articleSlug === articleSlug) ||
        (slugEn && item.slugEn === slugEn)
      );
      if (byExactSlug >= 0) return byExactSlug;

      return list.findIndex((item: any) => {
        if (storyId && item.slug === storyId) return true;
        const iSlug = (item.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const iSlugEn = (item.slugEn || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const iArticle = (item.articleSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const iTitle = (item.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
        const iTitleEn = (item.titleEn || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
        if (cleanInputSlug && iSlug && (iSlug === cleanInputSlug || iSlug.includes(cleanInputSlug) || cleanInputSlug.includes(iSlug))) return true;
        if (cleanInputArticleSlug && iArticle && iArticle === cleanInputArticleSlug) return true;
        if (cleanInputSlugEn && iSlugEn && iSlugEn === cleanInputSlugEn) return true;
        if (cleanInputTitle && ((iTitle && (iTitle === cleanInputTitle || iTitle.includes(cleanInputTitle) || cleanInputTitle.includes(iTitle))) || (iTitleEn && (iTitleEn === cleanInputTitle || iTitleEn.includes(cleanInputTitle) || cleanInputTitle.includes(iTitleEn))))) return true;
        return false;
      });
    };

    let matchIdx = findMatchIndex(catalog);
    let matchedStory: any = null;

    if (matchIdx >= 0) {
      matchedStory = catalog[matchIdx];
      if (isEn) {
        const targetArticleSlug = catalog[matchIdx].articleSlug || articleSlug;
        const applyEnUpdate = (entry: any) => {
          entry.instagramUrlEn = cleanReelUrl || null;
          entry.igPublishedAtEn = cleanReelUrl ? now : null;
          if (cleanReelUrl) {
            entry.isHiddenEn = false;
          }
        };
        applyEnUpdate(catalog[matchIdx]);
        if (targetArticleSlug) {
          for (let i = 0; i < catalog.length; i++) {
            if (i !== matchIdx && catalog[i].articleSlug === targetArticleSlug) {
              applyEnUpdate(catalog[i]);
            }
          }
        }
      } else {
        catalog[matchIdx].instagramUrl = cleanReelUrl || null;
        catalog[matchIdx].igPublishedAt = cleanReelUrl ? now : null;
        if (cleanReelUrl) {
          catalog[matchIdx].publishedAt = now;
          catalog[matchIdx].isLatestReel = true;
          catalog[matchIdx].isHidden = false;
        } else {
          catalog[matchIdx].isLatestReel = false;
        }
      }
    } else {
      // If not in current R2 catalog, try to find in fallback or create new entry
      const fallbackIdx = findMatchIndex(storiesCatalogFallback as any[]);
      const fallbackItem = fallbackIdx >= 0 ? (storiesCatalogFallback as any[])[fallbackIdx] : null;

      const newEntry = fallbackItem ? { ...fallbackItem } : {
        id: storyId || slug || `story-${Date.now()}`,
        slug: slug || slugify(title || 'historia'),
        title: title || 'Sin título',
        artist: artist || '',
        category: 'acordes-ocultos',
        categoryLabel: 'Acordes Ocultos',
        coverUrl: `/covers/${slug || storyId}.webp`,
        publishedAt: now
      };

      if (isEn) {
        newEntry.instagramUrlEn = cleanReelUrl || null;
        newEntry.igPublishedAtEn = cleanReelUrl ? now : null;
        if (cleanReelUrl) {
          newEntry.isHiddenEn = false;
        }
      } else {
        newEntry.instagramUrl = cleanReelUrl || null;
        newEntry.igPublishedAt = cleanReelUrl ? now : null;
        newEntry.isLatestReel = Boolean(cleanReelUrl);
        if (cleanReelUrl) {
          newEntry.isHidden = false;
        }
      }

      catalog.unshift(newEntry);
      matchIdx = 0;
      matchedStory = newEntry;
    }

    // If setting a Spanish reel, ensure older stories don't keep isLatestReel
    if (!isEn && cleanReelUrl) {
      for (let i = 0; i < catalog.length; i++) {
        if (i !== matchIdx) {
          catalog[i].isLatestReel = false;
        }
      }
    }

    // 2. Save updated catalog to Cloudflare R2 (the primary live source of truth)
    let r2Saved = false;
    try {
      const ok1 = await saveToR2('catalog/stories_catalog.json', catalog);
      const ok2 = await saveToR2('acordes-ocultos/catalog/stories_catalog.json', catalog);
      r2Saved = ok1 || ok2;
      console.log(`[set-reel:${isEn ? 'en' : 'es'}] R2 catalog saved: ok1=${ok1}, ok2=${ok2}`);
    } catch (saveErr) {
      console.warn('[set-reel] Error saving catalog to R2:', saveErr);
    }

    // 3. Update local file on disk if available (for local dev / build environments)
    try {
      const possiblePaths = [
        path.resolve(process.cwd(), 'src/data/stories_catalog.json'),
        path.resolve(process.cwd(), 'web/src/data/stories_catalog.json')
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          fs.writeFileSync(p, JSON.stringify(catalog, null, 2), 'utf8');
        }
      }
    } catch (_) {}

    // 4. Best-effort update to Supabase (graceful fallback if egress quota is restricted)
    let supabaseUpdated = false;
    if (SUPABASE_KEY && SUPABASE_URL) {
      try {
        const headers = {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
          'content-type': 'application/json'
        };

        let targetRowId: string | null = null;
        let currentPlan: any = {};

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId || '');
        if (isUuid) {
          const getRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${storyId}&select=id,production_plan`, { headers });
          if (getRes.ok) {
            const rows = await getRes.json();
            if (Array.isArray(rows) && rows.length > 0) {
              targetRowId = rows[0].id;
              currentPlan = rows[0].production_plan || {};
            }
          }
        }

        if (!targetRowId) {
          const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?select=id,title,production_plan&order=created_at.desc&limit=100`, { headers });
          if (searchRes.ok) {
            const rows = await searchRes.json();
            if (Array.isArray(rows)) {
              const match = rows.find((r: any) => {
                if (storyId && r.id === storyId) return true;
                const rSlug = (r.production_plan?.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const rTitle = (r.title || '').toLowerCase().replace(/\|.*$/, '').replace(/[^a-z0-9]/g, '');
                if (rSlug && cleanInputSlug && rSlug === cleanInputSlug) return true;
                if (rTitle && cleanInputTitle && rTitle === cleanInputTitle) return true;
                return false;
              });
              if (match) {
                targetRowId = match.id;
                currentPlan = match.production_plan || {};
              }
            }
          }
        }

        if (targetRowId) {
          const updatedPlan = isEn
            ? {
                ...currentPlan,
                instagram_reel_url_en: cleanReelUrl || null,
                ig_published_at_en: cleanReelUrl ? (currentPlan.ig_published_at_en || now) : null,
                ...(cleanReelUrl ? { is_hidden_en: false } : {})
              }
            : {
                ...currentPlan,
                instagram_reel_url: cleanReelUrl || null,
                ig_published_at: cleanReelUrl ? (currentPlan.ig_published_at || now) : null,
                is_latest_reel: Boolean(cleanReelUrl)
              };

          const patchBody: Record<string, any> = { production_plan: updatedPlan };
          if (!isEn) {
            patchBody.ig_published = Boolean(cleanReelUrl);
          }

          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/published_news?id=eq.${targetRowId}`, {
            method: 'PATCH',
            headers: { ...headers, prefer: 'return=representation' },
            body: JSON.stringify(patchBody)
          });

          if (patchRes.ok) {
            supabaseUpdated = true;
          }
        }
      } catch (sbErr: any) {
        console.warn(`[set-reel] Supabase sync skipped (non-fatal):`, sbErr?.message);
      }
    }

    // 5. Invalidate in-memory cache
    clearStoriesCache();

    return new Response(
      JSON.stringify({
        success: true,
        lang: isEn ? 'en' : 'es',
        storyId: matchedStory?.id || storyId,
        slug: matchedStory?.slug || slug,
        title: isEn ? (matchedStory?.titleEn || matchedStory?.title || title) : (matchedStory?.title || title),
        reelUrl: cleanReelUrl,
        r2Synced: r2Saved,
        supabaseSynced: supabaseUpdated
      }),
      { status: 200, headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[set-reel] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
};
