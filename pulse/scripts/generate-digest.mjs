#!/usr/bin/env node
/**
 * Generate digest MDX + LinkedIn drafts from verified JSON/CSV aggregates.
 * Requires OPENAI_API_KEY. Use --dry-run to print without writing.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const digestSchema = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  bodyMarkdown: z.string(),
  linkedinPosts: z.array(z.string()).min(1).max(4),
});

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf-8'));
}

function pickSpotlights(grantees, config) {
  if (config.spotlightGranteeIds?.length) {
    const ids = new Set(config.spotlightGranteeIds);
    return grantees.filter((g) => ids.has(g.id)).slice(0, config.maxSpotlights);
  }
  const generic = /^english teaching assistantship$/i;
  return grantees
    .filter(
      (g) =>
        g.year >= config.spotlightMinYear &&
        g.proposalSummary &&
        g.proposalSummary.length > 40 &&
        !generic.test(g.proposalSummary.trim()),
    )
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))
    .slice(0, config.maxSpotlights);
}

function upcomingEvents(events) {
  const today = new Date().toISOString().slice(0, 10);
  return events
    .filter((e) => e.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);
}

async function main() {
  if (!process.env.OPENAI_API_KEY && !dryRun) {
    console.error('Set OPENAI_API_KEY or pass --dry-run');
    process.exit(1);
  }

  const config = loadJson('data/digest-config.json');
  const opportunities = loadJson('data/opportunities.json');
  const events = loadJson('data/events.json');
  const statsPath = join(root, 'public/data/stats.json');
  if (!existsSync(statsPath)) {
    console.error('Run npm run data:grantees first');
    process.exit(1);
  }
  const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
  const grantees = JSON.parse(
    readFileSync(join(root, 'public/data/grantees.json'), 'utf-8'),
  );

  const spotlights = pickSpotlights(grantees, config);
  const eventsUpcoming = upcomingEvents(events);
  const taggedOpps = opportunities.filter((o) =>
    o.tags.some((t) => config.includeOpportunityTags.includes(t)),
  );

  const slug = new Date().toISOString().slice(0, 10);
  const payload = {
    stats,
    spotlights,
    eventsUpcoming,
    opportunities: taggedOpps.slice(0, 8),
    officialSiteUrl: config.officialSiteUrl,
  };

  if (dryRun) {
    console.log(JSON.stringify({ slug, payload }, null, 2));
    return;
  }

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: digestSchema,
    system: `You write for the Rhode Island Fulbright Association public digest (${config.siteName}).
Use ONLY facts from the user JSON. Do not invent events, contacts, or grantee details.
Tone: warm, professional, concise. End bodyMarkdown with a short disclaimer that grantee notes come from public grant records.`,
    prompt: `Create digest issue for ${slug}.\n\nData:\n${JSON.stringify(payload, null, 2)}`,
  });

  const frontmatter = `---
title: "${object.title.replace(/"/g, '\\"')}"
description: "${object.excerpt.replace(/"/g, '\\"')}"
pubDate: ${slug}
draft: false
---

`;

  const digestDir = join(root, 'src/content/digest');
  const socialDir = join(root, 'content/social');
  mkdirSync(digestDir, { recursive: true });
  mkdirSync(socialDir, { recursive: true });

  writeFileSync(
    join(digestDir, `${object.slug || slug}.md`),
    frontmatter + object.bodyMarkdown + '\n',
  );
  writeFileSync(
    join(socialDir, `${object.slug || slug}-linkedin.txt`),
    object.linkedinPosts.join('\n\n---\n\n') + '\n',
  );

  console.log(`Wrote digest content/digest/${object.slug || slug}.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
