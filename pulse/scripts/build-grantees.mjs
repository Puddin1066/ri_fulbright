#!/usr/bin/env node
/**
 * Build grantee datasets from data/grantees.csv
 *
 * Outputs:
 * - public/data/grantees.raw.json       (validated + normalized + provenance)
 * - public/data/grantees.json           (public view model)
 * - public/data/stats.json              (aggregates)
 * - public/data/quality-report.json     (validation + ingestion diagnostics)
 *
 * Respects data/grantees-opt-out.json (array of grantee ids).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'data');
const outDir = join(root, 'public', 'data');
const CURRENT_YEAR = new Date().getFullYear();

const rowSchema = z.object({
  Grantee: z.string().min(1),
  Year: z.string().min(1),
  'Applied Through': z.string().optional().default(''),
  State: z.string().optional().default(''),
  'Field of Study': z.string().optional().default(''),
  Country: z.string().optional().default(''),
  'Proposal Summary': z.string().optional().default(''),
});

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCountry(value) {
  const normalized = normalizeWhitespace(value);
  const aliases = {
    "Cote d'Ivoire": "Cote d'Ivoire",
  };
  return aliases[normalized] ?? normalized;
}

function normalizeState(value) {
  const normalized = normalizeWhitespace(value);
  return normalized || 'Rhode Island';
}

function slugify(name, year) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${year}`;
}

function topN(counter, n = 10) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

const csvPath = join(dataDir, 'grantees.csv');
const optOutPath = join(dataDir, 'grantees-opt-out.json');
const csv = readFileSync(csvPath, 'utf-8');
const optOut = new Set(JSON.parse(readFileSync(optOutPath, 'utf-8')));

function countQuotes(value) {
  return (value.match(/"/g) || []).length;
}

function sanitizeCsvLine(line) {
  if (countQuotes(line) % 2 === 0) return { line, repaired: false };
  let candidate = line;
  candidate = candidate.replace(/,""/, ',"');
  if (countQuotes(candidate) % 2 !== 0) {
    candidate = candidate.replace(/""(?=[^"]*$)/, '"');
  }
  return { line: candidate, repaired: countQuotes(candidate) % 2 === 0 };
}

const knownFixes = [
  {
    from: '""We Are All Activists": Writing and Activism among Black Trinidadian Women"',
    to: '"We Are All Activists: Writing and Activism among Black Trinidadian Women"',
  },
];

let normalizedCsv = csv;
let knownFixCount = 0;
for (const fix of knownFixes) {
  const before = normalizedCsv;
  normalizedCsv = normalizedCsv.split(fix.from).join(fix.to);
  if (before !== normalizedCsv) knownFixCount += 1;
}

const lines = normalizedCsv.split(/\r?\n/);
let repairedLineCount = 0;
const sanitizedLines = lines.map((line, index) => {
  // Skip header line.
  if (index === 0 || !line) return line;
  const result = sanitizeCsvLine(line);
  if (result.repaired) repairedLineCount += 1;
  return result.line;
});
const sanitizedCsv = sanitizedLines.join('\n');

function parseCsvLine(line, lineNumber) {
  const pattern =
    /^"(?<Grantee>(?:[^"]|"")*)",(?<Year>[^,]*),"(?<AppliedThrough>(?:[^"]|"")*)","(?<State>(?:[^"]|"")*)","(?<FieldOfStudy>(?:[^"]|"")*)","(?<Country>(?:[^"]|"")*)","(?<ProposalSummary>.*)"$/;
  const match = line.match(pattern);
  if (!match?.groups) {
    return {
      error: {
        line: lineNumber,
        reason: 'Row does not match expected 7-column CSV structure',
        code: 'ROW_PATTERN_MISMATCH',
      },
    };
  }

  const unescape = (value) => value.replace(/""/g, '"');
  return {
    record: {
      Grantee: unescape(match.groups.Grantee),
      Year: match.groups.Year,
      'Applied Through': unescape(match.groups.AppliedThrough),
      State: unescape(match.groups.State),
      'Field of Study': unescape(match.groups.FieldOfStudy),
      Country: unescape(match.groups.Country),
      'Proposal Summary': unescape(match.groups.ProposalSummary),
    },
    info: { lines: lineNumber },
  };
}

const parseErrors = [];
const parsedRows = [];
const dataLines = sanitizedCsv.split(/\r?\n/);
for (let index = 1; index < dataLines.length; index += 1) {
  const line = dataLines[index];
  if (!line.trim()) continue;
  const parsedLine = parseCsvLine(line, index + 1);
  if (parsedLine.error) {
    parseErrors.push(parsedLine.error);
    continue;
  }
  parsedRows.push(parsedLine);
}

const rawRecords = [];
const publicRecords = [];
const rejectedRows = [];
const duplicateIds = [];
const countries = {};
const fields = {};
const institutions = {};
const byYear = {};
const seenIds = new Set();

let optOutCount = 0;
let collisionCount = 0;

for (const { record, info } of parsedRows) {
  const safe = rowSchema.safeParse(record);
  if (!safe.success) {
    rejectedRows.push({
      line: info?.lines ?? null,
      reason: safe.error.issues.map((issue) => issue.message).join('; '),
      row: record,
    });
    continue;
  }

  const row = safe.data;
  const year = Number.parseInt(row.Year, 10);
  if (!Number.isFinite(year) || year < 1940 || year > CURRENT_YEAR + 1) {
    rejectedRows.push({
      line: info?.lines ?? null,
      reason: `Invalid year '${row.Year}'`,
      row,
    });
    continue;
  }

  const normalized = {
    name: normalizeWhitespace(row.Grantee),
    year,
    appliedThrough: normalizeWhitespace(row['Applied Through']),
    state: normalizeState(row.State),
    fieldOfStudy: normalizeWhitespace(row['Field of Study']),
    country: normalizeCountry(row.Country),
    proposalSummary: normalizeWhitespace(row['Proposal Summary']),
    sourceRow: info?.lines ?? null,
  };

  const baseId = slugify(normalized.name, normalized.year);
  if (optOut.has(baseId)) {
    optOutCount += 1;
    continue;
  }

  let id = baseId;
  let suffix = 2;
  while (seenIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  if (id !== baseId) {
    collisionCount += 1;
    duplicateIds.push({ baseId, resolvedId: id, line: info?.lines ?? null });
  }
  seenIds.add(id);

  const rawEntry = { id, ...normalized };
  const publicEntry = {
    id,
    name: normalized.name,
    year: normalized.year,
    appliedThrough: normalized.appliedThrough,
    state: normalized.state,
    fieldOfStudy: normalized.fieldOfStudy,
    country: normalized.country,
    proposalSummary: normalized.proposalSummary,
  };

  rawRecords.push(rawEntry);
  publicRecords.push(publicEntry);

  countries[publicEntry.country] = (countries[publicEntry.country] || 0) + 1;
  fields[publicEntry.fieldOfStudy] = (fields[publicEntry.fieldOfStudy] || 0) + 1;
  institutions[publicEntry.appliedThrough] = (institutions[publicEntry.appliedThrough] || 0) + 1;
  byYear[publicEntry.year] = (byYear[publicEntry.year] || 0) + 1;
}

const years = publicRecords.map((g) => g.year);
const stats = {
  totalGrantees: publicRecords.length,
  yearMin: years.length ? Math.min(...years) : null,
  yearMax: years.length ? Math.max(...years) : null,
  topCountries: topN(countries),
  topFields: topN(fields),
  topInstitutions: topN(institutions),
  recentYears: Object.entries(byYear)
    .map(([year, count]) => ({ year: Number.parseInt(year, 10), count }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 8),
  totals: {
    parsedRows: parsedRows.length,
    parserErrorRows: parseErrors.length,
    validRows: publicRecords.length,
    rejectedRows: rejectedRows.length,
    optOutRows: optOutCount,
    idCollisionsResolved: collisionCount,
  },
};

const qualityReport = {
  generatedAt: new Date().toISOString(),
  sourceFile: 'data/grantees.csv',
  knownFixCount,
  repairedLineCount,
  totals: stats.totals,
  parserErrors: parseErrors.slice(0, 50),
  rejectedRows: rejectedRows.slice(0, 50),
  duplicateIds: duplicateIds.slice(0, 50),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'grantees.raw.json'), JSON.stringify(rawRecords, null, 2));
writeFileSync(join(outDir, 'grantees.json'), JSON.stringify(publicRecords, null, 2));
writeFileSync(join(outDir, 'stats.json'), JSON.stringify(stats, null, 2));
writeFileSync(join(outDir, 'quality-report.json'), JSON.stringify(qualityReport, null, 2));

console.log(
  `Wrote ${publicRecords.length} grantees (${rejectedRows.length} rejected, ${collisionCount} id collisions)`,
);
