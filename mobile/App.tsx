import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

// Version 0: the first build for the Google Play closed test and TestFlight. Postcode -> the elections at that address,
// from whatsittome.org/api/app/elections (Democracy Club + postcodes.io). The postcode is sent once, never stored.
// Everything deeper opens the website in an in-app browser until the native screens are built (docs: APP-PLAN).
// The reply shapes come from the website's contract file (type-only import: no website code enters the app bundle).
// Content and data always come from the website, so updates there reach the app without a store release.
import type { ElectionsResponse as Result, MetaResponse } from '../lib/appApi';

const API = 'https://whatsittome.org/api/app/v1';
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

// Same rule as compareVersions in lib/appApi.ts (kept local so the bundle stays independent of website code).
function older(a: string, b: string) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  return false;
}

// Site palette (app/theme.css): latte paper, cocoa ink, raspberry accent; dark-mode values from the same file.
const light = { paper: '#F7EFE6', panel: '#FFFFFF', ink: '#2B1B14', soft: '#4A3A31', accent: '#B8004F', onAccent: '#FFFFFF', line: '#E6D6C8' };
const dark = { paper: '#1B1310', panel: '#241A15', ink: '#F7EFE6', soft: '#E6D6C8', accent: '#FF86B3', onAccent: '#1B1310', line: '#3A2B23' };

function longDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}

export default function App() {
  const c = useColorScheme() === 'dark' ? dark : light;
  const [postcode, setPostcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  // Ask the website which app versions it still serves. Offline or unreachable: carry on as normal.
  useEffect(() => {
    fetch(`${API}/meta`).then((r) => r.json()).then((m: MetaResponse) => { if (m?.ok) setMeta(m); }).catch(() => {});
  }, []);
  const mustUpdate = !!meta && older(APP_VERSION, meta.minAppVersion);
  const canUpdate = !!meta && !mustUpdate && older(APP_VERSION, meta.latestAppVersion);
  const storeUrl = meta ? (Platform.OS === 'ios' ? meta.storeUrls.ios : meta.storeUrls.android) : null;

  const open = (url: string) => WebBrowser.openBrowserAsync(url, { toolbarColor: c.paper, controlsColor: c.accent });

  async function look() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/elections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postcode }) });
      setResult((await r.json()) as Result);
    } catch {
      setResult({ ok: false, message: "We couldn't reach What's It To Me? just now. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={[s.fill, { backgroundColor: c.paper }]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          {(mustUpdate || canUpdate) && meta && (
            <Pressable
              onPress={() => storeUrl && open(storeUrl)}
              disabled={!storeUrl}
              accessibilityRole={storeUrl ? 'link' : 'text'}
              style={[s.notice, { backgroundColor: mustUpdate ? c.accent : c.panel, borderColor: c.accent }]}
            >
              <Text style={[s.noticeText, { color: mustUpdate ? c.onAccent : c.ink }]}>{meta.updateMessage}</Text>
            </Pressable>
          )}
          <Text style={[s.title, { color: c.ink }]} accessibilityRole="header">What’s It To Me?</Text>
          <Text style={[s.lede, { color: c.soft }]}>Politics, in your context. Find the elections where you live and what each result could mean for you.</Text>

          <Text style={[s.label, { color: c.ink }]} nativeID="pcLabel">Your postcode</Text>
          <TextInput
            value={postcode}
            onChangeText={setPostcode}
            onSubmitEditing={look}
            placeholder="e.g. WC1H 9JE"
            placeholderTextColor={c.soft}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="postal-code"
            textContentType="postalCode"
            returnKeyType="search"
            accessibilityLabelledBy="pcLabel"
            style={[s.input, { color: c.ink, backgroundColor: c.panel, borderColor: c.line }]}
          />
          <Pressable
            onPress={look}
            disabled={busy || !postcode.trim() || mustUpdate}
            accessibilityRole="button"
            style={({ pressed }) => [s.button, { backgroundColor: c.accent, opacity: busy || !postcode.trim() ? 0.5 : pressed ? 0.85 : 1 }]}
          >
            {busy ? <ActivityIndicator color={c.onAccent} /> : <Text style={[s.buttonText, { color: c.onAccent }]}>Find my elections</Text>}
          </Pressable>
          <Text style={[s.small, { color: c.soft }]}>Your postcode is used once for this search and is not stored.</Text>

          {result && !result.ok && <Text style={[s.message, { color: c.accent }]} accessibilityLiveRegion="polite">{result.message}</Text>}

          {result && result.ok && (
            <View style={s.results} accessibilityLiveRegion="polite">
              <Text style={[s.h2, { color: c.ink }]} accessibilityRole="header">
                {result.elections.length ? `Coming up in ${result.outcode}` : `No elections are scheduled in ${result.outcode} yet`}
              </Text>
              {result.elections.map((e) => (
                <Pressable
                  key={e.ballot_paper_id}
                  onPress={() => open(e.url ?? result.placeUrl)}
                  accessibilityRole="link"
                  accessibilityHint={e.covered ? 'Opens the ballot and what it means for you' : 'Opens your area page'}
                  style={({ pressed }) => [s.card, { backgroundColor: pressed ? c.line : c.panel, borderColor: c.line }]}
                >
                  <Text style={[s.date, { color: c.accent }]}>{longDate(e.election_date)}</Text>
                  <Text style={[s.cardTitle, { color: c.ink }]}>{e.election_name}</Text>
                  <Text style={[s.small, { color: c.soft }]}>{e.post_label}</Text>
                  <Text style={[s.small, { color: c.soft }]}>
                    {e.covered ? 'See the candidates and what changes for you ›' : 'Not covered yet. See your area ›'}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => open(result.placeUrl)} accessibilityRole="link" style={s.linkRow}>
                <Text style={[s.link, { color: c.accent }]}>What’s happening where you live ›</Text>
              </Pressable>
              <Text style={[s.small, { color: c.soft }]}>Source: {result.source}.</Text>
            </View>
          )}

          <View style={[s.footer, { borderTopColor: c.line }]}>
            <Text style={[s.small, { color: c.soft }]}>
              What’s It To Me? is independent. It does not represent any government, council or political party. Election
              information comes from Democracy Club and official sources, credited on every page.
            </Text>
            <Pressable onPress={() => open('https://whatsittome.org/who-we-are')} accessibilityRole="link" style={s.linkRow}>
              <Text style={[s.link, { color: c.accent }]}>Who we are and how it works ›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  page: { padding: 20, gap: 12 },
  title: { fontSize: 34, fontWeight: '800' },
  lede: { fontSize: 17, lineHeight: 24, marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 14, minHeight: 52, fontSize: 20, letterSpacing: 1 },
  button: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 18, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20 },
  message: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  results: { gap: 12, marginTop: 8 },
  h2: { fontSize: 22, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  date: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  linkRow: { minHeight: 44, justifyContent: 'center' },
  link: { fontSize: 16, fontWeight: '700' },
  notice: { borderWidth: 2, borderRadius: 12, padding: 14 },
  noticeText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  footer: { borderTopWidth: 1, marginTop: 24, paddingTop: 16, gap: 4 },
});
