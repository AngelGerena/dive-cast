import { useQuery } from './query';
import { fetchBusinesses, fetchMyCerts, fetchMyDives, fetchOpenDives, fetchReports, fetchRequests, fetchSites } from './api';
import { useAuth } from './auth';
import { DEFAULT_HOME_SLUG } from './config';

export function useSites() {
  const q = useQuery('sites', fetchSites);
  const sites = q.data?.sites ?? [];
  return {
    sites,
    offline: q.data?.offline ?? false,
    loading: q.loading,
    byId: (id?: string) => sites.find((s) => s.id === id),
    bySlug: (slug?: string) => sites.find((s) => s.slug === slug),
    home: (homeSiteId?: string) => sites.find((s) => s.id === homeSiteId) ?? sites.find((s) => s.slug === DEFAULT_HOME_SLUG) ?? sites[0]
  };
}

export const useBusinesses = () => useQuery('businesses', fetchBusinesses);
export const useReports = (siteId?: string) => useQuery(siteId ? `reports:${siteId}` : 'reports:all', () => fetchReports(siteId));

export function useMyDives() {
  const { userId } = useAuth();
  return useQuery(userId ? `dives:${userId}` : null, () => fetchMyDives(userId!));
}
export function useMyCerts() {
  const { userId } = useAuth();
  return useQuery(userId ? `certs:${userId}` : null, () => fetchMyCerts(userId!));
}
export function useOpenDives() {
  const { userId } = useAuth();
  return useQuery(userId ? 'opendives' : null, fetchOpenDives);
}
export function useRequests() {
  const { userId } = useAuth();
  return useQuery(userId ? `requests:${userId}` : null, fetchRequests);
}
