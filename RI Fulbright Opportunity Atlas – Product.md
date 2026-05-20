# RI Fulbright Pulse — Product Requirements Document (PRD)

> **Living document.** Last updated to reflect product discovery, architecture decisions, and implementation in `/pulse`. Public brand: **RI Fulbright Pulse** (Opportunity Atlas + Grantee Explorer + Digest).

---

## 1. Problem & opportunity

Despite a robust Fulbright alumni presence in Rhode Island, there is no concise, **public**, frequently updated digital resource that maps opportunities, institutions, programming, and statewide impact.

| Gap | Detail |
|-----|--------|
| **Official chapter site** | [rhodeisland.fulbrightchapters.org](https://rhodeisland.fulbrightchapters.org/) is the membership hub (join, login, store) but news/content is **stale** (e.g. posts from 2019). |
| **Private directory** | Chapter membership list has no public resource/event detail. |
| **Discovery** | Applicants and alumni ask: *Where is a mentor? Which RI campuses support my field? What events are near me?* |

**Pulse** is the **active public companion** to the official WordPress site—not a replacement for membership, login, or store.

---

## 2. Product vision: RI Fulbright Pulse

### Value proposition (one line)

*One trusted place to turn Fulbright participation in Rhode Island into practical outcomes: mentorship, networking introductions, collaboration opportunities, and visible impact.*

### Strategic objective (leadership framing)

Build an **AI-assisted, human-led public infrastructure** that helps the chapter deliver measurable value between events: stronger applicant support, alumni career/network growth, and partner collaboration.

### Dual discovery (novel vs generic directory templates)

| Surface | Question | Data |
|---------|----------|------|
| **Opportunity Atlas** (`/atlas`) | What can I do **now**? | Curated `opportunities.json` (verified public URLs) |
| **Grantee Explorer** (`/grantees`) | Who has RI Fulbright been? | `grantees.csv` → build → `grantees.json` + `stats.json` |
| **Events** (`/events`) | What’s coming up? | `events.json` (dated, verified) |
| **Digest** (`/digest`) | What’s new this month? | AI-assisted MDX from data (optional, committed to git) |

### Relationship to official site

```text
rhodeisland.fulbrightchapters.org  →  membership, calendar links, contact
Pulse (Vercel)                     →  atlas, grantees, events, digest, campaign/LinkedIn
```

Footer on Pulse always links **Join / Renew** and **Official chapter** to fulbrightchapters.org.

---

## 3. Who

### Primary personas

- **RI Fulbright alumni** — stay engaged, mentor, collaborate.
- **Prospective applicants** — mentorship, campuses, timelines, inspiration from grantee stories.

### Secondary personas

- **Chapter leaders & organizers** — venues, partners, transparency.
- **Community partners** — Brown, URI, RISD, cultural orgs, visiting scholar hosts.
- **General public & policymakers** — impact narrative, public events.

---

## 4. Goals & KPIs

| Goal | Target |
|------|--------|
| Map & publicize opportunities | ≥40 verified resources by July 2026 |
| Engagement | ≥200 unique visitors in first 3 months |
| Community input | ≥20 “suggest an addition” emails acted on |
| Mentorship / collaboration | ≥10 intro requests, ≥5 event proposals (via mailto, not in-app auth) |
| Career/networking utility | ≥25 documented actions (mentor calls, intros, partner conversations) in first 6 months |
| Digital leadership | Working Vercel deploy; optional AI digest for campaign |

**Metrics:** resource count, `lastVerified` freshness, Vercel/Plausible analytics, mailto volume, LinkedIn engagement on `/digest` links, and monthly action counts (introductions, mentorship calls, collaboration asks).

---

## 5. Architecture (implemented)

### Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Site** | [Astro](https://astro.build) 5 + Tailwind (`/pulse`) | Static, fast, Vercel-friendly; directory UX without heavy CMS |
| **Hosting** | **Vercel** | PRD deploy target; preview URLs for campaign |
| **Data** | Git-tracked JSON/CSV | No DB, no auth; PRD scope |
| **Grantees** | `data/grantees.csv` (584 RI rows, 1949–2025) | Public grant metadata; no emails in source |
| **AI (optional)** | Vercel AI SDK + OpenAI (`scripts/generate-digest.mjs`) | Build-time/CI only; **not** per-visitor API calls |

> **Note:** PRD originally suggested Next.js or Minted Directory Astro. Implementation uses a **custom Astro app** with the same data model and flows—easier to maintain alongside grantees + digest pipelines.

### Repo layout

```text
RI_fulbright/
├── RI Fulbright Opportunity Atlas – Product.md   # this PRD
└── pulse/                                        # deploy root
    ├── data/
    │   ├── grantees.csv
    │   ├── opportunities.json
    │   ├── events.json
    │   └── digest-config.json
    ├── scripts/
    │   ├── build-grantees.mjs
    │   └── generate-digest.mjs
    ├── public/data/          # generated grantees.json, stats.json
    ├── content/digest/       # generated MDX issues
    ├── content/social/       # LinkedIn draft .txt
    └── src/pages/            # index, atlas, grantees, events, digest
```

### Build & deploy workflow

```bash
cd pulse
npm run data:grantees          # CSV → public/data/*.json
npm run generate:digest        # optional; needs OPENAI_API_KEY
npm run build                  # data + astro build
# git push → Vercel
```

---

## 6. Features

### In scope (v1)

- Static opportunities with **search + tag filters**
- Grantee explorer (year, field, country, institution filters)
- Home **impact stats** from aggregated CSV
- Events list (upcoming first)
- Digest archive (MDX); first issue can be hand-written or AI-generated
- Mailto **Suggest an addition** + link to official chapter
- Mobile-first, semantic HTML, accessible focus states

### Out of scope (v1)

- Private membership directory replication
- User accounts / login
- Runtime database or CMS
- Per-grantee contact / mailto from CSV
- Live OpenAI on public pages (keys stay in scripts/CI only)

### AI policy (v1.1)

- **OK:** Summarize verified JSON/CSV for digest and LinkedIn drafts; classify tags from page text after human review.
- **Not OK:** Invent events, contacts, or mentors; scrape membership-only pages; bulk-generate 584 bios per run.

---

## 7. Data schemas

### `opportunities.json`

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "tags": ["Applicant Mentorship | Universities | ..."],
  "audience": ["Applicants", "Alumni", ...],
  "actionLabel": "string",
  "actionUrl": "https://...",
  "lastVerified": "YYYY-MM-DD"
}
```

**Seed policy:** Discover from real Fulbright / NE chapter / RI campus URLs → verify → encode. **21 seeds** shipped from Brown, URI, RISD, PC, Salve, RIC, IIE, Fulbright Association, NE chapters, International House RI. Expand to 40+ with RI innovation and cultural orgs after verification.

### `events.json`

Dated items only with real `url` (e.g. URI Fulbright 101). Refresh monthly from chapter calendar, fulbright.org/events, campus calendars.

### `grantees.csv` → `grantees.json` + `stats.json`

Source columns: `Grantee`, `Year`, `Applied Through`, `State`, `Field of Study`, `Country`, `Proposal Summary`.

Spotlight pool for digest: year ≥ 2020, non-empty `proposalSummary`, exclude generic-only ETA blurbs.

### `digest-config.json`

Official URLs, `suggestEmail`, spotlight rules, tags to feature in digest.

---

## 8. Design flows

```text
Home (stats + latest digest + upcoming events)
  → /atlas → filter/search → external action URL
  → /grantees → filter → card (no direct contact)
  → /events → event detail link
  → /digest → issue → share on LinkedIn
Footer → mailto suggest | official chapter join
```

---

## 9. Platform & template decision (discussion summary)

| Option considered | Verdict |
|-------------------|---------|
| **Minted Directory Astro** | Strong directory + CSV; adopted **patterns**, custom Astro for grantees/digest |
| **Next.js directory boilerplate** | Good if team is React-only; more work for CSV grantees pipeline |
| **Nillion / Taxonomy / Supabase starters** | Rejected (wrong domain or auth/DB scope) |
| **AI newsletter SaaS repos** | Rejected (Clerk/Stripe/email DB overkill) |

**Campaign role:** Pulse is a **pseudo campaign driver** and practical networking surface—fresh digest + grantee impact stats + action-oriented pathways—while official site handles membership.

---

## 10. Governance & maintenance

| Task | Owner | Frequency |
|------|-------|-----------|
| Verify `actionUrl` links | Chapter volunteer | Before deploy |
| Update `events.json` | Chapter volunteer | Monthly |
| Refresh `grantees.csv` | Data steward | Annual (post-award season) |
| Grantee opt-out list | Chapter leadership | As requested (`data/grantees-opt-out.json`) |
| Review AI digest before publish | Communications lead | Each issue |
| Fulbright branding | Chapter leadership | Before public campaign push |

---

## 11. Environment variables

| Variable | Used by | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | `generate-digest.mjs` only | Optional (digest generation) |

Do **not** expose OpenAI key to client bundles.

---

## 12. Timeline (revised)

| Phase | Deliverable |
|-------|-------------|
| **Day 1** | PRD updated; `/pulse` scaffold; seed data; grantees build script |
| **Day 2** | Pages, styling, README, Vercel deploy |
| **Week 2** | First digest (manual or AI); LinkedIn post; 30+ opportunities |
| **July 2026** | 40+ resources; KPI review |

---

## 13. Open questions

- Final chapter `suggestEmail` for mailto?
- Formal sign-off on publishing grantee names (public record vs opt-out)?
- Add Plausible/Vercel Analytics ID?
- Chapter adoption as official “public layer” linked from WordPress?

---

## 14. Next steps

1. Set `digest-config.json` → `suggestEmail` from [chapter Contact](https://rhodeisland.fulbrightchapters.org/).
2. `cd pulse && npm install && npm run build`
3. Deploy `/pulse` root to Vercel; add custom domain if available.
4. Link Pulse from LinkedIn; ask chapter to link from official site footer.
5. Run `npm run generate:digest` when `OPENAI_API_KEY` is set; review MDX before commit.

**Implementation:** see [`pulse/README.md`](pulse/README.md).
