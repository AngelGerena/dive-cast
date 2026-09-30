import type { Site } from './types';

// Photos bundled with the app under /images/sites/<slug>.jpg (plus a -thumb.jpg).
// A cover_photo_url set on the site in Supabase takes priority over these.
const BUNDLED = new Set(['blue-heron-bridge', 'blue-grotto', 'breakers-reef', 'ginnie-springs', 'peanut-island', 'molasses-reef', 'devils-den', 'spiegel-grove', 'rainbow-river']);

export interface SitePhoto {
  full: string;
  thumb: string;
  credit?: string;
}

export function sitePhoto(site: Site): SitePhoto | null {
  if (site.coverUrl) return { full: site.coverUrl, thumb: site.coverUrl, credit: site.photoCredit };
  if (BUNDLED.has(site.slug)) {
    return { full: `/images/sites/${site.slug}.jpg`, thumb: `/images/sites/${site.slug}-thumb.jpg`, credit: site.photoCredit };
  }
  return null;
}
