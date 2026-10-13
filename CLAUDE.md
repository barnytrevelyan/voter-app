# What's It To Me? (whatsittome.org): notes for Claude Code

Read `docs/PROJECT.md` first; it is canonical (decisions log, who decides what). Romily Johnson is Founder and
Product Lead and owns product decisions; Barny Trevelyan-Johnson is Technical Lead.

## Rules that never bend
- Never rank, score, match or recommend. Every candidate gets the same template, in ballot-paper order.
- Every claim is a verbatim quotation with a named, dated, linked source. Nothing is invented or paraphrased as fact.
- The ledger (`claims`, `change_log`) is append-only: correct by inserting a superseding row, never UPDATE or DELETE.
- Nothing typed in by hand: data comes from jobs. A job publishes only what it can prove (an official dataset, or a
  sentence found word for word in the document it cites). Otherwise the site says plainly that it couldn't read it.
- Never translate candidate words. Never email or invite candidates.
- Keep search indexing off (`ALLOW_INDEXING`) until Barny sets the launch date.
- Triple-check every number and assertion against its source before stating it.

## Secrets
Keys live only in GitHub Actions secrets and Netlify (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, and later
ANTHROPIC_API_KEY). Never ask for them, print them or commit them. Scripts in `scripts/auto/` run as a dry run
without the service key (see `scripts/auto/common.py`): use that for local testing.

## How things are built
- Next.js 16 App Router on Netlify; Supabase (project urufvcutpksjppbjxouc) with public-read RLS.
- Scheduled data jobs: Python in `scripts/auto/` (+ `scripts/fetch_council_meetings.py`), run by
  `.github/workflows/*.yml`. Each records a row in `job_runs`; add new jobs to `app/status/page.tsx` (JOBS) and
  `scripts/auto/weekly_review.py` (EXPECTED).
- Schema changes: a file in `scripts/sql/migrations/` named `YYYY-MM-DD-<name>.sql`, applied by Barny (or via the
  Supabase MCP if connected). RLS on every table.
- Before committing: `npx tsc --noEmit` and `npx next build` must pass. Commit with clear messages; push to a
  branch and open a PR unless told to push to main. Deploys to Netlify cost shared credits: batch them.

## Phone app (mobile/)
- Expo app for iOS and Android, ID org.whatsittome.app. It shows website content; it never holds content or rules.
- Contract: lib/appApi.ts. Within /api/app/v1 only add optional fields; never rename, remove or change meaning.
  A breaking change needs app/api/app/v2/ with v1 kept running. Installed apps stay on old versions for months.
- Any change to lib/, app/api/app/ or mobile/ must pass: npx tsc --noEmit, npm test, and in mobile/
  npm ci && npx tsc --noEmit && CI=1 npx expo lint. CI runs the same (.github/workflows/app-contract.yml).
- After an app release, raise LATEST_APP_VERSION in lib/appApi.ts; raise MIN_APP_VERSION only when v1 can no
  longer serve an old app.

## Current work
Read `docs/STATUS.md` first: what is live, what is built but not merged, what is outstanding and what is blocked.
The automation plan and its briefs are in `docs/automation/`; the catalogue of usable public data, with a suggested
build order, is `docs/research/11-data-sources.md`. Don't start a new item from it until Barny says which.
