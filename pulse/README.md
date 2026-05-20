# RI Fulbright Pulse

Public companion to the [Rhode Island Fulbright chapter](https://rhodeisland.fulbrightchapters.org/): **Opportunity Atlas**, **Grantee Explorer**, **Events**, and **Digest** focused on practical outcomes (mentorship, networking, and collaboration).

See the product spec: [../RI Fulbright Opportunity Atlas – Product.md](../RI%20Fulbright%20Opportunity%20Atlas%20%E2%80%93%20Product.md)

## Quick start

```bash
cd pulse
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Data

| File | Purpose |
|------|---------|
| `data/grantees.csv` | Source grantee roster (584 RI rows) |
| `data/opportunities.json` | Curated Atlas links (verify URLs before deploy) |
| `data/events.json` | Dated events with real URLs |
| `data/digest-config.json` | Site URLs, spotlight rules, suggest email |
| `data/grantees-opt-out.json` | Grantee `id`s to exclude from build |

## Scripts

```bash
npm run data:grantees      # → grantees.raw.json, grantees.json, stats.json, quality-report.json
npm run generate:digest    # needs OPENAI_API_KEY → src/content/digest/*.md
npm run generate:digest:dry
npm run build              # grantees + static site
```

## Ingestion quality checks

- `public/data/quality-report.json` includes parser/validation diagnostics.
- The ingestion step normalizes malformed quoted fields from known source anomalies and records this in `knownFixCount`.
- Public output is deterministic and safe (`public/data/grantees.json`), while provenance rows remain in `public/data/grantees.raw.json`.

## Deploy (Vercel)

1. Import repo; set **Root Directory** to `pulse`.
2. Framework: Astro (auto-detected).
3. Optional: add `OPENAI_API_KEY` only if using Vercel Cron for digest generation later.
4. Update `data/digest-config.json` → `suggestEmail` with chapter contact.

## Tracking and SEO

- Website tracking is enabled via `@vercel/analytics` in `src/layouts/BaseLayout.astro`.
- SEO metadata (canonical, Open Graph, Twitter, JSON-LD) is centralized in `BaseLayout`.
- Sitemap generation is enabled through `@astrojs/sitemap` in `astro.config.mjs`.
- Robots file is served from `src/pages/robots.txt.ts`.

## Governance

- Do not publish emails or mentor availability from CSV.
- Review AI-generated digest before sharing on LinkedIn.
- Refresh `lastVerified` on opportunities monthly.
