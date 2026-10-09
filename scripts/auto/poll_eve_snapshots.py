"""Daily: on the day before a poll, ask the Internet Archive to keep a copy of every page a voter would read for it.

For each ballot polling tomorrow (UK date), this saves the ballot page, the comparison page and every candidate's page
with Save Page Now, and records the archived address in page_snapshots, which /ledger lists. The record of what the
site showed on the eve of the poll then lives with an independent archive, not with us.

Anonymous Save Page Now refuses bursts, so captures are spaced out; a run that is cut short is picked up by the next
run the same evening (the workflow runs twice), because pages already captured for this poll are skipped.

GitHub runs scheduled workflows late, often by hours. A run that starts after midnight London time is still "the
evening before" as far as the poll is concerned (polls open at 07:00), so until 07:00 London time the job also looks
for polls on the current date. Before this, a run delayed past midnight BST looked a day too far ahead and every poll
was missed (30 Sep and 7 Oct 2026).
"""
import datetime, os, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from common import job, select, write
from source_watch import archive

SITE = "https://whatsittome.org"
GAP = 25  # seconds between captures
BUDGET = int(os.environ.get("SNAPSHOT_BUDGET", "40"))


POLLS_OPEN_HOUR = 7  # UK polling stations open at 07:00 local time


def london_now(now: datetime.datetime | None = None) -> datetime.datetime:
    # Europe/London without a tz database: BST runs from the last Sunday of March to the last Sunday of October.
    now = now or datetime.datetime.now(datetime.timezone.utc)
    y = now.year
    def last_sunday(month):
        d = datetime.date(y, month, 31 if month in (3, 10) else 30)
        return d - datetime.timedelta(days=(d.weekday() + 1) % 7)
    start = datetime.datetime.combine(last_sunday(3), datetime.time(1), datetime.timezone.utc)
    end = datetime.datetime.combine(last_sunday(10), datetime.time(1), datetime.timezone.utc)
    return now + datetime.timedelta(hours=1 if start <= now < end else 0)


def london_today() -> datetime.date:
    return london_now().date()


def target_dates(now: datetime.datetime | None = None, days_ahead: int = 1) -> list[datetime.date]:
    """The poll dates this run is the eve of: tomorrow, plus today while the polls have not yet opened.

    A scheduled run that GitHub starts after midnight London time is still the evening before that day's poll."""
    local = london_now(now)
    dates = [local.date() + datetime.timedelta(days=days_ahead)]
    if days_ahead == 1 and local.hour < POLLS_OPEN_HOUR:
        dates.insert(0, local.date())
    return dates


def main():
    with job("eve-of-poll snapshots") as st:
        dates = target_dates(days_ahead=int(os.environ.get("DAYS_AHEAD", "1")))
        target = " or ".join(d.isoformat() for d in dates)
        ballots = select("/ballots?select=ballot_paper_id&archived=eq.false&poll_date=in.("
                         + ",".join(d.isoformat() for d in dates) + ")&order=poll_date,ballot_paper_id")
        if not ballots:
            st["rows"] = 0; st["note"] = f"no polls on {target}"; return
        done = {r["page_url"] for r in select("/page_snapshots?select=page_url,archive_url&archive_url=not.is.null")
                if r.get("archive_url")}
        rows, n = [], 0
        for b in ballots:
            bid = b["ballot_paper_id"]
            base = f"{SITE}/ballot/{urllib.parse.quote(bid)}"
            pages = [base, f"{base}/compare"]
            for c in select(f"/candidates?select=id&ballot_paper_id=eq.{urllib.parse.quote(bid)}&withdrawn_at=is.null&order=id"):
                pages.append(f"{base}/candidate/{c['id']}")
            for url in pages:
                if url in done or n >= BUDGET: continue
                snap, note = archive(url); n += 1
                rows.append({"ballot_paper_id": bid, "page_url": url, "archive_url": snap, "note": note})
                print(bid, url, snap or note, flush=True)
                time.sleep(GAP)
        write("page_snapshots", rows)
        ok = sum(1 for r in rows if r["archive_url"])
        st["rows"] = len(rows); st["note"] = f"polls on {target}: {len(ballots)} ballots; {ok} of {len(rows)} pages archived this run"


if __name__ == "__main__": main()
