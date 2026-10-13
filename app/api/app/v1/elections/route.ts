import { NextResponse, type NextRequest } from "next/server";
import { listBallots } from "@/lib/data";
import { ballotsForPostcode } from "@/lib/democracyclub";
import type { AppElection, ElectionsResponse } from "@/lib/appApi";
export const dynamic = "force-dynamic";

// Phone app (mobile/), contract v1 (lib/appApi.ts: add optional fields only, never rename or remove).
// Postcode -> the elections at that address, as JSON. Same sources and rules as the website's
// findElection (app/find/actions.ts): Democracy Club first, postcodes.io for the rounded location. A POST, so the
// postcode never appears in a URL or log, and nothing is stored. Only the outward code and a ~100 m location go back.
const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern Ireland"]);
const SITE = "https://whatsittome.org";

type Pio = { latitude: number | null; longitude: number | null; country?: string };

export async function POST(req: NextRequest) {
  let body: { postcode?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body handled below */ }
  const raw = String(body.postcode ?? "").replace(/\s+/g, "").toUpperCase();
  const reply = (res: ElectionsResponse, status = 200) => NextResponse.json(res, { status, headers: { "Cache-Control": "no-store" } });
  const fail = (message: string, status = 400) => reply({ ok: false, message }, status);
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(raw)) return fail("That doesn't look like a UK postcode. Check it and try again, for example WC1H 9JE.");

  let pio: Pio | null = null;
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}`, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (r.status === 404) return fail("We can't find that postcode. Please check it and try again.");
    if (r.ok) pio = ((await r.json()) as { result?: Pio }).result ?? null;
  } catch { pio = null; }
  if (pio && (pio.latitude == null || (pio.country && !UK_COUNTRIES.has(pio.country)))) {
    return fail("That postcode is outside the UK. This app covers elections in England, Scotland, Wales and Northern Ireland.");
  }

  const outcode = raw.slice(0, -3);
  const loc = pio ? `${Number(pio.latitude).toFixed(3)},${Number(pio.longitude).toFixed(3)}` : "";
  const q = `pc=${encodeURIComponent(outcode)}${loc ? `&loc=${loc}` : ""}`;

  const [ours, dc] = await Promise.all([listBallots().catch(() => []), ballotsForPostcode(raw)]);
  if (!dc) return fail("We couldn't look up elections for that postcode just now. Please try again in a minute.", 503);
  const covered = new Set(ours.map((b) => b.ballot_paper_id));

  const elections: AppElection[] = dc
    .sort((a, b) => a.election_date.localeCompare(b.election_date))
    .map((b) => ({
      ballot_paper_id: b.ballot_paper_id,
      election_date: b.election_date,
      election_name: b.election_name,
      post_label: b.post_label,
      covered: covered.has(b.ballot_paper_id),
      url: covered.has(b.ballot_paper_id) ? `${SITE}/ballot/${encodeURIComponent(b.ballot_paper_id)}/area?${q}` : null,
    }));

  return reply({ ok: true, outcode, elections, placeUrl: `${SITE}/place?${q}`, source: "Democracy Club (CC BY 4.0) and postcodes.io" });
}
