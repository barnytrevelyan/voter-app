// Live check of the phone-app API on the deployed site (run by .github/workflows/app-contract.yml).
// Usage: node --experimental-strip-types scripts/app-contract.mjs [base URL]   (default https://whatsittome.org)
// Exits non-zero if any reply breaks the v1 contract in lib/appApi.ts, so the workflow run shows red.
import { APP_API_PATH, problemsWithElections, problemsWithMeta } from "../lib/appApi.ts";

const base = (process.argv[2] || process.env.APP_API_BASE || "https://whatsittome.org").replace(/\/$/, "");
const ua = { "User-Agent": "What's It To Me? contract check (github actions)" };
let failed = 0;
const report = (name, problems) => {
  if (problems.length) { failed++; console.log(`FAIL ${name}\n  - ${problems.join("\n  - ")}`); }
  else console.log(`ok   ${name}`);
};

async function getJson(path, init) {
  let r, text;
  try {
    r = await fetch(base + path, { ...init, headers: { ...ua, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(20000) });
    text = await r.text();
  } catch (e) { return { status: 0, json: null, text: `request failed: ${e?.name ?? e}` }; }
  try { return { status: r.status, json: JSON.parse(text) }; } catch { return { status: r.status, json: null, text: text.slice(0, 200) }; }
}

const meta = await getJson(`${APP_API_PATH}/meta`);
report(`GET ${APP_API_PATH}/meta (${meta.status})`, meta.status === 200 ? problemsWithMeta(meta.json) : [`HTTP ${meta.status} ${meta.text ?? ""}`.trim()]);

// One London postcode (the site's example), one Scottish, one Welsh; then malformed and unknown postcodes, which must
// come back as a well-formed error. 503 (Democracy Club unreachable) is reported but not counted as a contract break.
const cases = [
  ["WC1H 9JE", "real"], ["EH1 1YZ", "real"], ["CF10 1EP", "real"],
  ["NOT A POSTCODE", "error"], ["ZZ9 9ZZ", "error"],
];
for (const [postcode, kind] of cases) {
  const r = await getJson(`${APP_API_PATH}/elections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postcode }) });
  const name = `POST ${APP_API_PATH}/elections ${postcode} (${r.status})`;
  if (r.json === null) { report(name, [`not JSON: ${r.text}`]); continue; }
  const problems = problemsWithElections(r.json);
  if (kind === "error" && r.json.ok !== false) problems.push("expected an error reply");
  if (kind === "real" && r.status === 503) { console.log(`warn ${name}: lookup unavailable, not a contract break`); continue; }
  if (kind === "real" && r.json.ok !== true) problems.push(`expected ok:true, got: ${r.json.message}`);
  report(name, problems);
}

console.log(failed ? `\n${failed} check(s) failed against ${base}` : `\nAll checks passed against ${base}`);
process.exit(failed ? 1 : 0);
