import Link from "next/link";
import { ago, freshness, stamp } from "@/lib/freshness";
import { publicClient } from "@/lib/data";

// Every automatic job, what it keeps current, and how stale it may get before it counts as overdue (hours).
const JOBS: { job: string; what: string; when: string; max: number }[] = [
  { job: "ballot ingest", what: "Elections, candidates, statements, withdrawals; archives past elections", when: "Daily 05:17 UTC", max: 30 },
  { job: "schools (GIAS)", what: "Proposed and recent school openings and closures in England (DfE register)", when: "Daily", max: 30 },
  { job: "consultations", what: "Open consultations from councils that use Citizen Space", when: "Daily", max: 30 },
  { job: "council register", what: "Every UK council, its website and codes (mySociety, checked against ONS)", when: "Mondays", max: 8 * 24 },
  { job: "waste sites", what: "Permitted waste sites in England (Environment Agency public register), for the map", when: "Mondays", max: 8 * 24 },
  { job: "climate declarations", what: "Each council's climate-emergency motion, re-read from the council's own document", when: "Mondays", max: 8 * 24 },
  { job: "council meetings", what: "Full Council and Cabinet agendas and motions (Modern.gov)", when: "Mondays", max: 8 * 24 },
  { job: "motion outcomes", what: "The result of each agenda item, read from the published minutes in the council's own words", when: "Mondays", max: 8 * 24 },
  { job: "gazette notices", what: "Traffic and highways orders published in The Gazette", when: "Mondays", max: 8 * 24 },
  { job: "local plans (planning.data.gov.uk)", what: "Each council's local plans and housing requirement (MHCLG)", when: "Mondays", max: 8 * 24 },
  { job: "party funding (Electoral Commission)", what: "Party donations, latest four published quarters", when: "Mondays; rebuilt when a quarter is published", max: 8 * 24 },
  { job: "source watch", what: "Re-reads every quoted source, checks each quotation is still there, archives a copy", when: "Mondays", max: 8 * 24 },
  { job: "party publications", what: "New publications from party websites and GOV.UK, for review", when: "Mondays", max: 8 * 24 },
  { job: "release watch", what: "New editions of official datasets (council tax, deprivation, ONS lookups, emissions)", when: "Mondays", max: 8 * 24 },
  { job: "eve-of-poll snapshots", what: "The evening before each poll, asks the Internet Archive to keep a copy of every ballot and candidate page", when: "Daily 14:05 and 16:35 UTC", max: 30 },
  { job: "link check", what: "Checks every outbound link; a dead one is shown as its archived copy", when: "Sundays", max: 8 * 24 },
  { job: "phone app contract", what: "Calls the phone app's routes on this site (/api/app/v1) and checks every reply still matches what installed apps expect", when: "Daily 06:23 UTC", max: 30 },
];

export const metadata = { title: "Is this up to date?", description: "When the election data on this site was last refreshed, and whether the nightly update is working.", alternates: { canonical: "/status" } };
export const dynamic = "force-dynamic";

export default async function Status() {
  const f = await freshness();
  const { data: runRows } = await publicClient().from("job_runs").select("job, finished_at, ok, rows, note").order("finished_at", { ascending: false }).limit(400);
  const lastRun = new Map<string, { finished_at: string; ok: boolean; rows: number | null; note: string | null }>();
  for (const r of runRows ?? []) if (!lastRun.has(r.job)) lastRun.set(r.job, r);
  const hours = f.ballots ? (Date.now() - new Date(f.ballots).getTime()) / 3600000 : Infinity;
  const state = hours < 36 ? "ok" : hours < 72 ? "warn" : "bad";
  const headline = state === "ok" ? "Up to date" : state === "warn" ? "Slightly behind" : "Out of date";
  const explain = state === "ok"
    ? "The nightly update ran as expected. Candidate lists were last checked against Democracy Club at the time shown below."
    : state === "warn"
      ? "The nightly update has not run for more than a day and a half. Nothing is wrong with what you can see, but a new candidate or a newly called by-election might be missing."
      : "The nightly update has not run for more than three days. Treat candidate lists here as possibly incomplete and check Democracy Club directly.";
  const rows: [string, string | null, string][] = [
    ["Elections and candidates", f.ballots, "Every current ballot and everyone standing, from Democracy Club. Refreshed nightly."],
    ["Candidate details", f.candidates, "Names, parties, photos and statements to voters."],
    ["Campaign leaflets", f.leaflets, "Leaflets archived by volunteers at ElectionLeaflets."],
    ["Sourced positions", f.claims, "Quotations from manifestos, records and candidate statements. Added by hand, so this moves less often."],
    ["Public ledger", f.ledger, "The last recorded correction, addition or change."],
  ];
  return (
    <>
      <p className="eyebrow">Data status</p>
      <h1>Is this up to date?</h1>
      <div className={`status-banner ${state}`}>
        <p className="status-headline">{headline}</p>
        <p style={{ margin: 0 }}>Elections and candidates last refreshed <strong>{ago(f.ballots, f.now)}</strong> — {stamp(f.ballots)}.</p>
        <p className="meta" style={{ margin: "0.4rem 0 0" }}>{explain}</p>
      </div>

      <table className="plain status-table">
        <thead><tr><th>What</th><th>Last refreshed</th><th>When</th></tr></thead>
        <tbody>
          {rows.map(([label, at, note]) => (
            <tr key={label}>
              <th scope="row">{label}<span className="meta" style={{ display: "block", fontWeight: 400 }}>{note}</span></th>
              <td style={{ whiteSpace: "nowrap" }}>{ago(at, f.now)}</td>
              <td className="meta" style={{ whiteSpace: "nowrap" }}>{stamp(at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Every automatic job</h2>
      <p>Everything below runs by itself on a schedule and records each run here. A job that fails or misses its slot is flagged, and a weekly review lists anything a person needs to look at.</p>
      <table className="plain status-table">
        <thead><tr><th>Job</th><th>Last run</th><th>Result</th></tr></thead>
        <tbody>
          {JOBS.map((j) => {
            const r = lastRun.get(j.job);
            const age = r ? (Date.now() - new Date(r.finished_at).getTime()) / 3600000 : Infinity;
            const result = !r ? "Not run yet" : !r.ok ? "Failed" : age > j.max ? "Overdue" : "OK";
            return (
              <tr key={j.job}>
                <th scope="row">{j.what}<span className="meta" style={{ display: "block", fontWeight: 400 }}>{j.when}{r?.note ? ` · ${r.note.slice(0, 180)}` : ""}</span></th>
                <td style={{ whiteSpace: "nowrap" }}>{r ? ago(r.finished_at, f.now) : "never"}</td>
                <td style={{ whiteSpace: "nowrap" }}><b>{result}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Every election we are showing</h2>
      <p>{f.liveBallots} election{f.liveBallots === 1 ? "" : "s"} currently listed. {f.stale.length === 0
        ? "All of them were refreshed in the last day and a half."
        : `${f.stale.length} of them ${f.stale.length === 1 ? "has" : "have"} not been refreshed for more than a day and a half:`}</p>
      {f.stale.length ? (
        <ul className="small">
          {f.stale.map((s) => <li key={s.id}><Link href={`/ballot/${encodeURIComponent(s.id)}`}>{s.area}</Link> — last refreshed {ago(s.at, f.now)}</li>)}
        </ul>
      ) : null}

      <h2>How the update works</h2>
      <p>Every morning at 05:17 UTC an automated job asks Democracy Club for every election now open, writes what it finds here, and records the time against each one. It also looks for new campaign leaflets and candidate photos, marks candidates who have withdrawn, and moves elections off the current lists the day after polling. If a single election cannot be fetched, the job still loads the rest but records a failure rather than quietly dropping it, and that election appears in the list above.</p>
      <p className="meta">Times are shown in UTC, which is the same as UK time in winter and one hour behind British Summer Time. Sourced positions are added by people, not by the nightly job, so that row moves less often and a gap there is normal. The code that does all this is <a href="https://github.com/highlyvisual/whatsittome">open source</a>, and every change to a published claim is listed in <Link href="/ledger">the public ledger</Link>.</p>
    </>
  );
}
