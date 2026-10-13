import { NextResponse } from "next/server";
import { APP_API_VERSION, LATEST_APP_VERSION, MIN_APP_VERSION, type MetaResponse } from "@/lib/appApi";

// Phone app: what it needs to know before anything else (which app versions this website still serves).
// Read on every app launch; cached for an hour so a raised MIN_APP_VERSION reaches phones the same day.
export function GET() {
  const body: MetaResponse = {
    ok: true,
    apiVersion: APP_API_VERSION,
    minAppVersion: MIN_APP_VERSION,
    latestAppVersion: LATEST_APP_VERSION,
    updateMessage: "A newer version of What's It To Me? is available. Please update from the App Store or Google Play.",
    // Filled in once each store listing is public.
    storeUrls: { ios: null, android: null },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
