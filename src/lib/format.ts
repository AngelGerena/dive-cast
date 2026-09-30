export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

export function dayNum(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit' });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function dateLabel(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const KIND_LABEL: Record<string, string> = {
  spring: 'Spring', reef: 'Reef', wreck: 'Wreck', shore: 'Shore dive', drift: 'Drift dive'
};
