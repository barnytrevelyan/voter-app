import test from "node:test";
import assert from "node:assert/strict";
import { problemsWithElections, problemsWithMeta, compareVersions, MIN_APP_VERSION, LATEST_APP_VERSION, APP_API_VERSION } from "../dist-test/appApi.mjs";

// The phone-app contract (lib/appApi.ts). If one of these fails, a change would break apps already on people's phones.
const good = {
  ok: true, outcode: "WC1H", placeUrl: "https://whatsittome.org/place?pc=WC1H", source: "Democracy Club (CC BY 4.0) and postcodes.io",
  elections: [{ ballot_paper_id: "parl.holborn-and-st-pancras.2026-10-08", election_date: "2026-10-08", election_name: "UK Parliament by-election", post_label: "Holborn and St Pancras", covered: true, url: "https://whatsittome.org/ballot/x/area" }],
};

test("a well-formed elections reply passes", () => assert.deepEqual(problemsWithElections(good), []));
test("an error reply needs a message", () => {
  assert.deepEqual(problemsWithElections({ ok: false, message: "No such postcode" }), []);
  assert.notDeepEqual(problemsWithElections({ ok: false }), []);
});
test("renamed or missing fields are caught", () => {
  const { elections, ...rest } = good;
  assert.ok(problemsWithElections({ ...rest, ballots: elections }).length > 0);
  const e = { ...good.elections[0] }; delete e.election_date;
  assert.ok(problemsWithElections({ ...good, elections: [e] }).some((p) => p.includes("election_date")));
  assert.ok(problemsWithElections({ ...good, elections: [{ ...good.elections[0], url: null }] }).some((p) => p.includes("covered but has no url")));
});
test("extra fields are allowed (additive changes are fine)", () => {
  assert.deepEqual(problemsWithElections({ ...good, newThing: 1, elections: [{ ...good.elections[0], extra: "x" }] }), []);
});
test("meta reply and version rules", () => {
  const meta = { ok: true, apiVersion: APP_API_VERSION, minAppVersion: MIN_APP_VERSION, latestAppVersion: LATEST_APP_VERSION, updateMessage: "x", storeUrls: { ios: null, android: null } };
  assert.deepEqual(problemsWithMeta(meta), []);
  assert.ok(compareVersions(MIN_APP_VERSION, LATEST_APP_VERSION) <= 0, "MIN_APP_VERSION must not be above LATEST_APP_VERSION");
  assert.equal(compareVersions("0.10.0", "0.9.9"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.1.0", "0.2.0"), -1);
});
