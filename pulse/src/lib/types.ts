export interface Opportunity {
  id: string;
  name: string;
  description: string;
  tags: string[];
  audience: string[];
  actionLabel: string;
  actionUrl: string;
  lastVerified: string;
}

export interface FulbrightEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  startTime?: string;
  timezone?: string;
  location: string;
  description: string;
  url: string;
  source?: string;
  tags: string[];
}

export interface Grantee {
  id: string;
  name: string;
  year: number;
  appliedThrough: string;
  state: string;
  fieldOfStudy: string;
  country: string;
  proposalSummary: string;
  suggestedPathways?: GranteePathway[];
}

export interface GranteePathway {
  id: string;
  name: string;
  actionUrl: string;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface GranteeStats {
  totalGrantees: number;
  yearMin: number;
  yearMax: number;
  topCountries: { name: string; count: number }[];
  topFields: { name: string; count: number }[];
  topInstitutions: { name: string; count: number }[];
  recentYears: { year: number; count: number }[];
}

export interface DigestConfig {
  officialSiteUrl: string;
  fulbrightMembershipUrl: string;
  suggestEmail: string;
  siteName: string;
}

export interface ChapterLeader {
  name: string;
}

export interface ChapterRole {
  title: string;
  members: ChapterLeader[];
}

export interface ChapterLeadership {
  term: string;
  lastUpdated: string;
  sourceUrl: string;
  contactEmail?: string;
  roles: ChapterRole[];
  note?: string;
}
