import opportunities from '../../data/opportunities.json';
import events from '../../data/events.json';
import chapterLeadership from '../../data/chapter-leadership.json';
import digestConfig from '../../data/digest-config.json';
import type { ChapterLeadership, DigestConfig, FulbrightEvent, Opportunity } from './types';

export const siteConfig = digestConfig as DigestConfig;
export const allOpportunities = opportunities as Opportunity[];
export const allEvents = events as FulbrightEvent[];
export const leadership = chapterLeadership as ChapterLeadership;

export const ALL_TAGS = [
  'Applicant Mentorship',
  'Alumni Networking',
  'Universities',
  'Cultural Institutions',
  'International Visitors',
  'Public Events',
  'Community Partners',
  'AI & Digital Tools',
  'Rhode Island Innovation',
] as const;

export function filterOpportunities(query: string, tag: string | null): Opportunity[] {
  const q = query.trim().toLowerCase();
  return allOpportunities.filter((o) => {
    if (tag && !o.tags.includes(tag)) return false;
    if (!q) return true;
    const hay = [o.name, o.description, ...o.tags, ...o.audience].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export function sortEventsUpcoming(items: FulbrightEvent[]): FulbrightEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return [...items].sort((a, b) => {
    const aPast = a.startDate < today;
    const bPast = b.startDate < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return a.startDate.localeCompare(b.startDate);
  });
}
