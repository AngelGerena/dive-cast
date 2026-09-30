import { supabase } from './supabase';
import { SITES } from './seed';
import type {
  Business, Certification, ConditionReport, CurrentStrength, DiverProfile, Dive, JoinRequest, OpenDive, Site
} from './types';

// Every Supabase read and write in one place. Rows are snake_case, app types camelCase.

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? undefined : String(v));
const num = (v: unknown) => (v == null ? undefined : Number(v));

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function toSite(r: Row): Site {
  const type = r.water_source_type as string;
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    kind: r.kind as Site['kind'],
    access: r.access as Site['access'],
    area: String(r.area),
    lat: Number(r.lat),
    lng: Number(r.lng),
    maxDepthFt: Number(r.max_depth_ft),
    minDepthFt: num(r.min_depth_ft),
    minCert: String(r.min_cert ?? 'Open Water'),
    summary: String(r.summary ?? ''),
    waterSource:
      type === 'coops' && r.water_station_id
        ? { type: 'coops', station: String(r.water_station_id), label: String(r.water_station_label ?? 'NOAA station') }
        : type === 'spring'
          ? { type: 'spring', tempF: Number(r.spring_temp_f ?? 72) }
          : { type: 'model' },
    tideStation: r.tide_station_id ? { id: String(r.tide_station_id), label: String(r.tide_station_label ?? 'NOAA station') } : undefined,
    usgsGauge: r.usgs_gauge_id ? { id: String(r.usgs_gauge_id), label: String(r.usgs_gauge_label ?? 'USGS gauge') } : undefined,
    coverUrl: str(r.cover_photo_url),
    photoCredit: str(r.cover_photo_credit),
    isDemo: Boolean(r.is_demo)
  };
}

// Sites ------------------------------------------------------------------
export async function fetchSites(): Promise<{ sites: Site[]; offline: boolean }> {
  try {
    const { data, error } = await supabase.from('sites').select('*').order('name');
    fail(error);
    if (!data?.length) return { sites: SITES, offline: true };
    return { sites: data.map(toSite), offline: false };
  } catch {
    return { sites: SITES, offline: true };
  }
}

export async function fetchBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase.from('businesses').select('*').order('name');
  fail(error);
  return (data ?? []).map((r) => ({
    id: r.id, name: r.name, kind: r.kind, area: r.area, lat: r.lat, lng: r.lng,
    offer: r.offer ?? undefined, claimed: Boolean(r.claimed_by), isDemo: r.is_demo
  }));
}

// Condition reports ------------------------------------------------------
export async function fetchReports(siteId?: string): Promise<ConditionReport[]> {
  let q = supabase.from('condition_reports_feed').select('*').order('reported_at', { ascending: false }).limit(siteId ? 60 : 200);
  if (siteId) q = q.eq('site_id', siteId);
  const { data, error } = await q;
  fail(error);
  return (data ?? []).map((r) => ({
    id: r.id, siteId: r.site_id, reportedAt: r.reported_at, depthFt: num(r.depth_ft), tempF: num(r.temp_f),
    visibilityFt: num(r.visibility_ft), current: (r.current ?? undefined) as CurrentStrength | undefined,
    note: r.note ?? undefined, diverName: r.diver_name ?? 'A diver'
  }));
}

// Profile ----------------------------------------------------------------
export function toProfile(r: Row): DiverProfile {
  return {
    id: String(r.id), displayName: String(r.display_name ?? 'Diver'), initials: String(r.initials ?? 'D'),
    homeArea: String(r.home_area ?? ''), divingSince: str(r.diving_since), homeSiteId: str(r.home_site_id),
    onboarded: Boolean(r.onboarded)
  };
}

export async function fetchProfile(userId: string): Promise<DiverProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  fail(error);
  if (data) return toProfile(data);
  // Trigger missed this user: create the row now
  const { data: created, error: e2 } = await supabase.from('profiles').insert({ id: userId }).select('*').single();
  fail(e2);
  return created ? toProfile(created) : null;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? 'D') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export async function saveProfile(userId: string, p: { displayName: string; homeArea: string; divingSince?: string; homeSiteId?: string }) {
  const { error } = await supabase.from('profiles').update({
    display_name: p.displayName.trim(), initials: initialsOf(p.displayName), home_area: p.homeArea.trim() || null,
    diving_since: p.divingSince?.trim() || null, home_site_id: p.homeSiteId || null, onboarded: true
  }).eq('id', userId);
  fail(error);
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}

// Dives ------------------------------------------------------------------
export async function fetchMyDives(userId: string): Promise<Dive[]> {
  const { data, error } = await supabase.from('dives').select('*').eq('diver_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false });
  fail(error);
  return (data ?? []).map((r) => ({
    id: r.id, siteId: r.site_id, date: r.date, maxDepthFt: r.max_depth_ft, bottomMin: r.bottom_min,
    tempAtDepthF: num(r.temp_at_depth_f), visibilityFt: num(r.visibility_ft), current: r.current ?? undefined,
    exposureSuit: r.exposure_suit ?? undefined, notes: r.notes ?? undefined, shareConditions: r.share_conditions
  }));
}

export async function addDive(userId: string, d: Omit<Dive, 'id'>) {
  const { error } = await supabase.from('dives').insert({
    diver_id: userId, site_id: d.siteId, date: d.date, max_depth_ft: d.maxDepthFt, bottom_min: d.bottomMin,
    temp_at_depth_f: d.tempAtDepthF ?? null, visibility_ft: d.visibilityFt ?? null, current: d.current ?? null,
    exposure_suit: d.exposureSuit ?? null, notes: d.notes ?? null, share_conditions: d.shareConditions
  });
  fail(error);
}

// Certifications ---------------------------------------------------------
function toCert(r: Row): Certification {
  const p = r.profiles as Row | null | undefined;
  return {
    id: String(r.id), agency: String(r.agency), level: String(r.level), numberLast4: str(r.number_last4),
    certifiedOn: str(r.certified_on), status: r.status as Certification['status'],
    cardFrontPath: str(r.card_front_path), cardBackPath: str(r.card_back_path), diverId: str(r.diver_id),
    diverName: p ? str(p.display_name) : undefined
  };
}

export async function fetchMyCerts(userId: string): Promise<Certification[]> {
  const { data, error } = await supabase.from('certifications').select('*').eq('diver_id', userId).order('created_at');
  fail(error);
  return (data ?? []).map(toCert);
}

async function upload(userId: string, file: File, side: 'front' | 'back') {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${userId}/${Date.now()}-${side}.${ext}`;
  const { error } = await supabase.storage.from('cert-cards').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  fail(error);
  return path;
}

export async function submitCert(userId: string, c: { agency: string; level: string; numberLast4?: string; certifiedOn?: string; front: File; back?: File }) {
  const front = await upload(userId, c.front, 'front');
  const back = c.back ? await upload(userId, c.back, 'back') : null;
  const { error } = await supabase.from('certifications').insert({
    diver_id: userId, agency: c.agency, level: c.level, number_last4: c.numberLast4 || null,
    certified_on: c.certifiedOn || null, status: 'in_review', card_front_path: front, card_back_path: back
  });
  fail(error);
}

export async function fetchPendingCerts(): Promise<Certification[]> {
  const { data, error } = await supabase.from('certifications').select('*, profiles(display_name)').eq('status', 'in_review').order('created_at');
  fail(error);
  return (data ?? []).map(toCert);
}

export async function cardUrl(path: string) {
  const { data, error } = await supabase.storage.from('cert-cards').createSignedUrl(path, 600);
  fail(error);
  return data?.signedUrl ?? '';
}

export async function reviewCert(certId: string, reviewerId: string, status: 'verified' | 'unverified') {
  const { error } = await supabase.from('certifications').update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq('id', certId);
  fail(error);
}

// Open dives -------------------------------------------------------------
export async function fetchOpenDives(): Promise<OpenDive[]> {
  const { data, error } = await supabase.from('open_dives_feed').select('*').order('starts_at');
  fail(error);
  return (data ?? []).map((r) => ({
    id: r.id, siteId: r.site_id, hostId: r.host_id, startsAt: r.starts_at, hostName: r.host_name ?? 'Diver',
    hostInitials: r.host_initials ?? 'D', hostCert: r.host_cert ?? 'Certification pending', hostVerified: Boolean(r.host_verified),
    access: r.access, maxDepthFt: r.max_depth_ft, pace: r.pace, spotsOpen: r.spots_open, minCert: r.min_cert,
    note: r.note ?? undefined, status: r.status, acceptedCount: r.accepted_count ?? 0
  }));
}

export async function postOpenDive(userId: string, d: { siteId: string; startsAt: string; access: string; maxDepthFt: number; pace: string; spotsOpen: number; minCert: string; note?: string }) {
  const { error } = await supabase.from('open_dives').insert({
    host_id: userId, site_id: d.siteId, starts_at: d.startsAt, access: d.access, max_depth_ft: d.maxDepthFt,
    pace: d.pace, spots_open: d.spotsOpen, min_cert: d.minCert, note: d.note ?? null
  });
  fail(error);
}

export async function cancelOpenDive(id: string) {
  const { error } = await supabase.from('open_dives').update({ status: 'cancelled' }).eq('id', id);
  fail(error);
}

function toRequest(r: Row): JoinRequest {
  const p = r.profiles as Row | null | undefined;
  return {
    id: String(r.id), openDiveId: String(r.open_dive_id), diverId: String(r.diver_id), status: r.status as JoinRequest['status'],
    createdAt: String(r.created_at), diverName: p ? str(p.display_name) : undefined, diverInitials: p ? str(p.initials) : undefined
  };
}

// My requests plus requests on dives I host (RLS returns exactly those)
export async function fetchRequests(): Promise<JoinRequest[]> {
  const { data, error } = await supabase.from('open_dive_requests').select('*, profiles(display_name, initials)').order('created_at');
  fail(error);
  return (data ?? []).map(toRequest);
}

export async function requestToJoin(userId: string, openDiveId: string, existing?: JoinRequest) {
  if (existing) {
    // A withdrawn request is replaced with a fresh one
    const { error: delErr } = await supabase.from('open_dive_requests').delete().eq('id', existing.id);
    if (delErr) throw new Error('You already asked to join this dive.');
  }
  const { error } = await supabase.from('open_dive_requests').insert({ open_dive_id: openDiveId, diver_id: userId, status: 'pending' });
  fail(error);
}

export async function setRequestStatus(requestId: string, status: 'accepted' | 'declined' | 'withdrawn') {
  const { error } = await supabase.from('open_dive_requests').update({ status }).eq('id', requestId);
  fail(error);
}
