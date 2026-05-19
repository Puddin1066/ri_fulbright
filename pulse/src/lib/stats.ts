import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Grantee, GranteeStats } from './types';

const publicData = join(process.cwd(), 'public/data');

export function loadStats(): GranteeStats | null {
  const path = join(publicData, 'stats.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as GranteeStats;
}

export function loadGrantees(): Grantee[] {
  const path = join(publicData, 'grantees.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8')) as Grantee[];
}
