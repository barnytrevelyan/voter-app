# What's It To Me? — project handbook

**Single place for everything about the project.** Code, research, Romily's decisions and the build log all live in this repository (`highlyvisual/voter-app`). If it isn't here, it isn't canonical.

Last consolidated: 28 September 2026. **Where things stand right now (live, built but not merged, outstanding, blocked): [docs/STATUS.md](STATUS.md).**

## What the site is

A non-partisan UK voter-information site. Someone enters a postcode and a few household facts (bands only, nothing stored server-side); the site shows every candidate on their ballot, the same page for each, in ballot-paper order, with every published position quoted from a named, dated, linked source, and what each candidate winning would change for a household like theirs. It never ranks, scores, matches or recommends.

- **Live:** https://whatsittome.org (Netlify site `voter-app-uk`; hustings.org and thisshitmatters.org redirect here)
- **Founder and Product Lead:** Romily Johnson — the project owner; direction questions go to her
- **Technical Lead:** Barny Trevelyan-Johnson — builds, deploys, holds all secrets
- **Contact:** hello@whatsittome.org (forwarding)
- **Licence:** AGPL-3.0
- **First live test:** Holborn and St Pancras by-election, 8 October 2026; then the May 2027 local elections
- **Launch plan (Romily, 24 Sep):** send the site round for feedback after the weekend of 26–27 Sep, then start a social media account after the following weekend

## Where things are

| What | Where |
|---|---|
| Current status: live, awaiting merge, outstanding, blocked | [docs/STATUS.md](STATUS.md) |
| Automation plan and build briefs, one per phase, with each build's results | [docs/automation/](automation/) — [README.md](automation/README.md) |
| Every useful public data source (about 250 checked, 27 Sep) | [docs/research/11-data-sources.md](research/11-data-sources.md) |
| Rules the code enforces, stack, how to run, add a ballot, ingest | [README.md](../README.md) |
| Build log, newest at the bottom | [CHANGELOG.md](../CHANGELOG.md) |
| Technical bible: internal edition and funders-and-partners edition (branded PDFs, with HTML source) | [docs/bible/](bible/) |
| Platform review, September 2026: strengths, weaknesses, sixty tools worldwide, the evidence and the law, and a 117-item improvements list | [docs/bible/platform-review-2026-09.pdf](bible/platform-review-2026-09.pdf); the eight underlying reports in [docs/research/deep-dive-2026-09/](research/deep-dive-2026-09/) |
| How every dataset stays current: schedules, jobs, what still needs a person, options considered | [docs/data-freshness.md](data-freshness.md) |
| Things we will refuse to build | [docs/never-build.md](never-build.md) |
| How to write a claim | [docs/claims-style-guide.md](claims-style-guide.md) |
| Parity audit, partners, Welsh handover | [docs/parity-audit.md](parity-audit.md), [docs/partners.md](partners.md), [docs/welsh.md](welsh.md) |
| Research briefs and the ten papers | [docs/research/](research/) — start at [INDEX.md](research/INDEX.md) |
| Romily's question rounds and her answers | [docs/romily/](romily/) — [README.md](romily/README.md); every answer with its status: [feedback-log.md](romily/feedback-log.md) |
| Source of the questions site (romily-app-questions.netlify.app) | [docs/romily/questions-site/](romily/questions-site/) |
| External datasets loaded once (sources, licences, refresh cadence) | [scripts/loaders/README.md](../scripts/loaders/README.md) |
| SQL for those tables | [scripts/sql/migrations/](../scripts/sql/migrations/) |
| Ledger snapshots before each polling day | [snapshots/](../snapshots/) |
| Ballot accuracy reports | [reports/ballot-checks/](../reports/ballot-checks/) |

The shared folder `/Volumes/BTJ_ONE/Projects/UKPolitcs` on Barny's Mac Studio is a working inbox for briefs and research; anything worth keeping is copied here. The Claude project "UK Politics App" holds only a pointer to this file.

## Infrastructure (no secrets here)

- **Hosting:** Netlify site `voter-app-uk` (https://voter-app-uk.netlify.app), Next.js App Router. Chosen so the build session can deploy directly. The site shares a Netlify credit pot with other sites; see research paper 07 for the cost problem and the options.
- **Domains and DNS:** whatsittome.org registered via Vercel, DNS at Vercel (A records, www CNAME, MX, SPF). hustings.org and thisshitmatters.org 301 to it with the path preserved.
- **Database:** Supabase project `voter-app` (ref `urufvcutpksjppbjxouc`, London / eu-west-2, free tier), Postgres + PostGIS. Append-only claims ledger enforced by trigger.
- **Repo:** https://github.com/highlyvisual/voter-app — private for now, AGPL. Working copy on the Mac Studio at `~/code/voter-app`; the clone's remote carries a fine-grained token so the build session can commit and push directly.
- **Nightly job:** `.github/workflows/ingest.yml` (05:17 UTC) — Democracy Club ballots and candidates, then the leaflet scan. Needs the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` repository secrets; `DEMOCRACY_CLUB_TOKEN` (candidates-API token) is optional and not yet issued.
- **Democracy Club developers API:** account "What's It To Me?" on developers.democracyclub.org.uk (created 24 Sep from Romily's login link), hobbyist plan: one key, 1,000 requests a day, `?auth_token=`. Held in Netlify as `DEMOCRACY_CLUB_DEVELOPERS_KEY`; used for postcode lookup. It is not accepted by the candidates API (tested). Peter Keeling (Democracy Club) offered a call: Monday 28 Sep 3–5pm UK, or 7–9 Oct; he also pointed at localintelligencehub.com (Climate Coalition / mySociety / Green Alliance) and dashboard.constituencies.org.uk as data sources.
- **Secrets held only by Barny:** `SUPABASE_SERVICE_ROLE_KEY`, `REVIEWERS`, `DEMOCRACY_CLUB_DEVELOPERS_KEY`, the GitHub token, Netlify and Vercel accounts.
- **Money layer:** precomputed PolicyEngine UK grid (`scripts/compute_grid.py`), assumptions listed on every calculation. The live site's `api.policyengine.org` is PolicyEngine's undocumented web backend on an older model; research paper 11 recommends running the `policyengine-uk` package in GitHub Actions instead, and never displaying PolicyEngine's own parameter values as today's rates.
- **Database changes applied 27 Sep:** `council_item_outcomes` and `outcome_queue` (phase 1). Pending: `2026-09-27-council-register.sql` (open-data branch).
- **Last deploy:** `6ab92f78a04142ac5c1209d5` (27 Sep), code `6bf2060`.

## Decisions log

Dates are when the decision was made or relayed. Newest last.

| Date | By | Decision |
|---|---|---|
| Sep 2026 | Romily | Hard requirements: completely impartial; every fact attributed to its source; no way for figures to be manipulated; no grounds to say the system prefers any candidate. Not-for-profit. Founders named. |
| Sep 2026 | Romily | Version-one scope: nine topics (see below), household questions in bands, no ranking. |
| 18 Sep | Romily | Reviewer / two-person approval dropped. Publication rests on good sources with every claim attributed (quote, publisher, date, link). `/review` becomes the maintainers' correction and withdrawal console. |
| 19 Sep | Barny | Topics expanded from five to nine: money and cost of living; housing; health and social care; education; environment and energy; immigration and borders; crime, policing and justice; defence, foreign affairs and the EU; equality and rights. Optional household questions for disabled family members. LGBTQ+ issues covered as a topic, not a personal question. |
| 19 Sep | Barny | Parties may be represented by their established colours, on party material only; site must be engaging and include maps of the postcode area and voting-area boundary. |
| 19 Sep | Barny | Candidate photos shown where Democracy Club has one (`NEXT_PUBLIC_PHOTOS_MODE=any`), departing from the all-or-none rule. Later superseded by round five (photos only on the candidate's own page). |
| 19 Sep | Barny | External further-reading links acceptable if non-partisan or labelled as biased. |
| 19 Sep | Both | One codebase and organisation for any future country; a .org.uk-style country domain is fine because the same name won't be reused abroad. |
| 21 Sep | Both | Published roles: Romily Johnson, Founder and Product Lead; Barny Trevelyan-Johnson, Technical Lead. Neither is a member of, works for, or is paid by any party or campaign. Self-funded. |
| 21 Sep | Barny | The app will go to the iOS App Store and Google Play; Barny will be the person who updates it. |
| 23 Sep | Romily | Name: What's It To Me? (after This Shit Matters, then Hustings). Domain whatsittome.org. |
| 23 Sep | Romily | Logo: at the time, the "five figures forming a star" option, question mark added to the name, no strapline. |
| 24 Sep | Barny | Logo now the profiles-and-question-mark emblem, home lockup "Politics, in your context." Never to be regressed. |
| 24 Sep | Barny | Map legend layer colours must be clearly different from each other and clearly not party colours; each legend item links to an explanation of what it means in context. |
| 24 Sep | Romily | Empty record section: option 4 from paper 03 — party positions for everyone, a candidate's own record as extra, with the same neutral factual line for anyone without a record. Built 24 Sep. |
| 24 Sep | Romily | Round six answers: no council business on a parliamentary by-election page, the council gets its own page ("What's happening where you live" by topic, sources, then councillors with a register-of-interests link; no attendance, no allowances); no-record line in her wording; promises and votes kept separate for now, research to continue on every method; "regional" becomes whatever exists between council and Westminster as a layered mechanism, elected bodies first; local-issues rule to be rethought; the whole site's copy to sound human, emotional yet factual, never AI. |
| 24 Sep | Romily | Round five answers (full text in [docs/romily/README.md](romily/README.md)): all seven journey changes in progress; feedback version after the new journey; profile with postcode as step one but not framed as "where do you live", with the option to skip; photos only on a candidate's own page, name and party everywhere else; topics ordered by profile with the reason shown, then "Explore all topics"; no-election postcodes get next vote and representatives, then the map; all five levels shown for each layer of government; global issues included; leans to strict pledge-to-vote pairing with no verdict; wants to see both journey shapes (steps vs one page). |
| 27 Sep | Both | No inviting candidates to submit statements for now (Romily: it was one option, not her choice, and it's "slightly subjective"; Barny: automatic emailing and publishing leaves too much room for error, a step for if the site grows and has funded staff). The site no longer says it invites candidates; candidates who spot an error email hello@whatsittome.org and the correction is logged. Democracy Club statements to voters continue to show automatically. |
| 27 Sep | Barny | No Welsh (or Gaelic) translator. Material received in Welsh or Gaelic is published in that language as received; nothing is ever translated. The interface stays in English for now (Romily asked for a Welsh interface in round eight, point 13; put to her in round eight, q23). |
| 27 Sep | Claude (for Barny) | Search indexing is one switch: set ALLOW_INDEXING=1 in Netlify's environment and redeploy. Until then every page is noindex and robots.txt lists no sitemap. Barny sets the date. |
| 27 Sep | Claude (for Barny) | Netlify's edge now keeps public pages for five minutes (stale for up to an hour while refreshing), each query string separately. Side effect: the server-side page counter (bumpUsage) under-counts pages served from the edge; treat it as a floor, not a total. |
| 27 Sep | Claude | Where two parties on one ballot pledge the same modellable change, both are modelled or neither is. The Liberal Democrats' £15,000 personal allowance and National Insurance threshold is now modelled alongside Reform UK's allowance (PolicyEngine UK 2.98.0, 8,100 households, hash-checked on load). Their unquantified higher-rate pledge is not modelled beyond what follows from the allowance. |
| 27 Sep | Claude | New automatic jobs: eve-of-poll archive copies of every ballot and candidate page (daily 17:05 and 19:35 UTC); a weekly link check (Sundays) whose dead links are shown as their Internet Archive copy; reform sets load from scripts/receipts on push. All report to /status. |
| 27 Sep | Claude | Corrections logged in the ledger: rows 495 and 496 (duplicates of 494 and 493) and 183 (Ben Walker's ballot-paper description, counted as a position when no one else's was) withdrawn by rows 517–519. |
| 27 Sep | Barny | Improve search, AI visibility and conversion from the Nova Insight audit: built and deployed the same day (titles, canonical addresses, descriptions, structured data, `/llms.txt`, AI crawlers named in robots.txt, `/contact`, home trust strip, 48px tap targets, lighter fonts and logo). Nothing the audit suggested that would rank or score was adopted; the CSP `unsafe-inline` and HSTS preload items were left, with reasons. |
| 27 Sep | Claude (for Barny) | Phase-1 wording: a past council item with no result read says "Result not yet read from the minutes", not "Minutes not yet published", which would be an unchecked claim for councils the reader hasn't reached. Phase-1 tables applied to Supabase. |
| 27 Sep | Barny | Use mySociety open data: a register and page for every UK council, deprivation for Wales, Scotland and NI from each nation's own official index (not mySociety's composite, which uses older editions and modelled scores), a WriteToThem link without the postcode. Built by Claude Code on `automation/open-data`. |
| 27 Sep | Barny | Search every public data source for anything usable. About 250 checked; results and a build order in research paper 11. Sources that score or rate (Ofsted, CQC, police inspection grades, DfT road ratings, fact-check verdicts, polls) are excluded, as are campaigning aggregators where a primary source exists and candidates' company directorships. |
| 28 Sep | Romily | Not taking the Democracy Club call on 28 Sep. The other offered slot is 7–9 Oct. |
| 28 Sep | Barny | Search indexing switched on: ALLOW_INDEXING=1 set in Netlify and redeployed (deploy 6aba00a3, same code as 27 Sep). |
| 28 Sep | Barny | Build items 1–7 of the data-source list. Built by Claude (Cowork) on `automation/data-1-7`, stacked on open data, not merged. New data lives in JSON files in `lib/` refreshed weekly by pull request, so a data change never deploys by itself. PolicyEngine is pinned at 2.98.0 and checked weekly against 15 GOV.UK rates. |
| 28 Sep | Barny | Release: phase 1, open data and items 1–7 merged to main (cc1af60) and deployed (6aba1ab1). Migration, loaders and workflows not yet run; the climate-emergency quotes stay off until Romily answers round eight q28. |
| 9 Oct | Claude (for Barny) | Eve-of-poll archive copies had never captured a page: GitHub started the scheduled runs hours late, and a run after midnight BST took "tomorrow" to be the day after the poll (30 Sep run looked for 2 Oct, 7 Oct run looked for 9 Oct). Fix on `fix/poll-eve-dates`: until 07:00 London time the job also looks for polls on the current date, and the schedule moves to 14:05 and 16:35 UTC. The 1 and 8 Oct polls, including Holborn and St Pancras, have no eve-of-poll copies and cannot be recovered. |

## Open decisions (waiting on a person)

The full, current list with who each waits on is in [docs/STATUS.md](STATUS.md). Round eight answers arrive in the Netlify form `romily-answers-round-8` on the questions site; none of its 24 questions is answered yet (the one submission, 27 Sep, was blank).

- **Barny:** which opening line (paper 01).
- **Barny:** what to do about the shared Netlify credit pot before 8 October — separate team or plan, fewer deploys, or another host (paper 07).
- **Romily:** what she wants rethought in the local-issues rule (round six q12).
- **Romily:** which journey shape — steps (`/journey/steps`) or one page opening up (`/journey/flow`); both are built, unlinked and noindex.
- **Romily:** reconsider the "nothing found" wording (she said fine for now).
- **From round six, still open:** council motions by proposing group; a refresh routine for the council facts in lib/councils.json; the rest of the copy pass once the opening line is chosen. Full detail in [docs/romily/feedback-log.md](romily/feedback-log.md).

## Handover items still needing a human

Carried from CHANGELOG handovers, still open on 24 Sep:

- Election notice URLs for each ballot beyond the SoPN (`election_dates`).
- Reform UK and Liberal Democrat primary sources for positions.
- Human confirmation of Democracy Club photo licences before any all-or-none rule could apply.
- Council pledges for Lambeth (primary minutes need a browser).
- Welsh translation (docs/welsh.md).
- Democracy Club call with Peter Keeling: Romily declined Mon 28 Sep; the remaining offer is 7–9 Oct, or ask Peter for a later time. Ask: is a candidates-API token separate; rate limits for by-election-day traffic (hobbyist key is 1,000/day); candidate photo licences; scheduled 2027 elections before they are called.

## How the sessions work

- **Build session** works in `~/code/voter-app`, commits and pushes to `main`, deploys to Netlify. Every deploy costs Netlify credits; do not deploy casually.
- **Research session** works from `docs/research/00-BRIEF.md`, writes papers into the UKPolitcs folder, which are then copied into `docs/research/`.
- **Questions to Romily** go on romily-app-questions.netlify.app, one page per round, with a Netlify form for her answers. Source is in `docs/romily/questions-site/`. Gotcha: HTML downloaded from the live site loses `data-netlify="true"`; every `<form>` needs `data-netlify="true" netlify-honeypot="bot-field"` before a redeploy or form detection silently stops.
- **The 24 Sep incident:** a day's uncommitted work was overwritten by a deploy from the clone; it was recovered from Netlify's deploy source and committed. Lesson: commit and push before deploying, every time. The last three pieces that recovery missed (reflow CSS, UX second pass, migration SQL) were merged from the final zip on 24 Sep.
