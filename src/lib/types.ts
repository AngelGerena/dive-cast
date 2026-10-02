// Shapes mirror the Supabase tables one-to-one (camelCase here, snake_case in Postgres).

export type SiteKind = 'spring' | 'reef' | 'wreck' | 'shore' | 'drift';
export type Access = 'shore' | 'boat';
export type CurrentStrength = 'none' | 'light' | 'moderate' | 'strong';

export type WaterSource =
  | { type: 'coops'; station: string; label: string }
  | { type: 'spring'; tempF: number }
  | { type: 'model' };

export interface Site {
  id: string;
  slug: string;
  name: string;
  kind: SiteKind;
  access: Access;
  area: string;
  lat: number;
  lng: number;
  maxDepthFt: number;
  minDepthFt?: number;
  minCert: string;
  summary: string;
  waterSource: WaterSource;
  tideStation?: { id: string; label: string };
  usgsGauge?: { id: string; label: string };
  coverUrl?: string;
  photoCredit?: string;
  isDemo?: boolean;
}

export type BusinessKind = 'shop' | 'resort' | 'charter';

export interface Business {
  id: string;
  name: string;
  kind: BusinessKind;
  area: string;
  lat: number;
  lng: number;
  offer?: string;
  address?: string;
  phone?: string;
  website?: string;
  pinVerified?: boolean;
  logoUrl?: string;
  source?: 'manual' | 'osm';
  osmId?: string;
  claimed: boolean;
  isDemo?: boolean;
}

export interface ConditionReport {
  id: string;
  siteId: string;
  reportedAt: string;
  depthFt?: number;
  tempF?: number;
  visibilityFt?: number;
  current?: CurrentStrength;
  note?: string;
  diverName: string;
  isDemo?: boolean;
}

export interface OpenDive {
  id: string;
  siteId: string;
  hostId?: string;
  startsAt: string;
  hostName: string;
  hostInitials: string;
  hostCert: string;
  hostVerified: boolean;
  access: Access;
  maxDepthFt: number;
  pace: string;
  spotsOpen: number;
  minCert: string;
  note?: string;
  status?: 'open' | 'full' | 'cancelled';
  acceptedCount?: number;
  isDemo?: boolean;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface JoinRequest {
  id: string;
  openDiveId: string;
  diverId: string;
  diverName?: string;
  diverInitials?: string;
  status: RequestStatus;
  createdAt: string;
}

export interface Dive {
  id: string;
  siteId: string;
  date: string;
  maxDepthFt: number;
  bottomMin: number;
  tempAtDepthF?: number;
  visibilityFt?: number;
  current?: CurrentStrength;
  exposureSuit?: string;
  notes?: string;
  shareConditions: boolean;
  isDemo?: boolean;
}

export type CertStatus = 'verified' | 'in_review' | 'unverified';

export interface Certification {
  id: string;
  agency: string;
  level: string;
  numberLast4?: string;
  certifiedOn?: string;
  status: CertStatus;
  cardFrontPath?: string;
  cardBackPath?: string;
  diverId?: string;
  diverName?: string;
}

export interface DiverProfile {
  id: string;
  displayName: string;
  initials: string;
  homeArea: string;
  divingSince?: string;
  homeSiteId?: string;
  onboarded: boolean;
}

export interface EmergencyCard {
  fullName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  danMember: string;
  insuranceProvider: string;
  policyNumber: string;
  medicalNotes: string;
  updatedAt?: string;
}
