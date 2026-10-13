"""Weekly: one list of everything the automatic jobs could not settle by themselves, for a person to act on.

Posted as a GitHub issue labelled "data-review" (when POST_ISSUE=1 and a GitHub token is available), otherwise printed.
It covers: jobs that failed or did not run; quotations no longer found at their source; sources that could not be read;
council facts due a re-check; new publications from the parties and GOV.UK; official datasets with a new edition; and
elections where candidates or positions are missing. Nothing here is changed automatically: a claim is only ever
corrected by a person, as a new superseding row.
"""
import collections, datetime, json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from common import councils, select, now_iso

EXPECTED = {  # job name -> maximum age in hours before it counts as overdue
    "ballot ingest": 30, "schools (GIAS)": 30, "consultations": 30,
    "council register": 8 * 24, "climate declarations": 8 * 24, "waste sites": 8 * 24, "council meetings": 8 * 24, "motion outcomes": 8 * 24, "gazette notices": 8 * 24, "local plans (planning.data.gov.uk)": 8 * 24, "source watch": 8 * 24,
    "party publications": 8 * 24, "release watch": 8 * 24, "party funding (Electoral Commission)": 8 * 24,
    "eve-of-poll snapshots": 30, "link check": 8 * 24, "phone app contract": 30,
}


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    since = (now - datetime.timedelta(days=8)).strftime("%Y-%m-%dT%H:%M:%SZ")
    L = [f"Automatic checks for the week to {now:%d %B %Y}. Each item needs a person; nothing below was changed automatically.", ""]

    runs = select(f"/job_runs?select=job,finished_at,ok,rows,note&finished_at=gte.{since}&order=finished_at.desc")
    latest = {}
    for r in select("/job_runs?select=job,finished_at,ok,note&order=finished_at.desc&limit=400"):
        latest.setdefault(r["job"], r)
    L.append("## Jobs")
    bad = []
    for name, hours in EXPECTED.items():
        r = latest.get(name)
        if not r: bad.append(f"- **{name}**: has never run."); continue
        age = (now - datetime.datetime.fromisoformat(r["finished_at"].replace("Z", "+00:00"))).total_seconds() / 3600
        if not r["ok"]: bad.append(f"- **{name}** failed at {r['finished_at'][:16]}: {r.get('note') or ''}")
        elif age > hours: bad.append(f"- **{name}** last ran {int(age // 24)} days ago (overdue).")
    fails = [r for r in runs if not r["ok"]]
    L += bad or ["- Every job ran on time."]
    if fails: L.append(f"- {len(fails)} failed run(s) this week in total; see /status.")
    L.append("")

    checks = select(f"/source_checks?select=url,kind,ref,checked_at,http_status,quotes_total,quotes_found,missing_refs,changed,archive_url,note&checked_at=gte.{since}&order=checked_at.desc")
    last = {}
    for c in checks: last.setdefault(c["url"], c)
    missing = [c for c in last.values() if c.get("missing_refs")]
    unread = [c for c in last.values() if c.get("http_status") != 200]
    changed = [c for c in last.values() if c.get("changed") and not c.get("missing_refs")]
    L.append("## Quotations no longer found at their source")
    L.append("Re-read the source. If the wording changed, add a superseding claim with the new quotation, or withdraw it with the reason. The archived copy shows what the page said before.")
    L += [f"- {c['url']} ({c['ref']}): not found for {', '.join(c['missing_refs'])}" + (f" · [archived copy]({c['archive_url']})" if c.get("archive_url") else "") for c in missing] or ["- None."]
    L.append("")
    L.append("## Sources that could not be read automatically")
    L.append("Usually a site blocking automated readers, a moved page or a timeout. Open each by hand once; replace moved links.")
    L += [f"- {c['url']} ({c['ref']}): HTTP {c.get('http_status')}" for c in unread] or ["- None."]
    L.append("")
    if changed:
        L.append("## Sources whose wording changed (quotations still present)")
        L += [f"- {c['url']} ({c['ref']})" for c in changed]
        L.append("")

    L.append("## Council facts due a re-check (older than 90 days)")
    due = []
    for c in councils():
        try: age = (now.date() - datetime.date.fromisoformat(c.get("checked", "2000-01-01"))).days
        except Exception: age = 999
        if age > 90: due.append(f"- {c['name']}: facts read {c.get('checked')} ({age} days ago)")
    L += due or ["- None yet."]
    L.append("")

    feeds = select(f"/feed_items?select=feed,url,title,published,first_seen&first_seen=gte.{since}&order=feed,published.desc")
    L.append("## New publications from parties and government")
    L.append("Read each; if one states a position on one of the nine topics, draft a claim from the exact words.")
    by = collections.defaultdict(list)
    for f in feeds: by[f["feed"]].append(f)
    for k, items in by.items():
        L.append(f"**{k}** ({len(items)})")
        L += [f"- [{(i['title'] or i['url'])[:120]}]({i['url']})" + (f" · {i['published'][:10]}" if i.get("published") else "") for i in items[:25]]
        if len(items) > 25: L.append(f"- …and {len(items) - 25} more")
    pr = latest.get("party publications")
    if pr and pr.get("note") and "none" not in pr["note"]:
        L.append(f"**Check by hand this week** ({pr['note']}), so no party is watched less closely than another.")
    if not feeds: L.append("- None.")
    L.append("")

    rel = select(f"/release_watch?select=key,latest,url,changed_at&changed_at=gte.{since}")
    L.append("## Official datasets with a new edition")
    L += [f"- **{r['key']}**: {r['latest']} ({r['url']}). Reload the table it feeds." for r in rel] or ["- None."]
    L.append("")

    today = now.date().isoformat()
    ballots = select(f"/ballots?select=ballot_paper_id,area_name,poll_date&archived=eq.false&poll_date=gte.{today}")
    cands = select("/candidates?select=id,ballot_paper_id,party_ec_id,name,withdrawn_at")
    claims = select("/current_claims?select=candidate_id,party_ec_id,ballot_paper_id")
    by_party = {c["party_ec_id"] for c in claims if c["party_ec_id"]}
    by_cand = {c["candidate_id"] for c in claims if c["candidate_id"]}
    L.append("## Upcoming elections: gaps")
    gaps = []
    for b in sorted(ballots, key=lambda x: x["poll_date"]):
        cs = [c for c in cands if c["ballot_paper_id"] == b["ballot_paper_id"] and not c.get("withdrawn_at")]
        if not cs: gaps.append(f"- {b['area_name']} ({b['poll_date']}): no candidates yet (nominations may not have closed)"); continue
        none = [c["name"] for c in cs if c["id"] not in by_cand and c["party_ec_id"] not in by_party]
        if none: gaps.append(f"- {b['area_name']} ({b['poll_date']}): no sourced positions for {', '.join(none)}")
    wd = [c for c in cands if c.get("withdrawn_at") and c["withdrawn_at"] >= since]
    gaps += [f"- Withdrawn this week: {c['name']} ({c['ballot_paper_id']})" for c in wd]
    L += gaps or ["- None."]

    text = "\n".join(L)
    print(text)
    token, repo = os.environ.get("GITHUB_TOKEN"), os.environ.get("GITHUB_REPOSITORY")
    if os.environ.get("POST_ISSUE") == "1" and token and repo:
        body = json.dumps({"title": f"Weekly data review, {now:%d %B %Y}", "body": text[:60000], "labels": ["data-review"]}).encode()
        req = urllib.request.Request(f"https://api.github.com/repos/{repo}/issues", data=body, method="POST",
                                     headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "User-Agent": "whatsittome-weekly-review"})
        with urllib.request.urlopen(req, timeout=60) as r:
            print("posted", json.load(r).get("html_url"))


if __name__ == "__main__": main()
