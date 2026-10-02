import type { Business } from '../lib/types';

const SKIP = new Set(['the', 'and', 'of', 'at', 'a']);

// Two-letter monogram from the business name, skipping filler words
export function monogram(name: string) {
  const words = name.replace(/[^A-Za-z0-9\s']/g, ' ').split(/\s+/).filter((w) => w && !SKIP.has(w.toLowerCase()));
  const letters = words.slice(0, 2).map((w) => w[0]).join('');
  return (letters || name.slice(0, 2)).toUpperCase();
}

// Business logo when one has been uploaded, otherwise a crisp monogram colored by business type
export function BizBadge({ business, size = 'md' }: { business: Pick<Business, 'name' | 'kind' | 'logoUrl'>; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`biz-badge biz-badge-${size} kind-${business.kind}${business.logoUrl ? ' has-logo' : ''}`} aria-hidden="true">
      {business.logoUrl ? <img src={business.logoUrl} alt="" loading="lazy" decoding="async" /> : monogram(business.name)}
    </span>
  );
}
