// The contract between whatsittome.org and the phone app (mobile/). Both sides use these types: the website routes in
// app/api/app/v1/ and mobile/App.tsx (type-only import, so the app bundle never pulls in website code).
//
// Rules (docs/PROJECT.md, 13 Oct 2026):
// - Within v1, only ever ADD optional fields. Never rename, remove or change the meaning of a field: installed apps
//   stay on old versions for months.
// - A breaking change means a new folder app/api/app/v2/, with v1 kept running until MIN_APP_VERSION passes the last
//   app version that used it.
// - Content, data and copy live on the website, never in the app, so they reach the app without a store release.
// - This file has no imports, so `node --experimental-strip-types` can run the validators (scripts/app-contract.mjs).

export const APP_API_VERSION = 1;
export const APP_API_PATH = "/api/app/v1";

// Apps older than MIN_APP_VERSION are asked to update (a full-screen notice). Raise it only when a v1 route really can
// no longer serve an old app; LATEST_APP_VERSION is shown as a gentle "update available" line.
export const MIN_APP_VERSION = "0.1.0";
export const LATEST_APP_VERSION = "0.1.0";

export type AppError = { ok: false; message: string };

export type AppElection = {
  ballot_paper_id: string;
  election_date: string; // YYYY-MM-DD
  election_name: string;
  post_label: string;
  covered: boolean; // true when whatsittome.org has a ballot page for it
  url: string | null; // ballot page on whatsittome.org, when covered
};

// POST /api/app/v1/elections  body: { postcode: string }
export type ElectionsResponse =
  | { ok: true; outcode: string; elections: AppElection[]; placeUrl: string; source: string }
  | AppError;

// GET /api/app/v1/meta
export type MetaResponse = {
  ok: true;
  apiVersion: number;
  minAppVersion: string;
  latestAppVersion: string;
  updateMessage: string;
  storeUrls: { ios: string | null; android: string | null };
};

// ---- Runtime checks, used by the contract test and the CI workflow ----

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === "string";
const isDate = (x: unknown) => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);

export function problemsWithElections(x: unknown): string[] {
  const p: string[] = [];
  if (!isObj(x)) return ["not an object"];
  if (x.ok === false) { if (!isStr(x.message) || !x.message) p.push("error without a message"); return p; }
  if (x.ok !== true) return ["ok is neither true nor false"];
  if (!isStr(x.outcode) || !/^[A-Z]{1,2}\d[A-Z\d]?$/.test(x.outcode)) p.push("outcode missing or malformed");
  if (!isStr(x.placeUrl) || !x.placeUrl.startsWith("https://")) p.push("placeUrl missing or not https");
  if (!isStr(x.source) || !x.source) p.push("source missing");
  if (!Array.isArray(x.elections)) return [...p, "elections is not a list"];
  x.elections.forEach((e, i) => {
    if (!isObj(e)) { p.push(`elections[${i}] not an object`); return; }
    if (!isStr(e.ballot_paper_id) || !e.ballot_paper_id) p.push(`elections[${i}].ballot_paper_id missing`);
    if (!isDate(e.election_date)) p.push(`elections[${i}].election_date not YYYY-MM-DD`);
    if (!isStr(e.election_name)) p.push(`elections[${i}].election_name missing`);
    if (!isStr(e.post_label)) p.push(`elections[${i}].post_label missing`);
    if (typeof e.covered !== "boolean") p.push(`elections[${i}].covered not a boolean`);
    if (!(e.url === null || (isStr(e.url) && e.url.startsWith("https://")))) p.push(`elections[${i}].url not null or https`);
    if (e.covered === true && e.url === null) p.push(`elections[${i}] covered but has no url`);
  });
  return p;
}

export function problemsWithMeta(x: unknown): string[] {
  const p: string[] = [];
  if (!isObj(x) || x.ok !== true) return ["not an ok object"];
  if (x.apiVersion !== APP_API_VERSION) p.push(`apiVersion is ${String(x.apiVersion)}, expected ${APP_API_VERSION}`);
  for (const k of ["minAppVersion", "latestAppVersion"] as const) if (!isStr(x[k]) || !/^\d+\.\d+\.\d+$/.test(x[k] as string)) p.push(`${k} not x.y.z`);
  if (!isStr(x.updateMessage)) p.push("updateMessage missing");
  if (!isObj(x.storeUrls)) p.push("storeUrls missing");
  if (isStr(x.minAppVersion) && isStr(x.latestAppVersion) && compareVersions(x.minAppVersion, x.latestAppVersion) > 0) p.push("minAppVersion is above latestAppVersion");
  return p;
}

// -1, 0 or 1, comparing "x.y.z" strings numerically.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
