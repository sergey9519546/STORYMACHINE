// Zod schemas for the main API request bodies.
// Each schema only covers the fields the route handler actually reads;
// extra fields are stripped by default (z.object = strict by default in v3,
// but we use .passthrough() on the outer agent/location items so callers
// can include supplemental data without triggering a validation error).

import { z } from 'zod';
import net from 'net';
import type { Request, Response, NextFunction } from 'express';
import { STORY_OP_KINDS } from '../nvm/ops/StoryOp.ts';
import { TONE_NAME_LIST, GENRE_NAMES } from './genre-router.ts';
import { ARC_TENSION_CURVES, STYLE_MODIFIERS, CHARACTER_ARC_MODES, STRUCTURE_NAMES } from './structure-presets.ts';
import { MAX_FOUNTAIN_CHARS } from './runtime-limits.ts';
// One definition of "what is a character cue" (2026-09-04, guard/analyzer cue
// parity fix; revised same day after independent review found a second gap).
// CUE_INITIAL_CLASS / CUE_LETTER_CLASS are src/lib/fountain.ts's OWN
// cue-alphabet class bodies — the single definition CHARACTER_CUE_RE itself
// is built from and that every other cue test in the repository
// (server/nvm/analyze/screenplay-normalizer.ts) composes rather than
// re-deriving. Unicode-aware (`\p{Lu}\p{Lt}`, the 2026-09-03 Unicode-cue fix)
// and with no length cap. CHARACTER_CUE_RE itself is also imported now — see
// isCueLikeLine's own comment below for why the guard's predicate is
// `CHARACTER_CUE_RE.test(line) || CUE_LIKE_LINE_RE.test(line)` rather than
// either regex alone.
// server/lib/validation.ts sits outside doctor.ts's import graph (verified by
// `node scripts/check-scoring-receipt.mjs` on this range), so importing FROM
// the scoring-reachable src/lib/fountain.ts does not itself touch a
// scoring-path file — fountain.ts is not edited by this change.
import { CHARACTER_CUE_RE, CUE_INITIAL_CLASS, CUE_LETTER_CLASS } from '../../src/lib/fountain.ts';

// ── SSRF-safe outbound URL guard (audit finding S1-a-1, BLOCKER) ────────────
// POST /api/ai-config lets an ANONYMOUS caller set baseUrl/imgBaseUrl/
// ttsBaseUrl/embBaseUrl — server/lib/ai-config.ts's applyConfig()/wireProviders()
// then store them process-globally, and server/lib/ai-providers/openai-compat.ts
// later fetch()es them with the SERVER's own network identity (POST
// /api/ai-config/test fires immediately; every subsequent LLM/embed/image/TTS
// call fires against whatever was last configured, for every session). Without
// a guard, a caller can point any of these at http://169.254.169.254/ (cloud
// instance-metadata — often reachable without auth and a well-known SSRF path
// to stealing cloud credentials) or any other internal-only host, using this
// server as a network pivot, or can silently redirect every user's AI traffic
// to an attacker-controlled endpoint.
//
// This is a LITERAL-FORM guard, not a DNS-aware one: it rejects http(s) URLs
// whose host is already a loopback/link-local/RFC1918/unique-local/reserved
// IP literal, or one of a handful of well-known non-public hostname forms
// (localhost, *.localhost, *.local, *.internal — the last one covers GCP's
// metadata.google.internal). It also rejects non-http(s) schemes and
// userinfo-in-URL (user:pass@host — a classic parser-confusion vector, closed
// here even though Node's URL parser itself extracts hostname correctly).
//
// Residual gap — CLOSED at the fetch site: this validator operates on the URL
// STRING only and does not (and structurally cannot, synchronously, at
// zod-validation time) resolve DNS to check where a public-looking hostname
// currently points, so DNS rebinding — a hostname that resolves to a public IP
// here being repointed to a private IP by the time the fetch connects — could
// not be ruled out by this layer alone. That gap is now closed downstream:
// server/lib/ai-providers/openai-compat.ts's fetchOpenAICompat() resolves DNS
// at the fetch site, re-runs the SAME private-IP policy exported below
// (isPrivateIp) against every resolved address, and pins the TCP connection to
// a validated IP so a mid-flight repoint cannot redirect the socket to a
// private/metadata target. This literal guard remains the first layer (cheap,
// synchronous, blocks the anonymous-caller path at POST /api/ai-config); the
// fetch-site resolve-and-pin is the connection-layer second layer that closes
// rebinding. assertFetchTargetSafe() in openai-compat.ts is the per-hop
// checkpoint that pairs this guard with the fetch site.
const PRIVATE_HOSTNAME_EXACT = new Set(['localhost']);
const PRIVATE_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.internal'];

/** Private-range policy for IPv4 literals. Exported so the fetch-site DNS
 *  resolver (openai-compat.ts) applies the IDENTICAL range policy as this
 *  literal-form guard — no duplicated range tables (drift would be a bypass). */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b, c] = parts;
  if (a === 0) return true;                              // 0.0.0.0/8 ("this network")
  if (a === 10) return true;                              // RFC1918
  if (a === 127) return true;                             // loopback
  if (a === 169 && b === 254) return true;                // link-local incl. cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;        // RFC1918
  if (a === 192 && b === 168) return true;                 // RFC1918
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF protocol assignments / TEST-NET-1
  if (a === 100 && b >= 64 && b <= 127) return true;       // CGNAT (RFC6598)
  if (a === 198 && (b === 18 || b === 19)) return true;    // benchmarking (RFC2544)
  if (a === 198 && b === 51 && c === 100) return true;     // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true;      // TEST-NET-3
  if (a >= 224) return true;                                // multicast (224/4) + reserved (240/4) + broadcast
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  if (norm === '::1' || norm === '::') return true;        // loopback / unspecified
  // Parse the NUMERIC value of the first hextet rather than matching its
  // (possibly zero-trimmed) text: RFC5952 canonical form drops leading zeros
  // within a hextet, so e.g. 'fe8::1' is the value 0x0fe8 — nowhere near
  // fe80::/10 — even though its text happens to start with the same
  // characters as a true fe80::/10 literal. A literal-prefix check would
  // misclassify it as private; comparing the parsed value against the actual
  // range does not.
  const firstHextet = Number.parseInt(norm.split(':', 1)[0] || '0', 16);
  // fe80::/10 link-local: first hextet in 0xfe80–0xfebf.
  if ((firstHextet & 0xffc0) === 0xfe80) return true;
  // fc00::/7 unique-local: first hextet in 0xfc00–0xfdff.
  if ((firstHextet & 0xfe00) === 0xfc00) return true;
  // WHATWG URL canonicalizes dotted IPv4-mapped addresses to two hexadecimal
  // hextets (for example ::ffff:127.0.0.1 → ::ffff:7f00:1). Decode that form
  // before applying the IPv4 private-range policy.
  const v4map = norm.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (v4map) {
    const high = Number.parseInt(v4map[1], 16);
    const low = Number.parseInt(v4map[2], 16);
    const embedded = `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
    return isPrivateIPv4(embedded);
  }
  // The dotted-quad IPv4-mapped form (::ffff:127.0.0.1) is NOT canonicalized
  // by the URL parser on the raw string (only inside a [bracketed] URL host),
  // and dns.lookup()/external inputs can hand it to us verbatim. Decode it too
  // so the IPv4 policy applies uniformly across both mapped-IPv6 representations.
  const v4mapDotted = norm.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4mapDotted) {
    return isPrivateIPv4(v4mapDotted[1]);
  }
  return false;
}

/** Single entry point shared by the literal-form guard above AND the fetch-site
 *  DNS resolver in openai-compat.ts. Applies the IPv4/IPv6 private-range policy
 *  to any address string (IPv4 dotted, IPv6 hextet, or IPv4-mapped IPv6).
 *  Returns true for loopback / link-local / RFC1918 / unique-local / reserved /
 *  multicast — anything that must never be the resolved-and-pinned connect
 *  target of an outbound AI-provider request unless the explicit
 *  AI_ALLOW_PRIVATE_NETWORK_TARGETS override is set. */
export function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) return isPrivateIPv4(address);
  // IPv6 literals here may arrive from dns.lookup() with a scope (fe80::1%eth0)
  // — strip the zone id before the literal comparisons.
  const noScope = address.split('%')[0];
  if (net.isIPv6(noScope)) return isPrivateIPv6(noScope);
  // Bracketed or odd forms: fail closed (treat as private) so a malformed
  // resolved address can never become a pinned connect target.
  return true;
}

export interface SsrfUrlPolicy {
  allowPrivateNetworkTargets?: boolean;
}

/** Returns null when `raw` is a safe public http(s) URL, else a human-readable rejection reason. */
export function ssrfUnsafeUrlReason(raw: string, policy: SsrfUrlPolicy = {}): string | null {
  let u: URL;
  try { u = new URL(raw); } catch { return 'must be a valid URL'; }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return 'must use the http or https scheme';
  }
  if (u.username || u.password) {
    return 'must not contain userinfo (user:pass@host)';
  }

  let hostname = u.hostname.toLowerCase();
  if (hostname.startsWith('[') && hostname.endsWith(']')) hostname = hostname.slice(1, -1);
  // A trailing root-label dot does not change DNS resolution. Normalize FQDNs
  // before matching localhost/internal suffixes so `localhost.` cannot bypass
  // the literal-host guard.
  hostname = hostname.replace(/\.+$/, '');
  if (!hostname) return 'must contain a hostname';

  const allowPrivate = policy.allowPrivateNetworkTargets === true;
  if (net.isIPv4(hostname)) {
    return !allowPrivate && isPrivateIPv4(hostname)
      ? 'must not target a private/loopback/reserved IP address'
      : null;
  }
  if (net.isIPv6(hostname)) {
    return !allowPrivate && isPrivateIPv6(hostname)
      ? 'must not target a private/loopback/reserved IP address'
      : null;
  }
  if (
    !allowPrivate &&
    (PRIVATE_HOSTNAME_EXACT.has(hostname) || PRIVATE_HOSTNAME_SUFFIXES.some(s => hostname.endsWith(s)))
  ) {
    return 'must not target localhost or an internal/.local/.internal hostname';
  }
  // Alternate numeric-IP encodings (plain decimal, e.g. "2130706433" ==
  // 127.0.0.1, or hex, e.g. "0x7f000001") that net.isIPv4 doesn't recognize as
  // a literal but that some underlying resolvers/HTTP stacks still accept and
  // resolve as an IP — reject outright rather than risk a resolver-dependent
  // bypass of the checks above.
  if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
    return 'must not use a raw numeric/hex host address';
  }
  return null;
}

/** z.string().url().max(512) plus the SSRF guard above — shared by every *BaseUrl field on AiConfigSchema. */
function ssrfSafeUrlField() {
  return z.string().url().max(512).superRefine((v: string, ctx: z.RefinementCtx) => {
    const reason = ssrfUnsafeUrlReason(v);
    if (reason) ctx.addIssue({ code: 'custom', message: reason });
  });
}

// ── Fountain pathological-shape guard (defense-in-depth against O(n²) analyzer
// cost, not a content-correctness check) ────────────────────────────────────
// Direct fuzzing of POST /api/scriptide/doctor (attack-lane audit) found two
// independent script shapes that drive the analyzer into quadratic time
// despite sitting comfortably under MAX_FOUNTAIN_CHARS:
//   1. A single very long whitespace-delimited TOKEN. Measured directly
//      against runScriptDoctor: a lone 100,000-char token costs ~4s, a
//      300,000-char token ~37s (~9x for 3x input — clean O(n²)), extrapolating
//      to several CPU-minutes at the 900,000-char ceiling. The SAME total
//      character count broken into ordinary short words costs ~0.1s even at
//      500,000 chars — the cost is specifically the absence of whitespace
//      breaks, not the character count.
//   2. A large number of DISTINCT all-caps character-cue-shaped lines.
//      Measured: 8,000 distinct one-off character names costs ~61s, versus
//      ~0.7s for 8,000 dialogue EXCHANGES between only two distinct names —
//      the cost is driven by distinct-name count, not total dialogue volume.
// Both land inside server/nvm/analyze/fountain-analyzer.ts's tokenizer /
// character-extraction — CLAUDE.md's scoring path (doctor.ts's import graph),
// frozen for this lane. This file is not on that path (no import edge either
// direction), so the smallest correct place is a cheap, single-pass,
// pre-analysis shape check here: reject only shapes no real screenplay could
// ever produce, with orders of magnitude of headroom over legitimate
// content — a real English/hyphenated word is never within three orders of
// magnitude of MAX_FOUNTAIN_TOKEN_CHARS, and a real cast is never within two
// orders of magnitude of MAX_FOUNTAIN_DISTINCT_CUE_LINES — before the request
// ever reaches the analyzer.
//
// 2026-09-04 UPDATE (adversarial audit, reproduced): the DISTINCT-CUE-LINES
// check above originally used its own ASCII-only, 40-char-capped proxy for
// "looks like a cue" (`/^[A-Z0-9 .,'()&\-]{1,40}$/`) instead of the analyzer's
// real cue ALPHABET (CUE_INITIAL_CLASS/CUE_LETTER_CLASS, src/lib/fountain.ts,
// Unicode via `\p{Lu}\p{Lt}`, no length cap). Four shapes the analyzer treats
// as ordinary character cues were therefore invisible to this guard —
// non-ASCII capitals (Cyrillic, Greek, accented Latin), cues containing `#`,
// and cues over 40 chars — and sailed past the 1,500-distinct-cue budget
// straight into the analyzer's O(n²) cost (measured: 2,000 Cyrillic cues,
// HTTP 200 in several seconds, raw and via .fdx). First fix: compose this
// guard's own (deliberately loose) line-shape test from the shared alphabet
// classes rather than maintaining a second, independently-derived alphabet.
//
// 2026-09-04 UPDATE 2 (independent review, same day): the hand-composed class
// above was STILL an independently-derived grammar, and it under-counted a
// real cue shape — it omitted the dual-dialogue `^` marker (`\s*\^?\s*`) that
// CHARACTER_CUE_RE itself accepts (src/lib/fountain.ts:139 — "Character names
// are all caps, optionally ending with ^ for dual dialogue"). 2,000 distinct
// `PERSON<i>^` cues reached the analyzer unrejected (HTTP 200 in several
// seconds). The lesson: widening the alphabet and then hand-writing the rest
// of the grammar again is the same mistake one level up — a second,
// independently-maintained cue grammar can ALWAYS drift from the first one,
// no matter how carefully it is composed. Fixed by making the guard's
// predicate a PROVABLE superset of the parser's own cue test by
// construction — `isCueLikeLine` below is `CHARACTER_CUE_RE.test(line) ||
// CUE_LIKE_LINE_RE.test(line)`, so anything CHARACTER_CUE_RE — the parser's
// cue test — accepts is a cue to the guard by definition, regardless of what
// CUE_LIKE_LINE_RE's own hand-picked class does or doesn't cover —
// CUE_LIKE_LINE_RE only widens beyond CHARACTER_CUE_RE (Unicode capitals no
// length cap, plus the extra punctuation below), it is never relied on to
// narrow it.
// tests/security/fountain-shape-guard-cue-parity.test.ts's implication test
// enumerates CHARACTER_CUE_RE's grammar as a product (script × caret
// spelling × (V.O.)/(O.S.)/(CONT'D) tail × length) and asserts
// CHARACTER_CUE_RE.test(line) ⇒ isCueLikeLine(line) over the whole product,
// so this guarantee is checked, not merely asserted by the `||`.
//
// 2026-09-04 UPDATE 3 (independent review, same day): MAX_FOUNTAIN_DISTINCT_CUE_LINES
// bounds distinct cue VOCABULARY, not analyzer COST — the analyzer's cost is
// driven by cue-shaped-line volume (distinct lines × how often each repeats),
// so 1,500 distinct cues repeated many times is legal under that bound alone
// and was measured, unchanged by this file, to cost 39s at 20 repeats
// (517,817 chars) and to not return at all at 34 repeats (778,277 chars, 87%
// of MAX_FOUNTAIN_CHARS). Measured directly against runScriptDoctor (in
// process, no HTTP/worker-pool overhead), a distinct-count x repeat-count
// grid:
//
//   distinct repeats occurrences  chars     ms   distinct*occurrences
//         50       1          50    957     34                  2,500
//         50       5         250  4,717     46                 12,500
//         50      20       1,000 18,817    217                 50,000
//        200       1         200  3,907     76                 40,000
//        200       5       1,000 19,467    284                200,000
//        200      20       4,000 77,817    772                800,000
//        800       1         800 15,907    651                640,000
//        800       5       4,000 79,467  1,994              3,200,000
//        800      20      16,000 317,817 8,858             12,800,000
//      1,500       1       1,500 30,407  2,669              2,250,000
//      1,500       5       7,500 151,967 9,431             11,250,000
//      1,500      20      30,000 607,817 32,684             45,000,000
//
// distinct*occurrences ("weight") tracks cost reasonably at LOW average
// repeats-per-cue but is NOT the true cost driver — a second independent
// review (2026-09-05) walked the weight~9.9M iso-curve and found the guard
// REJECTING a 31s payload (distinct=1,500 x occurrences=30,000) while
// ACCEPTING a 216s one (distinct=400 x occurrences=24,750, same ~9.9M
// weight) — a 21x cost difference at IDENTICAL weight. Re-measured directly
// against runScriptDoctor, holding distinct FIXED and varying only
// occurrences (the axis the first grid never isolated), and separately
// holding occurrences FIXED and varying distinct:
//
//   distinct=400, varying occurrences (uniform: every cue repeats equally):
//     occurrences  chars     ms       ratio(occ/distinct)
//           2,000   39,467     551          5.0
//           5,000   98,587   1,634         12.5
//          10,000  197,267   2,922         25.0
//          11,000  216,937   3,610         27.5
//          12,000  ~236,600  >90,000       30.0   <- danger
//          15,000  295,837  131,459        37.5
//
//   distinct=200, varying occurrences:
//     occurrences  chars     ms       ratio(occ/distinct)
//           4,000   77,817     854         20.0
//           5,000   97,267   1,044         25.0
//           6,000  116,717  29,987         30.0   <- danger
//          10,000  194,517  38,872         50.0
//
//   occurrences=6,000 FIXED, varying distinct (the axis that finally
//   falsified a pure "ratio" theory — cost is NOT monotonic in either
//   variable alone):
//     distinct  ratio(occ/distinct)  ms
//           50          120.0        5,045   safe
//          100           60.0       11,604   danger (borderline)
//          150           40.0       19,570   danger
//          200           30.0       29,987   danger
//          400           15.0        1,953   safe
//
// Neither "distinct x occurrences" nor "occurrences / distinct" alone
// separates safe from dangerous here — cost peaks somewhere in a MIDDLE band
// of distinct (roughly 100-400 in this environment) once enough of those
// cue lines repeat often, and is lower on EITHER side of that band even at
// a higher ratio (distinct=50 at ratio=120 is fine; distinct=400 at
// ratio=15 is fine). This environment is also measurably noisy — the
// IDENTICAL distinct=100/occurrences=4,000 payload measured 485ms in one
// run and 8,937ms in another (both this lane and the 2026-09-05 review note
// load averages of 10-16 on a 4-CPU box) — so chasing an exact numeric
// cliff on this cost surface is chasing noise as much as signal.
//
// What IS robust, because it is a STRUCTURAL property of the input rather
// than a numeric threshold on a noisy surface: every dangerous shape found
// (by this lane and by the review) has MANY distinct cue lines that EACH
// repeat often, simultaneously — a uniform cast where every "character"
// is equally talkative. No real script looks like that: a real cast has a
// small number of leads who carry most of the dialogue and many
// one-or-two-line minors, which is exactly why a real 219-line two-hander
// scene in this repo's own fixtures
// (`tests/fixtures/blind-pairs/low-tide-bad.fountain`, 2 distinct cue lines,
// PAUL x25 + JUNE x24) has a HIGH occurrences-per-distinct ratio (24.5) yet
// is obviously safe — an earlier revision of this bound used exactly that
// ratio, AVERAGED across all distinct lines, and it flagged this real
// fixture, because an average of 2 numbers close together says nothing
// about "how many characters are frequent", only "how frequent are the
// ones that exist". MAX_FOUNTAIN_FREQUENT_CUE_LINES below caps the COUNT of
// distinct cue lines that individually exceed FREQUENT_CUE_OCCURRENCE_THRESHOLD
// occurrences — i.e. how many "major" speaking parts the vocabulary bound's
// 1,500-line ceiling is letting through — rather than any average or
// product, so a script with 2 (or 20, or 40) talkative characters and
// hundreds of one-line minors is unaffected regardless of how many times
// the majors individually speak, while a script built entirely from
// uniformly-frequent "characters" (the shape every dangerous case above
// shares) is rejected once too many of them cross the threshold at once.
// MAX_FOUNTAIN_CUE_WEIGHT (10,000,000) is KEPT alongside it — it still
// catches the complementary corner this bound does not: high distinct at
// LOW per-line frequency (e.g. distinct=1,500 at ~7 occurrences each is
// weight=15.75M, over the weight bound, but only 0 lines would cross a
// 15-occurrence "frequent" threshold) — the two bounds are not redundant.
//
// Original distinct x repeat-count grid (kept for the record — it is what
// this file's weight bound was originally, and still is partly, calibrated
// against; it just never sampled the corners above):
//   distinct repeats occurrences  chars     ms   distinct*occurrences
//         50       1          50    957     34                  2,500
//         50       5         250  4,717     46                 12,500
//         50      20       1,000 18,817    217                 50,000
//        200       1         200  3,907     76                 40,000
//        200       5       1,000 19,467    284                200,000
//        200      20       4,000 77,817    772                800,000
//        800       1         800 15,907    651                640,000
//        800       5       4,000 79,467  1,994              3,200,000
//        800      20      16,000 317,817 8,858             12,800,000
//      1,500       1       1,500 30,407  2,669              2,250,000
//      1,500       5       7,500 151,967 9,431             11,250,000
//      1,500      20      30,000 607,817 32,684             45,000,000
//
// Measured (tests/security/fountain-shape-guard-cue-parity.test.ts's own
// "margin proof" describe block, numbers logged on every run, against the
// FINAL three-bound design): a synthesized PLAUSIBLE feature-length script —
// majors and minors in a realistic skewed distribution, (V.O.)/(O.S.)/
// (CONT'D) extension variants, caps-heavy action — clears all three bounds;
// see that test's own log line for the exact numbers.
export const MAX_FOUNTAIN_TOKEN_CHARS = 2_000;
export const MAX_FOUNTAIN_DISTINCT_CUE_LINES = 1_500;
// Cost bound, not a vocabulary bound: distinct cue-shaped lines multiplied by
// TOTAL cue-shaped line occurrences (every matching line counts, not just
// first-seen ones) must not exceed this. Checked incrementally in the same
// single pass as MAX_FOUNTAIN_DISTINCT_CUE_LINES, so a payload that would
// blow this budget is rejected as soon as the running product crosses it.
// Kept alongside MAX_FOUNTAIN_FREQUENT_CUE_LINES below — see the grid
// comment above for why neither bound alone is sufficient.
export const MAX_FOUNTAIN_CUE_WEIGHT = 10_000_000;
// A cue-shaped line counts as "frequent" once it occurs more than this many
// times — the threshold at which a recurring name starts looking like an
// actual speaking part rather than a one-off. Deliberately low relative to
// how much a real LEAD speaks (a protagonist easily clears 100+ lines in a
// feature) — this threshold is not trying to say "this many lines makes you
// a major character", only "this many identical lines is enough repetition
// to count toward the budget below at all".
export const FREQUENT_CUE_OCCURRENCE_THRESHOLD = 15;
// Cost bound: the COUNT of distinct cue-shaped lines that are each
// "frequent" (see FREQUENT_CUE_OCCURRENCE_THRESHOLD) must not exceed this —
// see the grid comment above for why this, not an average or a product, is
// the bound the 2026-09-05 review's iso-weight-curve finding required. A
// real large-ensemble feature can comfortably have dozens of characters
// who individually clear the frequency threshold; no real script has
// HUNDREDS of them, which is the shape every measured-dangerous payload
// shares. Checked incrementally (a cue line crossing the frequency
// threshold is a one-way transition — once frequent, always frequent for
// the rest of the scan — so, unlike an average, this can never need to
// un-fire once it has fired), so a pathological payload is rejected as soon
// as it crosses this budget, not only after the full document is scanned.
export const MAX_FOUNTAIN_FREQUENT_CUE_LINES = 50;
// Bounded quantifier on a single character class — not nested/overlapping
// quantifiers, so this cannot itself become a catastrophic-backtracking
// pattern regardless of input length.
const HUGE_TOKEN_RE = new RegExp(`\\S{${MAX_FOUNTAIN_TOKEN_CHARS + 1},}`);
// A deliberately loose, cheap proxy for "looks like a character cue": a
// trimmed line beginning with a cased-script capital (CUE_INITIAL_CLASS) and
// continuing with cue letters/marks, digits, or a small set of punctuation a
// real cue line can carry (space/tab, `.` `,` `'` `(` `)` `&` `/` `#` `-`) —
// deliberately WIDER than the parser's own CHARACTER_CUE_RE test in
// punctuation (which permits none of `,` `(` `)` `&` `/` in its continuation
// class) and with no length cap, because on its own this guard only needs to
// OVER-count real character cues, never under-count the pathological case.
// It is NOT, on its own, a superset of CHARACTER_CUE_RE — it is missing the
// caret (`\s*\^?\s*`) and the (V.O.)/(O.S.)/(CONT'D) tail CHARACTER_CUE_RE
// explicitly admits, which is exactly the gap the 2026-09-04 independent
// review found (see UPDATE 2 above). isCueLikeLine below is what closes that
// gap, by construction rather than by trying to enumerate every optional
// tail by hand a second time.
// Exported (only) so tests can prove the `||` in isCueLikeLine below is load-
// bearing — i.e. that CUE_LIKE_LINE_RE alone is NOT already a superset of
// CHARACTER_CUE_RE (the caret shape is the proof) — never call this directly
// from route/validation code; call isCueLikeLine.
export const CUE_LIKE_LINE_RE = new RegExp(
  `^[${CUE_INITIAL_CLASS}][${CUE_LETTER_CLASS}0-9 \\t.,'()&/#\\-]*$`,
  'u',
);
// The guard's actual line-shape predicate: a PROVABLE superset of
// CHARACTER_CUE_RE (src/lib/fountain.ts) by construction (the `||` includes
// it as a full disjunct), so this guard structurally cannot under-count
// anything the PARSER's own cue test (CHARACTER_CUE_RE) accepts as a cue —
// independent of whether CUE_LIKE_LINE_RE's own hand-picked class happens to
// cover the same shape. (Two OTHER cue predicates exist in this repo —
// server/nvm/analyze/screenplay-normalizer.ts's isCharacterCue and
// server/nvm/analyze/fountain-analyzer.ts's CUE_LINE_RE — and both also
// accept a lowercase parenthetical tail, e.g. "NAME (cont'd)", that this
// guard does not count. Measured (2026-09-05 review): that shape is NOT a
// cost vector — 1,000/2,000/4,000 such lines cost a flat ~0.4-1.9s, nowhere
// near quadratic — so CHARACTER_CUE_RE, the one predicate that DOES carry
// the O(n²) cost this guard exists to block, is the correct disjunct to be a
// superset of.) CUE_LIKE_LINE_RE still does useful work here — its wider
// punctuation class and lack of the next-line-is-dialogue context check mean
// it over-counts MORE than CHARACTER_CUE_RE alone would (e.g. a lone
// `(CONT'D)`-suffixed line with no following dialogue), which is the guard's
// own deliberately conservative direction.
export function isCueLikeLine(line: string): boolean {
  return CHARACTER_CUE_RE.test(line) || CUE_LIKE_LINE_RE.test(line);
}
const SCENE_HEADING_PREFIX_RE = /^(INT|EXT|EST|I\/E)[. ]/;

/** Returns null when `text` has no known pathological-cost shape, else a
 *  human-readable rejection reason. O(length) single pass; safe to run on
 *  the full MAX_FOUNTAIN_CHARS ceiling. */
export function fountainShapeRejectionReason(text: string): string | null {
  if (HUGE_TOKEN_RE.test(text)) {
    return `must not contain a single unbroken run of more than ${MAX_FOUNTAIN_TOKEN_CHARS} non-whitespace characters`;
  }
  const lines = text.split('\n');
  // Maps each distinct cue-shaped line to how many times it has occurred so
  // far -- the Map's size is the same "distinct vocabulary" count the old
  // Set gave, and each value is what MAX_FOUNTAIN_FREQUENT_CUE_LINES below
  // counts against its own threshold.
  const cueLineCounts = new Map<string, number>();
  let cueLineOccurrences = 0;
  let frequentCueLineCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.length === 0 || SCENE_HEADING_PREFIX_RE.test(line)) continue;
    if (!isCueLikeLine(line)) continue;
    // Context check (2026-09-05 review finding R4, widened same day for a
    // second review's DOUBLE-SPACED bypass): a line only becomes a
    // 'character' block to the ANALYZER if it is followed by dialogue —
    // but "followed by" is not just "immediately followed by non-blank".
    // server/nvm/analyze/screenplay-normalizer.ts's normalizeScreenplay()
    // runs BEFORE the analyzer's own parseFountain on every request (it is
    // idempotent on already-clean input), and it REFLOWS a double-spaced
    // script — `NAME\n\nline\n\n`, the exact shape real PDF/FDX imports
    // produce, which is the whole reason isDoubleSpaced/normalizeScreenplay
    // exist — into a normal adjacent cue+dialogue pair before the parser
    // ever sees it. The FIRST version of this check tested only the
    // immediately-next line, so a double-spaced pathological payload
    // (thousands of distinct double-spaced cue names) counted ZERO cues
    // here (guard: ACCEPT) while normalizeScreenplay + parseFountain saw
    // every one of them as a real 'character' block downstream — measured:
    // a 154,954-byte double-spaced payload (distinct=600, occurrences=
    // 12,000, 15% of MAX_FOUNTAIN_CHARS) answered HTTP 200 in 90,575 ms.
    // ("all have real dialogue immediately following" was therefore a false
    // claim about the double-spaced shape specifically — it does not.)
    //
    // Fixed by admitting a second shape: a cue followed by ANY number of
    // consecutive blank lines and then non-blank content — but ONLY when
    // that content does not ITSELF look cue-shaped. That second clause is
    // what keeps this from re-opening the R4 hole: a double-spaced cue's
    // dialogue is ordinary mixed-case prose (never matches isCueLikeLine),
    // while the R4 caps-heavy-action fixture's shape is a chain of
    // ALL-CAPS emphasis lines each separated by blank lines — i.e. the
    // "content" after the blank run is ANOTHER cue-shaped line, not
    // dialogue, so it is correctly excluded by this same clause.
    //
    // 2026-09-05 UPDATE (third independent review, same day): the FIRST
    // version of this fix probed only lines[i+1]/lines[i+2] — i.e. it
    // re-admitted a gap of EXACTLY one blank line. isDoubleSpaced
    // (server/nvm/analyze/screenplay-normalizer.ts) fires on ANY gap >= 1
    // and normalizeScreenplay's reflow FILTERS OUT EVERY BLANK LINE before
    // re-blocking the script (`lines = allLines.filter(l => l.trim() !==
    // '')`) — so a cue separated from its dialogue by 2, 3, or more blank
    // lines is reflowed and parsed as a real cue by the actual pipeline
    // exactly the same as a 1-blank-line gap, and was STILL invisible to
    // the fixed-offset probe. Measured: a 2-blank-line-gap payload
    // (distinct=600, occurrences=12,000, 203 KB) was guard-accepted;
    // POST /api/scriptide/doctor answered 200 in 85,388 ms. Fixed by
    // replacing the fixed i+1/i+2 probe with a forward scan over every
    // consecutive blank line to the next non-blank one, at whatever
    // distance that turns out to be — the exclusion clause (target line
    // must not itself be cue-shaped) is unchanged and still does the same
    // job for any gap width.
    const immediateDialogue = i < lines.length - 1 && lines[i + 1]!.trim() !== '';
    let nextLineIsDialogue = immediateDialogue;
    if (!nextLineIsDialogue) {
      // lines[i+1] is blank (or i is the last line) — scan past every
      // consecutive blank line to the first non-blank one, at whatever
      // distance that is. Only THIS blank-gap path applies the
      // not-cue-shaped exclusion; the immediate (gap=0) case above matches
      // the real parser's own condition exactly (any non-blank line, no
      // content test), so it is never narrowed by this heuristic.
      let j = i + 1;
      while (j < lines.length && lines[j]!.trim() === '') j++;
      nextLineIsDialogue = j < lines.length && !isCueLikeLine(lines[j]!.trim());
    }
    if (!nextLineIsDialogue) continue;
    const occurrencesOfThisLine = (cueLineCounts.get(line) ?? 0) + 1;
    cueLineCounts.set(line, occurrencesOfThisLine);
    cueLineOccurrences++;
    if (cueLineCounts.size > MAX_FOUNTAIN_DISTINCT_CUE_LINES) {
      return `must not contain more than ${MAX_FOUNTAIN_DISTINCT_CUE_LINES} distinct all-caps character-cue-shaped lines`;
    }
    if (cueLineCounts.size * cueLineOccurrences > MAX_FOUNTAIN_CUE_WEIGHT) {
      return `must not contain more than ${MAX_FOUNTAIN_CUE_WEIGHT} in (distinct all-caps character-cue-shaped lines \u00d7 total occurrences of one) \u2014 bound MAX_FOUNTAIN_CUE_WEIGHT, a cost bound distinct from the ${MAX_FOUNTAIN_DISTINCT_CUE_LINES}-line vocabulary bound above`;
    }
    // A one-way transition (this line just became "frequent" for the first
    // time this scan) -- see MAX_FOUNTAIN_FREQUENT_CUE_LINES's own comment
    // for why that makes an incremental check here safe.
    if (occurrencesOfThisLine === FREQUENT_CUE_OCCURRENCE_THRESHOLD + 1) {
      frequentCueLineCount++;
      if (frequentCueLineCount > MAX_FOUNTAIN_FREQUENT_CUE_LINES) {
        return `must not contain more than ${MAX_FOUNTAIN_FREQUENT_CUE_LINES} distinct all-caps character-cue-shaped lines that each occur more than ${FREQUENT_CUE_OCCURRENCE_THRESHOLD} times \u2014 bound MAX_FOUNTAIN_FREQUENT_CUE_LINES, a cost bound on how many DIFFERENT cue-shaped lines repeat often, distinct from the vocabulary and product bounds above`;
      }
    }
  }
  return null;
}

/** z.string().min(1).max(MAX_FOUNTAIN_CHARS) plus the pathological-shape guard
 *  above — shared by every route that hands raw Fountain text to the
 *  analyzer. `min`/`max` mirror the exact bounds each call site used before
 *  (all currently min(1).max(MAX_FOUNTAIN_CHARS)), so this is a drop-in. */
function fountainField() {
  return z.string().min(1).max(MAX_FOUNTAIN_CHARS).superRefine((v: string, ctx: z.RefinementCtx) => {
    const reason = fountainShapeRejectionReason(v);
    if (reason) ctx.addIssue({ code: 'custom', message: reason });
  });
}

// ── Post-conversion pathological-shape guard (the fdx/pdf-upload bypass) ────
// fountainField()'s superRefine above only ever sees the RAW `fountain` field
// a caller POSTs directly — validate() runs it against req.body BEFORE the
// route handler exists, so it structurally cannot see text that a route
// produces afterward by converting an uploaded `fdx` (server/lib/fdx-import.ts's
// fdxToFountain) or PDF (server/lib/pdf-import.ts's pdfToFountain) into
// Fountain. Every one of those conversions used to hand its output straight
// to the analyzer with NO shape check at all — the exact two O(n²) shapes
// fountainField() blocks on the raw-fountain path (a single huge unbroken
// token; thousands of distinct all-caps character-cue-shaped lines — see
// fountainShapeRejectionReason's header) reach the analyzer completely
// unguarded from an uploaded .fdx or .pdf, because an attacker types the
// pathological shape into the SOURCE document and the converter just relays
// it through as Fountain. This is the single shared implementation every
// conversion call site (server/routes/scriptide.ts, coverage-letter.ts,
// export.ts) uses — see each call site's own comment for why it belongs
// there and not inside doctor.ts (scoring path, out of scope for this lane).
//
// Returns true (and has already written the 400) when `fountain` must be
// rejected, so a call site can `if (rejectPathologicalConvertedFountain(res, converted.fountain)) return;`
// immediately after its existing "conversion produced an empty script" check.
// The response body matches validate()'s own shape exactly (`{ error:
// 'fountain: <reason>' }`) so a caller cannot tell whether the raw-fountain
// zod path or this post-conversion path caught the same shape.
export function rejectPathologicalConvertedFountain(res: Response, fountain: string): boolean {
  const reason = fountainShapeRejectionReason(fountain);
  if (reason) {
    res.status(400).json({ error: `fountain: ${reason}` });
    return true;
  }
  return false;
}

// ── Re-usable leaf schemas ───────────────────────────────────────────────────

const sessionIdField = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,64}$/)
  .optional();

// Same shape as sessionIdField and server/collab/yjs-server.ts's ROOM_RE —
// collab room ids are a safe, bounded token used to build a WebSocket URL path.
const roomIdField = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);

const LocationItemSchema = z
  .object({
    location_id: z.string().min(1).max(64),
    name: z.string().min(1).max(256),
    description: z.string().max(2000).default(''),
    adjacent_locations: z.array(z.string().max(64)).max(10).default([]),
  })
  .passthrough();

// ── Psychology substrate schemas (Fix B — audit: /api/init silently dropped
// darkTriad/bigFive/attachmentStyle/defenseMechanisms/goalStack) ─────────────
// Shapes mirror server/engine/types.ts exactly (DarkTriad, BigFive,
// AttachmentStyle, DefenseMechanism, GoalStack) so a payload that passes this
// schema is guaranteed to be assignable straight onto a CharacterSheet with no
// further coercion needed at the handler.

export const DarkTriadFieldSchema = z.object({
  machiavellianism: z.number().min(0).max(100),
  narcissism: z.number().min(0).max(100),
  psychopathy: z.number().min(0).max(100),
}).passthrough();

export const BigFiveFieldSchema = z.object({
  openness: z.number().min(0).max(100),
  conscientiousness: z.number().min(0).max(100),
  extraversion: z.number().min(0).max(100),
  agreeableness: z.number().min(0).max(100),
  neuroticism: z.number().min(0).max(100),
}).passthrough();

// Matches server/engine/types.ts's AttachmentStyle union exactly.
export const AttachmentStyleFieldSchema = z.enum(['secure', 'anxious', 'avoidant', 'anxious_avoidant']);

// Matches server/engine/types.ts's DefenseMechanism union exactly.
export const DefenseMechanismFieldSchema = z.enum([
  'rationalization', 'intellectualization', 'projection', 'displacement',
  'denial', 'dissociation', 'repression',
]);

export const GoalFieldSchema = z.object({
  id: z.string().min(1).max(128),
  description: z.string().min(1).max(500),
  value: z.number().min(0).max(100),
  achieved: z.boolean(),
  depends_on: z.array(z.string().max(128)).max(20).optional(),
  priority: z.number().optional(),
}).passthrough();

export const GoalStackFieldSchema = z.object({
  terminal: GoalFieldSchema,
  instrumental: z.array(GoalFieldSchema).max(20).default([]),
  last_planned_at: z.number().default(0),
}).passthrough();

// Character display names: non-empty after trim, bounded length.
// Used by AgentItemSchema and CharacterProfileBodySchema so empty/whitespace
// names never reach scenario builders or prompt assembly.
export const CharacterNameSchema = z
  .string()
  .min(1, 'name cannot be empty')
  .max(80, 'name too long')
  .refine(s => s.trim().length > 0, { message: 'name cannot be blank' });

const AgentItemSchema = z
  .object({
    char_id: z.string().min(1).max(64),
    name: CharacterNameSchema,
    public_mask: z.string().max(2000).default(''),
    hidden_motive: z.string().max(2000).default(''),
    knowledge_vector: z.array(z.string().max(500)).max(50).default([]),
    suspicion_score: z.number().min(0).max(100).default(0),
    current_location_id: z.string().max(64).default(''),
    // Fix B: previously accepted by ScenarioBuilder's UI (Dark-Triad sliders,
    // attachment dropdown) but silently discarded by /api/init's handler —
    // now validated here (400 on malformed values, e.g. an unknown
    // attachmentStyle) and threaded through to the registered CharacterSheet
    // in server/routes/game.ts.
    darkTriad: DarkTriadFieldSchema.optional(),
    bigFive: BigFiveFieldSchema.optional(),
    attachmentStyle: AttachmentStyleFieldSchema.optional(),
    defenseMechanisms: z.array(DefenseMechanismFieldSchema).max(7).optional(),
    goalStack: GoalStackFieldSchema.optional(),
  })
  .passthrough();

// ── Exported route schemas ───────────────────────────────────────────────────

export const InitBodySchema = z.object({
  sessionId: sessionIdField,
  nodes: z.array(LocationItemSchema).max(50).optional(),
  agents: z.array(AgentItemSchema).max(50).optional(),
});

export const TurnBodySchema = z.object({
  sessionId: sessionIdField,
  agentId: z.string().min(1).max(128),
});

export const RunRoomBodySchema = z.object({
  sessionId: sessionIdField,
  nodeId: z.string().min(1).max(128),
  maxTurns: z.number().int().min(1).max(50).optional(),
});

// POST /api/run-scene — Fix D: exposes the previously-dormant
// Orchestrator.runFullScene (multi-room orchestration). locationIds is capped
// at 8 (vs. RunRoomBodySchema's single nodeId) because each room fans out to
// several LLM calls per round, and runFullScene runs every listed room every
// round — an unbounded list would let one request multiply that fan-out
// arbitrarily. roundsPerRoom maps onto runFullScene's `turnsPerRoom` argument
// (how many turns each room gets per full-scene round); capped tighter than
// RunRoomBodySchema.maxTurns (50) for the same fan-out-budget reason.
export const RunSceneBodySchema = z.object({
  sessionId: sessionIdField,
  locationIds: z.array(z.string().min(1).max(128)).min(1).max(8),
  roundsPerRoom: z.number().int().min(1).max(12).optional(),
});

// A reset is a simulation-only destructive operation. Keep its contract
// intentionally small and reject misspelled fields before the route can create
// a recovery artifact or clear any simulation state.
export const ResetBodySchema = z.object({
  sessionId: sessionIdField,
}).strict();

// The legacy JSON session importer is retired. Its body carries no semantics;
// keeping this body-agnostic lets every syntactically valid JSON request reach
// the unconditional, non-mutating 410 tombstone instead of falsely suggesting
// that some snapshot shapes are still restoreable.
export const ImportBodySchema = z.unknown();

export const AiConfigSchema = z.object({
  provider:    z.enum(['gemini', 'openai-compat']).optional(),
  baseUrl:     ssrfSafeUrlField().optional(),
  apiKey:      z.string().max(512).optional(),
  model:       z.string().max(256).optional(),
  fastModel:   z.string().max(256).optional(),
  imgProvider: z.enum(['gemini', 'openai-compat', 'none']).optional(),
  imgBaseUrl:  ssrfSafeUrlField().optional(),
  imgApiKey:   z.string().max(512).optional(),
  imgModel:    z.string().max(256).optional(),
  ttsProvider: z.enum(['gemini', 'openai-compat', 'none']).optional(),
  ttsBaseUrl:  ssrfSafeUrlField().optional(),
  ttsApiKey:   z.string().max(512).optional(),
  ttsModel:    z.string().max(256).optional(),
  ttsVoice:    z.string().max(64).optional(),
  embProvider: z.enum(['gemini', 'openai-compat', 'none']).optional(),
  embBaseUrl:  ssrfSafeUrlField().optional(),
  embApiKey:   z.string().max(512).optional(),
  embModel:    z.string().max(256).optional(),
});

// M8: Beat outline validation — each beat's text fields are capped and
// checked for control characters before they're stored and later injected
// into agent prompts.  Combined with C1 sanitizeForPrompt() at write-time.
const CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0d\x0e-\x1f\x7f]/;
const noControlChars = z.string().refine(s => !CONTROL_CHARS_RE.test(s), {
  message: 'must not contain control characters',
});

export const OutlineBeatSchema = z.object({
  phase: z.enum(['Setup', 'Turn', 'Prestige']),
  turn_start: z.number().int().min(0),
  turn_end: z.number().int().min(0),
  goal:        noControlChars.max(500).default(''),
  constraint:  noControlChars.max(500).default(''),
  avoid:       noControlChars.max(500).default(''),
  title:       noControlChars.max(256).default('').optional(),
  description: noControlChars.max(1000).default('').optional(),
}).passthrough().refine(
  b => b.turn_end >= b.turn_start,
  { message: 'turn_end must be >= turn_start', path: ['turn_end'] },
);

export const OutlineBodySchema = z.object({
  beats: z.array(OutlineBeatSchema).max(50),
});

// ── Collaboration rooms (share-link capability model) ───────────────────────
// SUPERSEDED DESIGN, kept here because the old comment was load-bearing and
// wrong: this schema used to accept `{ room }` — ANY syntactically-valid room
// NAME — and server/routes/collab.ts minted an HMAC join token for it to any
// caller. The stated justification was a bearer-capability model ("knowledge
// of the room name is the authorization to join it"), but the room name was
// writer-typed free text (`draft`, a film title) generated client-side, so
// the "secret" was guessable and an attacker could simply ask for a token for
// the room they wanted and sync the whole unpublished Y.Doc. See
// docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md §4.
//
// The capability is now a SERVER-minted, unguessable room id
// (server/lib/collab-rooms.ts — 128 bits of CSPRNG entropy). The writer's
// typed name never reaches the server; it stays a local label in the UI. A
// room must be created before a token can be minted for it, so guessing a
// name buys nothing. The regex still matches server/collab/yjs-server.ts's
// ROOM_RE exactly, so this validator and the WebSocket-upgrade check can
// never accept/reject different sets of ids.
//
// `sessionId` is accepted (optional) purely because server/lib/session-store.ts's
// sessionId(req) reads req.body.sessionId for non-GET requests — the routes
// need the caller's session for their per-session budgets. Both routes reject
// a caller with no session id at all rather than lumping every anonymous
// caller into the shared 'default' budget bucket.
const collabSessionIdField = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).optional();

/** POST /api/collab/rooms — takes no room input at all; the id is minted. */
export const CollabRoomCreateBodySchema = z
  .object({ sessionId: collabSessionIdField })
  .or(z.undefined());

/** POST /api/collab/token — mints a join token for an EXISTING minted id. */
export const CollabTokenBodySchema = z.object({
  roomId: roomIdField,
  sessionId: collabSessionIdField,
});

// POST /api/story-tone (B1-a — Genre Engine Expansion). Mirrors the shape of
// the existing story-genre route's validation intent (reject anything not in
// the known name list with a clean 400), but expressed as a proper zod schema
// against TONE_NAME_LIST (server/lib/genre-router.ts) — the single source of
// truth for the 16 tone registers — so a stray/misspelled tone never reaches
// server/routes/config.ts's handler.
export const StoryToneSchema = z.object({
  tone: z.enum(TONE_NAME_LIST),
});

// ── Story architecture config schemas (W4 validation-completeness audit) ────
// These six routes previously validated their single enum-ish field with an
// inline `if (!x || !VALID.includes(x))` check repeated at each route
// (server/routes/config.ts) instead of going through validate()/zod like
// their sibling /api/story-tone. Same contract, same 400 shape, now enforced
// the same way — each schema's enum is built from the SAME Object.keys(...)
// list the route itself used to construct its inline VALID array, so the
// accepted value set is unchanged.

export const PacingTargetBodySchema = z.object({
  target: z.enum(['slow', 'medium', 'fast']),
});

export const EmotionalArcBodySchema = z.object({
  arc: z.string().refine(k => k in ARC_TENSION_CURVES, {
    message: `arc must be one of: ${Object.keys(ARC_TENSION_CURVES).join(', ')}`,
  }),
});

export const DirectorStyleBodySchema = z.object({
  style: z.string().refine(k => k in STYLE_MODIFIERS, {
    message: `style must be one of: ${Object.keys(STYLE_MODIFIERS).join(', ')}`,
  }),
});

export const StoryGenreBodySchema = z.object({
  genre: z.string().refine(k => k in GENRE_NAMES, {
    message: `genre must be one of: ${Object.keys(GENRE_NAMES).join(', ')}`,
  }),
});

export const CharacterArcModeBodySchema = z.object({
  mode: z.string().refine(k => k in CHARACTER_ARC_MODES, {
    message: `mode must be one of: ${Object.keys(CHARACTER_ARC_MODES).join(', ')}`,
  }),
});

// POST /api/story-theme — free-text theme, sanitized (sanitizeForPrompt) at
// the route AFTER this schema only bounds the raw shape (must be a string;
// the route's own sanitizeForPrompt(raw.trim(), 500) call remains the single
// source of truth for the final stored/prompt-injected value, so the cap
// here is intentionally generous — large enough to never be the thing that
// truncates, matching how DoctorBodySchema's 900_000 relates to its route's
// own behavior).
export const StoryThemeBodySchema = z.object({
  theme: z.string().max(5000),
});

// POST /api/outline/apply-preset — `structure` mirrors the other five routes
// above; `expectedTurns` keeps the route's own clamp
// (Math.max(4, Math.min(200, Number(expectedTurns) || 20))) as the sole
// source of truth for out-of-range values, so this only rejects the
// non-numeric shapes that clamp was never designed to rescue silently.
export const ApplyPresetBodySchema = z.object({
  structure: z.string().refine(k => k in STRUCTURE_NAMES, {
    message: `structure must be one of: ${Object.keys(STRUCTURE_NAMES).join(', ')}`,
  }),
  expectedTurns: z.number().optional(),
});

// ── NVM route schemas (audit M2.3) ───────────────────────────────────────────
// These routes previously relied on ad-hoc inline `typeof`/`Array.isArray`
// checks scattered through server/routes/nvm.ts. Schemas here match what each
// handler already assumed — deliberately loose (`.passthrough()` / `z.unknown()`)
// on complex domain objects (NarrativeTransitionIR, RevealPlan, FixedPoint,
// SceneTarget, StoryOp) that the handlers themselves only shallow-validate;
// modeling those fully in zod would duplicate TypeScript's own type system for
// no additional safety the handler doesn't already provide.

export const GhostBranchBodySchema = z.object({
  sessionId: sessionIdField,
  ghostId: z.string().min(1).max(128),
});

export const RedteamBodySchema = z.object({
  sessionId: sessionIdField,
  plan: z.object({ revealId: z.string().min(1) }).passthrough(),
});

export const QualityBodySchema = z.object({
  sessionId: sessionIdField,
  ir: z.object({ ops: z.array(z.unknown()) }).passthrough(),
});

export const TwinDoBodySchema = z.object({
  sessionId: sessionIdField,
  opId: z.string().min(1),
  replacement: z.unknown().optional(),
});

export const FixedPointsBodySchema = z.object({
  sessionId: sessionIdField,
  fixedPoints: z.array(z.unknown()).min(1),
  currentScene: z.number().optional(),
});

export const BackchainBodySchema = z.object({
  sessionId: sessionIdField,
  fixedPoint: z.object({ atScene: z.number() }).passthrough(),
  currentScene: z.number().optional(),
});

const StoryOpItemSchema = z
  .object({ op: z.string().refine(k => k in STORY_OP_KINDS, { message: 'unknown StoryOp kind' }) })
  .passthrough();

export const InjectOpsBodySchema = z.object({
  sessionId: sessionIdField,
  ops: z.array(StoryOpItemSchema).min(1),
  sceneIdx: z.number().optional(),
  label: z.string().max(256).optional(),
});

export const ConvergeBodySchema = z.object({
  sessionId: sessionIdField,
  target: z.object({ sceneIdx: z.number() }).passthrough(),
  seed: z.number().optional(),
  budget: z.object({
    maxIterations: z.number().optional(),
    candidatesPerIteration: z.number().optional(),
  }).passthrough().optional(),
});

// POST /api/nvm/converge/commit — the missing back-half of generate→audit→select
// (server/nvm/converge/loop.ts now returns per-candidate scores + a `winner`
// instead of discarding them; this is where one of those candidates — winner,
// runner-up, or a restored ghost's `branchedOps` — actually becomes a
// StoryCommit). `ops` shape mirrors InjectOpsBodySchema/StoryOpItemSchema exactly:
// same op-kind discriminator check, since the handler builds the same kind of
// minimal IR shell inject-ops's proof-inspection routes already use.
// `activeMechanisms`/`preconditions` are optional but matter more than they look:
// the handler re-runs Tier 1 before committing, and MechanismProof/CausalProof
// (server/nvm/proof/tier1/{mechanism,causal}.ts) block on the IR's OWN declared
// metadata regardless of session state — MechanismProof unconditionally fails an
// empty activeMechanisms list, and CausalProof requires ≥1 precondition for any
// non-initial (sceneIdx > 0) scene with ops. A caller committing a candidate or
// ghost already has both fields on that candidate's own `ir` (server/routes/nvm.ts
// now returns `candidates[].ir` / ghost `.ir` in full) — passing them through here
// lets that declarative half of Tier 1 re-verify meaningfully instead of always
// failing on an empty default.
export const ConvergeCommitBodySchema = z.object({
  sessionId: sessionIdField,
  ops: z.array(StoryOpItemSchema).min(1),
  sceneIdx: z.number().optional(),
  activeMechanisms: z.array(z.string().min(1).max(128)).max(10).optional(),
  preconditions: z.array(z.string().max(256)).max(20).optional(),
  summary: z.string().max(500).optional(),
});

export const ConvergeArcBodySchema = z.object({
  sessionId: sessionIdField,
  scenes: z.array(z.unknown()).min(1).max(8),
});

// POST /api/nvm/whatif/explore — What-If Lab compose endpoint (Run 6).
// Deliberately the SAME intervention vocabulary as TwinDoBodySchema (opId +
// optional replacement StoryOp) — server/nvm/whatif/explore.ts calls the
// exact same doIntervention() the twin/do route does, just as one step inside
// a larger composition, so there is no reason for the two request shapes to
// diverge. branchLimit is new: how many ranked forward branches to return.
// server/nvm/whatif/explore.ts also clamps this defensively, but validating
// it here means a malformed value 400s with a clear message instead of being
// silently clamped deep inside the composition module.
export const WhatIfExploreBodySchema = z.object({
  sessionId: sessionIdField,
  opId: z.string().min(1),
  replacement: z.unknown().optional(),
  branchLimit: z.number().int().min(1).max(5).optional(),
});

// POST /api/nvm/whatif/doctor — the What-If Lab's Script Doctor readout
// (2026-09-04). DELIBERATELY the same body shape as WhatIfExploreBodySchema
// above, field for field: this route answers the same question about the same
// intervention, it just also compiles each branch to Fountain
// (server/nvm/whatif/materialize.ts) and scores it. Reusing the shape means a
// client that can call /explore can call this with the identical body, and
// there is one intervention vocabulary in the system rather than two.
// `title` is the only addition — the title-page line every projected variant
// carries, capped so a caller cannot push an unbounded string into the
// projector's output (and therefore into the doctor's input).
export const WhatIfDoctorBodySchema = z.object({
  sessionId: sessionIdField,
  opId: z.string().min(1),
  replacement: z.unknown().optional(),
  branchLimit: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
});

// POST /api/nvm/room/critique — on-demand Writers' Room (Run 6). The 6
// critics (server/nvm/room/critics/*.ts) take a whole (ir, state) pair with
// no per-scene or per-critic targeting parameter — room.ts has no concept of
// "critique just this op" or "just this critic" — so there is nothing else
// for this schema to validate beyond the shared sessionId field.
export const RoomCritiqueBodySchema = z.object({
  sessionId: sessionIdField,
});

export const SelfplayBodySchema = z.object({
  sessionId: sessionIdField,
  scenarios: z.array(z.unknown()).min(1).max(5),
  maxSimulations: z.number().positive().optional(),
  maxScenesPerScenario: z.number().positive().optional(),
  budget: z.object({
    maxIterations: z.number().optional(),
    candidatesPerIteration: z.number().optional(),
    maxLLMCalls: z.number().optional(),
  }).passthrough().optional(),
});

export const GenomeDiffBodySchema = z.object({
  sessionId: sessionIdField,
  runIdA: z.string().min(1),
  runIdB: z.string().min(1),
});

export const GenomeBreedBodySchema = z.object({
  sessionId: sessionIdField,
  runIdA: z.string().min(1),
  runIdB: z.string().min(1),
  newId: z.string().min(1).optional(),
});

export const RepairBodySchema = z.object({
  sessionId: sessionIdField,
  ir: z.object({ ops: z.array(z.unknown()) }).passthrough(),
});

export const LiveMoveBodySchema = z.object({
  sessionId: sessionIdField,
  text: z.string().min(1).max(2000),
  sceneIdx: z.number().optional(),
});

export const LiveAdvanceBodySchema = z.object({
  sessionId: sessionIdField,
  beats: z.number().optional(),
  locationId: z.string().max(128).optional(),
});

export const CompileBodySchema = z.object({
  sessionId: sessionIdField,
  title: z.string().max(256).optional(),
});

export const ReviseBodySchema = z.object({
  sessionId: sessionIdField,
  approvedSpans: z.array(z.unknown()).optional(),
  title: z.string().max(256).optional(),
});

// POST /api/scriptide/doctor — stateless (no sessionId): raw Fountain text OR
// a Final Draft (.fdx) export in, ScriptDoctorReport out. Callers submit
// EXACTLY ONE of `fountain` / `fdx` — never both, never neither — enforced by
// the refinement below so server/routes/scriptide.ts never has to re-derive
// which format arrived; it can just check which key is defined. 900_000 chars
// is deliberately below the express `express.json({ limit: '1mb' })` body cap
// (server/app.ts) so this schema's max-length check is the one that actually
// fires and returns a clean 400 — in the worst case (1 byte/char) 1mb ≈
// 1_048_576 chars, so a fountain/fdx string right at that ceiling would
// otherwise be rejected by the body parser with a less specific 413 instead
// of this schema's message.
export const DoctorBodySchema = z.object({
  fountain: fountainField().optional(),
  fdx: z.string().min(1).max(MAX_FOUNTAIN_CHARS).optional(),
  title: z.string().max(300).optional(),
}).refine(
  (body) => (body.fountain !== undefined) !== (body.fdx !== undefined),
  'provide exactly one of fountain or fdx',
);

// POST /api/scriptide/doctor/deep — the opt-in "deep read" sibling of /doctor
// above. Same two-format contract (exactly one of fountain/fdx, optional
// title) — deep read only changes HOW the doctor senses each scene's
// signals (LLM reading vs. lexicon heuristics), never what the request body
// looks like, so this is a plain alias rather than a re-declared schema:
// keeping it a distinct exported name (instead of importing DoctorBodySchema
// directly at the route) leaves room for the two bodies to diverge later
// (e.g. a future per-scene budget field) without disturbing /doctor's schema.
export const DeepDoctorBodySchema = DoctorBodySchema;

// POST /api/export/coverage-letter (server/routes/coverage-letter.ts,
// server/lib/coverage-letter.ts) — the one-to-two-page connected-prose
// coverage LETTER, sibling to POST /api/export/coverage's dashboard-style
// HTML. Same two-format body contract as DoctorBodySchema (exactly one of
// fountain/fdx, optional title) plus an optional `author` byline — the only
// field the coverage-letter renderer accepts that the HTML export's route
// doesn't take directly (that route derives the byline itself from the
// Fountain title page). Kept as its own schema rather than reusing
// DoctorBodySchema so `author` doesn't leak into every other doctor-shaped
// route's accepted body.
// 2026-09-04 — `draftRank`: "rank among the writer's own saved drafts of
// this script" (src/lib/snapshot-trend.ts's computeDraftRank), the second,
// honest denominator alongside the calibration reference-set percentile.
// Computed CLIENT-SIDE (the client already holds the ScriptIDE editor's
// `snapshots` array AND ScriptDoctorPanel's own Draft History — this
// stateless route has no sessionId and never sees either) and passed
// through here so the server can render it into the letter additively; the
// server never recomputes or trusts it as a score claim, only as display
// copy the writer's own client attests to about their own saved history —
// same trust posture as the `title`/`author` fields already on this schema.
// Bounded to plausible values (both positive integers, rank <= of). The
// audit fix that made computeDraftRank rank the UNION of snapshots (20-entry
// cap, ScriptideSaveBodySchema's `snapshots` cap below) and Draft History
// (50-entry cap, ScriptDoctorPanel.tsx's DOCTOR_HISTORY_MAX_ENTRIES) raised
// the plausible ceiling from 21 (20 snapshots + 1 current) to 71 (20 + 50 +
// 1) — deduped counts are usually well under that, but the cap must cover
// the union's own worst case, not the smaller pre-fix one.
const DraftRankSchema = z.object({
  rank: z.number().int().min(1).max(71),
  of: z.number().int().min(1).max(71),
  // 2026-09-04 (audit round 2) — true when >= 1 OTHER counted draft shares
  // the EXACT same health as this one: an exact tie already shares the
  // better rank (src/lib/snapshot-trend.ts's computeDraftRank), but a plain
  // ordinal alone ("1st of 6") reads as clean separation when it's actually
  // a dead heat. Optional and omitted (never sent as literal `false`) in
  // the common untied case, so the payload shape is unchanged there.
  tied: z.boolean().optional(),
  // 2026-09-05 (review round 2) — how many OTHER saved records exist with no
  // health at all (excluded from `of`/`rank` entirely). Same union ceiling
  // as `of`/`rank` above (70 possible records + 1 current, though
  // `unscored` itself is never the current draft — see computeDraftRank).
  unscored: z.number().int().min(0).max(70).optional(),
}).refine((v) => v.rank <= v.of, 'rank must not exceed of');

export const CoverageLetterBodySchema = z.object({
  fountain: fountainField().optional(),
  fdx: z.string().min(1).max(MAX_FOUNTAIN_CHARS).optional(),
  title: z.string().max(300).optional(),
  author: z.string().max(300).optional(),
  draftRank: DraftRankSchema.optional(),
}).refine(
  (body) => (body.fountain !== undefined) !== (body.fdx !== undefined),
  'provide exactly one of fountain or fdx',
);

// POST /api/export/coverage (server/routes/export.ts, server/lib/
// coverage-html.ts) — the dashboard-style HTML sibling of the coverage
// LETTER above. Same DoctorBodySchema-shaped body (exactly one of
// fountain/fdx, optional title) plus the SAME `draftRank` field, same
// DraftRankSchema, same trust posture: computed client-side from the
// ScriptIDE editor's own `snapshots` array (this stateless route has no
// sessionId and never sees them) and passed through so the exported HTML can
// render "rank among your own saved drafts" beside report.healthPercentile,
// the same second denominator the letter and the in-app panel already show
// (2026-09-04 honesty-audit matrix — coverage-html.ts previously had no
// draft-rank or percentile line at all). Kept as its own schema, not a reuse
// of DoctorBodySchema, for the same reason CoverageLetterBodySchema is its
// own schema above: draftRank shouldn't leak into every other doctor-shaped
// route's accepted body.
export const CoverageBodySchema = z.object({
  fountain: fountainField().optional(),
  fdx: z.string().min(1).max(MAX_FOUNTAIN_CHARS).optional(),
  title: z.string().max(300).optional(),
  draftRank: DraftRankSchema.optional(),
}).refine(
  (body) => (body.fountain !== undefined) !== (body.fdx !== undefined),
  'provide exactly one of fountain or fdx',
);

// POST /api/scriptide/diagnose — stateless (no sessionId), fountain-only. This
// is the debounce-friendly "diagnostics as you type" sibling of /doctor: it
// has no fdx/pdf variant because it runs on every keystroke-pause tick against
// whatever Fountain text is already live in the editor, not an uploaded file
// that needs conversion first (the client already has fdx/pdf covered via the
// existing /doctor and /doctor/pdf routes). Same 900_000-char ceiling and the
// same rationale as DoctorBodySchema above: deliberately below the express
// `express.json({ limit: '1mb' })` body cap (server/app.ts) so THIS schema's
// max-length check is the one that actually fires and returns a clean,
// specific 400 instead of the body parser's generic 413.
export const DiagnoseBodySchema = z.object({
  fountain: fountainField(),
});

// POST /api/game/interview — character-interview feature. History entries are
// capped at 2000 chars each (matches `question`'s cap so a caller can't smuggle
// an oversized turn into context via history instead of the question field) and
// the whole transcript is capped at 20 turns to bound prompt size per request.
const InterviewHistoryItemSchema = z.object({
  role: z.enum(['user', 'character']),
  text: z.string().max(2000),
});

export const InterviewBodySchema = z.object({
  sessionId: sessionIdField,
  agentName: z.string().min(1).max(80),
  question: z.string().min(1).max(2000),
  history: z.array(InterviewHistoryItemSchema).max(20).optional(),
});

// POST /api/scriptide/fix — Run 11's fix-and-verify. Stateless (no
// sessionId), same 900_000-char fountain ceiling and rationale as
// DoctorBodySchema (deliberately below express's 1mb JSON body cap so THIS
// schema's max-length check is the one that fires with a specific message).
// `span` mirrors ApprovedSpan/LocatedIssue's 1-based inclusive line-number
// convention used throughout this bridge (revision/passes/types.ts,
// analyze/locate.ts) — endLine >= startLine is enforced by the refinement
// below; fix.ts's own clampSpan defensively re-clamps against the document's
// actual bounds regardless (a span naming lines past EOF is a normal,
// non-error case handled there, not rejected here). `issues` is capped at 10
// (a single fix call is meant to address a handful of co-located findings,
// not restate the whole report) and each field is capped to match
// fix.ts's/rewrite.ts's sanitizeForPrompt truncation lengths for the
// corresponding field, so nothing here can be silently truncated by the
// prompt builder that wasn't already validated to roughly that size.
const FixSpanSchema = z
  .object({
    startLine: z.number().int().min(1),
    endLine: z.number().int().min(1),
  })
  .refine((s) => s.endLine >= s.startLine, {
    message: 'endLine must be >= startLine',
    path: ['endLine'],
  });

const FixIssueItemSchema = z.object({
  rule: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  suggestedFix: z.string().max(500).optional(),
});

// `candidateFountain` (2026-09-04) — the WRITER-SUPPLIED candidate. When it
// is present the route skips generation entirely and verifies the writer's
// own rewrite against `fountain`, which is why `span` and `issues` become
// optional: there is no span to rewrite and no issue list to hand a model.
// The refinement below keeps each of the two shapes complete — a generated
// fix still REQUIRES both, so no existing caller loosens.
//
// It reuses fountainField() rather than a plain bounded string on purpose:
// the candidate goes to the same analyzer the `fountain` field does, so it
// must clear the same pathological-shape guard (fountainShapeRejectionReason
// — a single huge unbroken token, or thousands of all-caps cue-shaped lines,
// both O(n^2) in the parser). A candidate exempt from that guard would be a
// straight bypass of it.
export const FixBodySchema = z.object({
  fountain: fountainField(),
  candidateFountain: fountainField().optional(),
  span: FixSpanSchema.optional(),
  issues: z.array(FixIssueItemSchema).min(1).max(10).optional(),
}).refine(
  (body) => body.candidateFountain !== undefined || (body.span !== undefined && body.issues !== undefined),
  'provide either candidateFountain (verify a rewrite you wrote) or both span and issues (generate a fix)',
);

// POST /api/export/slate — Run 14 producer-tier slate triage (append-only;
// this run does not touch any schema above). Each script's `fountain` shares
// DoctorBodySchema's own 900_000-char single-document ceiling, but that alone
// is not the binding constraint here: server/app.ts's global
// `express.json({limit:'1mb'})` body-size cap runs BEFORE this schema ever
// sees the request, so a 20-script slate at 900_000 chars apiece (~18MB)
// would be rejected by the body parser's generic 413 long before reaching
// this schema's clean, specific 400. The `.refine` below caps the SUM of
// every script's fountain length at 900_000 — the same ceiling
// DoctorBodySchema uses for a single document — which keeps even a maximal
// 20-script slate comfortably under the 1mb JSON cap after per-title/key/
// comma JSON-structure overhead, so THIS validator's message is the one that
// actually fires for an oversized slate instead of a less-specific 413.
const SlateScriptItemSchema = z.object({
  title: z.string().min(1).max(200),
  fountain: fountainField(),
}).passthrough();

export const SlateBodySchema = z.object({
  scripts: z.array(SlateScriptItemSchema).min(2).max(20),
  format: z.enum(['json', 'html']).optional(),
}).refine(
  (body) => body.scripts.reduce((sum, s) => sum + s.fountain.length, 0) <= MAX_FOUNTAIN_CHARS,
  {
    message: 'combined fountain length across all scripts must not exceed 900,000 characters — split into a smaller slate',
    path: ['scripts'],
  },
);

// POST /api/export/verify — Run 15 (ROADMAP §11) determinism-badge verify
// endpoint. Same two-format contract as DoctorBodySchema (exactly one of
// fountain/fdx), plus an `expected` object naming which fields of a
// previously-exported report the caller wants re-attested against a fresh
// run. `contentHash` is REQUIRED inside `expected` — it's the anchor fact
// ("is this even the same text?") the route checks before it ever bothers
// re-running the doctor; see server/routes/export.ts's route comment. Every
// other field is optional so a caller can check only the subset of numbers
// their exported copy actually shows (e.g. a plain-text summary that quotes
// health but not healthPercentile).
const CONTENT_HASH_RE = /^[0-9a-f]{64}$/;

const VerifyExpectedSchema = z.object({
  contentHash: z.string().regex(CONTENT_HASH_RE, 'contentHash must be a 64-character lowercase hex sha256 digest'),
  health: z.number().min(0).max(100).optional(),
  verdict: z.enum(['RECOMMEND', 'CONSIDER', 'PASS']).optional(),
  totalIssues: z.number().int().min(0).optional(),
  healthPercentile: z.number().min(0).max(100).optional(),
  // #4: the engine-identity claims published in ScriptDoctorReport.provenance
  // (types.ts) and the exported coverage HTML's verify block
  // (coverage-html.ts). Checked separately from the four fields above — see
  // server/routes/export.ts's /api/export/verify — so a mismatch here alone
  // (content and score both still match) reports as the SOFT `engine_mismatch`
  // outcome rather than a hard content/score failure.
  engineCommit: z.string().min(1).max(200).optional(),
  rulebookCount: z.number().int().min(0).optional(),
});

export const VerifyBodySchema = z.object({
  fountain: fountainField().optional(),
  fdx: z.string().min(1).max(MAX_FOUNTAIN_CHARS).optional(),
  expected: VerifyExpectedSchema,
}).refine(
  (body) => (body.fountain !== undefined) !== (body.fdx !== undefined),
  'provide exactly one of fountain or fdx',
);

// POST /api/events — P3 product instrumentation (ROADMAP §3 P3: "% of Doctor
// runs that export is measured", and P2's deferred time-to-first-report).
// The event vocabulary and each event's props are CLOSED: no arbitrary keys,
// cross-event metadata, session capability, or free text can reach the sink.
export const PRODUCT_EVENT_NAMES = ['doctor_run', 'export_report', 'first_report', 'verify_run'] as const;

export const MAX_EVENT_ELAPSED_MS = 7 * 24 * 60 * 60 * 1000;

const EventSourceSchema = z.enum(['sample', 'draft', 'upload']);
const ExportVerdictSchema = z.enum(['RECOMMEND', 'CONSIDER', 'PASS', 'unknown']);

export const EventBodySchema = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('doctor_run'),
    props: z.object({ source: EventSourceSchema }).strict(),
  }).strict(),
  z.object({
    name: z.literal('first_report'),
    props: z.object({
      source: EventSourceSchema,
      elapsedMs: z.number().min(0).max(MAX_EVENT_ELAPSED_MS),
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal('export_report'),
    props: z.object({ verdict: ExportVerdictSchema }).strict(),
  }).strict(),
  z.object({
    name: z.literal('verify_run'),
    props: z.object({ verified: z.boolean() }).strict(),
  }).strict(),
]);

export type EventPayload = z.infer<typeof EventBodySchema>;

// ── server/routes/game.ts schemas (W4 validation-completeness audit) ────────

// POST /api/simulate-to-fountain — a self-contained, ephemeral-Stage sibling
// of /api/init (same nodes/agents shape as InitBodySchema, capped at 10 each
// rather than 50 — the route itself already `.slice(0, 10)`s both arrays, so
// this schema's max(10) just turns that silent truncation into an honest
// 400 for a caller who sent more than the route will ever use) plus the
// run-shape fields (location_id, maxTurns, title, author) the route reads
// directly off the body.
export const SimulateToFountainBodySchema = z.object({
  nodes: z.array(LocationItemSchema).max(10),
  agents: z.array(AgentItemSchema).max(10),
  location_id: z.string().max(64).optional(),
  maxTurns: z.number().optional(),
  title: z.string().max(256).optional(),
  author: z.string().max(256).optional(),
});

// POST /api/qbn/filter-choices — `choices` is a caller-supplied list of QBN
// choice objects; the route's own filter logic already tolerates arbitrary
// shapes on each item (reading `qbnRequirements`/`consequenceScope` when
// present, ignoring everything else), so `z.unknown()` per item mirrors that
// looseness rather than re-deriving a full Choice type here. `qualities` and
// `maxScope` keep the route's own defensive fallbacks (`{}` / `'crisis'`
// ceiling) as the source of truth for out-of-range values — this schema only
// rejects the shapes those fallbacks were never meant to rescue (e.g.
// `choices` not being an array at all, which used to just be a 400 with a
// different message).
export const QbnFilterChoicesBodySchema = z.object({
  choices: z.array(z.unknown()).max(500),
  qualities: z.record(z.string(), z.number()).optional(),
  maxScope: z.enum(['micro', 'macro', 'crisis']).optional(),
});

// POST /api/ncp-storyform — every field is optional caller-supplied override
// context; the route derives the rest from the live session when omitted.
// `throughlines` and `characters` are deliberately loose (`.passthrough()` /
// `z.unknown()`) — the route only reads a handful of known string/array
// fields off each and tolerates anything else, same rationale as the NVM
// schemas above (M2.3) for domain objects the handler itself only
// shallow-validates.
export const NcpStoryformBodySchema = z.object({
  throughlines: z.object({
    objectiveStory: z.string().max(2000).optional(),
    mainCharacter: z.string().max(2000).optional(),
    influenceCharacter: z.string().max(2000).optional(),
    relationshipStory: z.string().max(2000).optional(),
    activeThroughlines: z.array(z.string().max(128)).max(20).optional(),
  }).passthrough().optional(),
  characters: z.array(z.unknown()).max(10).optional(),
});

// POST /api/nvm/analyze/compare — vectorizes `scriptText` (server/nvm/
// analyze/story-vector.ts) and also runs it through runScriptDoctor
// (server/nvm/analyze/doctor.ts), same as DoctorBodySchema's `fountain`
// field above — so this reuses that field's exact bound and rationale:
// 900_000 chars is deliberately below the express `express.json({ limit:
// '1mb' })` body cap (server/app.ts) so THIS schema's max-length check is
// the one that fires with a clean, specific 400 instead of the body
// parser's generic 413.
export const StoryVectorCompareBodySchema = z.object({
  scriptText: fountainField(),
});

// GODMODE L38 craft-comparison body: 2–5 labeled fountain scripts. Bound each
// script by MAX_FOUNTAIN_CHARS so a single oversized draft 400s with a clean
// field path instead of the express body-parser's generic 413.
export const CraftCompareBodySchema = z.object({
  scripts: z.array(z.object({
    label: z.string().min(1).max(128),
    fountain: fountainField(),
  })).min(2).max(5),
});

// Path-param schema shared by GET /api/dramatic-pressure/:charId,
// /api/goal-mutations/:charId, /api/persuasion/:charId — these previously
// only did `req.params.charId?.substring(0, 128)` plus an empty-string
// check (no charset guard at all, unlike sessionId's
// `HEADER_SESSION_ID_RE`/query-body regex in session-store.ts). char_id is
// never used to build a filesystem path the way sessionId is — every use
// here is a plain in-memory Map/array lookup — so this deliberately doesn't
// reuse sessionId's stricter `[a-zA-Z0-9_-]` charset (a caller's char_id can
// legitimately contain spaces/punctuation, per AgentItemSchema's own
// `z.string().min(1).max(64)` char_id field above). It matches AgentItemSchema's
// char_id bound exactly (min 1, max 64) so a charId that could never have
// been registered by /api/init in the first place 400s before reaching the
// lookup, instead of silently falling through to a 200-with-empty-result.
export const CharIdParamSchema = z.object({
  charId: z.string().min(1).max(64),
});

// Path-param schemas for the NVM router's opaque-id lookups (server/routes/
// nvm/{debug,commits,analysis}.ts): GET /api/debug/explain/:eventId,
// /api/debug/explain-scene/:locationId, /api/nvm/commits/:commitId,
// /api/nvm/proof/:commitId, /api/nvm/quality/scene/:commitId. Every one of
// these previously took `req.params.<id>` completely unvalidated (no
// length cap, unlike sessionId's regex/CharIdParamSchema above) straight
// into an in-memory Map/array lookup (stage.getCommit, explainAction,
// Array#findIndex by commitId, …) — never a filesystem path or query
// string, so (like CharIdParamSchema) there's no charset to restrict, only
// a sane length ceiling so a pathological megabyte-long path segment can't
// be used to force a full linear scan/string-compare pass over every commit
// for no benefit to a legitimate caller. 128 matches
// GoalFieldSchema/StoryOpItemSchema's own id-field bound above — the same
// ballpark every other opaque-id field in this file already uses.
export const CommitIdParamSchema = z.object({
  commitId: z.string().min(1).max(128),
});

export const EventIdParamSchema = z.object({
  eventId: z.string().min(1).max(128),
});

export const LocationIdParamSchema = z.object({
  locationId: z.string().min(1).max(128),
});

// GET /api/nvm/project/:target — the route already 400s cleanly on an
// unknown target via its own inline `VALID.includes(target)` check; this
// schema is the SAME list expressed as a zod enum (kept as the single
// source of truth here rather than duplicated at the route) so the route
// can go through the same validateParams() 400 shape every other route in
// this audit now uses, instead of a route-local message string.
export const ProjectTargetParamSchema = z.object({
  target: z.enum([
    'fountain', 'novel', 'stage', 'comic', 'interactive', 'pitch', 'bible', 'rewatch', 'cutting_room',
    'treatment', 'outline', 'dialogue_only', 'epistolary', 'simulation_log', 'director_commentary',
  ]),
});

// ── server/routes/scriptide.ts schemas (W4 validation-completeness audit) ───

// Title Page (retrospective finding #12): title/author are short single-line
// fields in the Labs "Title" tab's actual inputs (ScriptIDE.tsx renderTitlePage),
// contact is a free-text textarea that can reasonably hold a multi-line
// address/phone/agent block — capped generously wider than the other two but
// still bounded, matching the "cap the JSON size sensibly" instruction rather
// than leaving it unbounded like the passthrough envelope fields around it.
export const TitlePageBodySchema = z.object({
  title: z.string().max(300),
  author: z.string().max(300),
  contact: z.string().max(2_000),
});

// One entry of the ScriptIDE editor's `snapshots` array (SnapshotManager.tsx's
// Snapshot type: { id, name, text, date }, plus writer #9's optional
// score-over-revisions fields captured at save time — see
// src/components/scriptide/SnapshotManager.tsx and
// src/lib/scriptide-draft-store.ts's snapshotTrend). EVERY field is optional,
// including the original four (id/name/text/date): this schema replaces a
// bare `z.array(z.unknown())`, and real callers already save partial objects
// through this exact route (e.g. tests/routes/game-reset-persistence.test.ts
// posts `{ id: 'snapshot', text: '...' }` with no name/date) — tightening the
// required fields would 400 traffic this route has always accepted. The new
// health/verdict/sceneCount/analyzedAt fields are typed when present (so a
// malformed value 400s instead of silently corrupting a stored row) but their
// absence is normal: every snapshot saved before this feature, and any future
// save where no report exists yet for the current text, omits them.
// `.passthrough()` so an older or newer client's extra fields still round-trip.
export const SnapshotSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  date: z.string().optional(),
  health: z.number().optional(),
  verdict: z.enum(['RECOMMEND', 'CONSIDER', 'PASS']).optional(),
  sceneCount: z.number().int().nonnegative().optional(),
  analyzedAt: z.number().optional(),
  // 2026-09-04 — the same two Shape & Rhythm aggregates ScriptDoctorPanel.tsx
  // and coverage-letter.ts surface (server/nvm/analyze/structural-signals.ts's
  // meanAbsDialogueShareDelta/actionSentenceCvOverall), captured at snapshot
  // time the same optional, additive way as health/verdict/sceneCount above —
  // see src/components/ScriptIDE.tsx's confirmSnapshot and src/lib/
  // snapshot-trend.ts.
  meanAbsDialogueShareDelta: z.number().optional(),
  actionSentenceCvOverall: z.number().optional(),
  // 2026-09-04 — the source report's determinism receipt (server/nvm/
  // analyze/types.ts's contentHash), stamped additively the same way as the
  // fields above. Lets the client's computeDraftRank (src/lib/snapshot-
  // trend.ts) dedupe this snapshot exactly against the same run recorded in
  // ScriptDoctorPanel's own Draft History (localStorage, never sent to the
  // server) instead of an approximate health+timestamp match.
  contentHash: z.string().optional(),
}).passthrough();

// POST /api/scriptide/save — persists the ScriptIDE editor's full working
// state. Every cap below matches the route's own pre-existing inline
// truncation exactly (`.slice(0, 20/100/200)`) — this schema turns those
// silent truncations into an honest 400 for malformed shapes (wrong type
// entirely), while leaving in-bounds-but-large values to the route's own
// slice as before, so valid payloads at or under the existing caps are
// byte-for-byte unaffected.
//
// scriptText is REQUIRED, unlike the array/flag fields below (audit finding
// 3, client-data-paths audit): a save is a full-state write straight into
// Stage.saveScriptIDEState's `INSERT OR REPLACE`, which has no per-field
// PATCH semantics. An `.optional()` scriptText let a body that omitted the
// field pass validation and fall through the route's old `: ''` default,
// silently wiping the server's stored script to empty on the next save. No
// caller does this today (ScriptIDE.tsx always spreads a full draft object
// that includes scriptText — see the route's own comment), but a body
// missing the script is malformed, not "empty script": it must 400, not
// resolve to a value the caller never sent.
export const ScriptideSaveBodySchema = z.object({
  scriptText: z.string().max(500_000),
  snapshots: z.array(SnapshotSchema).max(20).optional(),
  characters: z.array(z.unknown()).max(100).optional(),
  researchNotes: z.array(z.unknown()).max(200).optional(),
  isDarkMode: z.boolean().optional(),
  // null clears a previously-saved title page; omitted means "unchanged" is
  // NOT implied — the route treats a missing titlePage the same as every
  // other envelope field (a full-state save, not a partial patch), matching
  // scriptText/snapshots/characters/researchNotes above.
  titlePage: TitlePageBodySchema.nullable().optional(),
  expectedUpdatedAt: z.number().int().nonnegative().nullable().optional(),
}).passthrough();

// Shared by /api/scriptide/{world-build,refine-dialogue,analyze-tension,
// clean-action}: each route reads one primary text field via requireString
// (session-store.ts) — which throws a plain Error that previously fell
// through asyncHandler to the global handler's generic 500, not a 400 (see
// app.ts's error handler: only ValidationError/SyntaxError get 400) — plus
// optional scriptContext/profiles the route itself already sanitizes and
// caps via sanitizeForPrompt/sanitizeProfiles. This schema only bounds the
// outer shape; the route's own sanitize helpers remain the source of truth
// for the final prompt-injected text.
const ProfileItemSchema = z.unknown();

// Matches requireString's own contract exactly (session-store.ts): a
// non-empty-after-trim string, capped at requireString's default maxLen
// (20_000) since none of these four call sites pass an explicit maxLen.
const requireStringField = z
  .string()
  .max(20_000)
  .refine(s => s.trim() !== '', { message: 'must not be empty' });

export const WorldBuildBodySchema = z.object({
  beat: requireStringField,
  scriptContext: z.string().optional(),
  profiles: z.array(ProfileItemSchema).max(20).nullish(),
});

export const RefineDialogueBodySchema = z.object({
  dialogue: requireStringField,
  scriptContext: z.string().optional(),
  // nullish (not optional): the route's own guard is `if (rawProfiles !=
  // null)` — an explicit `null` is silently treated as "no profiles" rather
  // than rejected, and this schema preserves that.
  profiles: z.array(ProfileItemSchema).max(20).nullish(),
});

export const AnalyzeTensionBodySchema = z.object({
  scene: requireStringField,
  scriptContext: z.string().optional(),
  profiles: z.array(ProfileItemSchema).max(20).nullish(),
});

export const CleanActionBodySchema = z.object({
  text: requireStringField,
});

// POST /api/scriptide/character-profile — `profile` mirrors the route's own
// requireString reads (name/ghost/lie/want/need), each object-shaped and
// required per the existing inline `if (!profile || typeof profile !==
// 'object')` guard this schema replaces.
export const CharacterProfileBodySchema = z.object({
  profile: z.object({
    name: CharacterNameSchema,
    ghost: requireStringField.max(500),
    lie: requireStringField.max(2000),
    want: requireStringField.max(2000),
    need: requireStringField.max(2000),
  }).passthrough(),
});

// POST /api/analyze-script — `scriptText` is the one field the route
// requires via requireString; everything else (engineState, characters) is
// caller-supplied context the route already reads defensively field-by-field
// with its own type guards and caps, so this schema leaves those loose
// (`z.unknown()`) rather than re-deriving the full EngineState shape.
export const AnalyzeScriptBodySchema = z.object({
  scriptText: requireStringField,
  engineState: z.unknown().optional(),
  characters: z.array(z.unknown()).max(50).optional(),
}).passthrough();

// POST /api/characters/export — the route's own inline check
// (`typeof charId !== 'string' || !charId.trim()`) becomes this schema;
// max(64) matches AgentItemSchema's char_id bound above.
export const CharactersExportBodySchema = z.object({
  charId: z.string().min(1).max(64).refine(s => s.trim() !== '', { message: 'must not be empty' }),
});

// POST /api/characters/import — `bundle`'s real validation is
// isCharacterMemoryBundle (engine/character-memory.ts), which the route
// still calls after this schema — this only guards the outer shape (an
// object) so a non-object/missing bundle 400s with the standard shape
// before that deeper check runs. `targetLocationId` is nullish (not just
// optional): the route's own guard (`typeof req.body?.targetLocationId ===
// 'string' ? ... : undefined`) silently treats `null`/omitted as "no
// target" without rejecting it, so `.nullish()` preserves that; any OTHER
// wrong-typed value (a number, an object) now 400s here instead of being
// silently coerced to undefined — a genuine hardening, called out in the
// audit report.
export const CharactersImportBodySchema = z.object({
  bundle: z.unknown(),
  targetLocationId: z.string().max(128).nullish(),
}).refine(b => typeof b.bundle === 'object' && b.bundle !== null, {
  message: 'bundle is required',
  path: ['bundle'],
});

// POST /api/ai-providers/switch — the route's own inline check
// (`typeof provider !== 'string'`) becomes this schema; the route itself
// still validates `provider` against the known provider id list, so this
// only guards the outer shape/length before that lookup runs.
export const AiProviderSwitchSchema = z.object({
  provider: z.string().min(1).max(64),
});

// ── server/routes/export.ts schemas (W4 validation-completeness audit) ──────
// Shared by POST /api/export/{fdx,docx,print-html} — each route previously
// hand-rolled the same check via its local extractFountain() helper (still
// used for the actual 200_000-char truncation — this schema's ceiling is
// set higher, at DoctorBodySchema's own 900_000, purely as an outer sanity
// bound so a wildly oversized body 400s with a clear message instead of
// silently truncating) plus a free-text optional title, sanitized by the
// route's own sanitizeForPrompt call exactly as before.
export const FountainTitleBodySchema = z.object({
  fountain: fountainField(),
  title: z.string().max(2000).optional(),
}).passthrough();

export const RotateSessionBodySchema = z.object({
  // A bearer id is an exact capability, not display text: do not trim and
  // silently rotate to a value different from the one the caller supplied.
  newSessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/, 'newSessionId must match [a-zA-Z0-9_-]{8,64}').optional(),
}).strict().or(z.undefined());

// E4 "delete everything": takes no body fields — the route always deletes
// the CALLER's own session, identified the same way every other route
// identifies it (sessionId(req): explicit body/query, then X-Session-Id
// header, then 'default'). A strict empty-object schema (tolerating the
// undefined body Express leaves on a bodyless POST) matches
// AiConfigTestBodySchema's contract in server/routes/config.ts: no route may
// skip zod validation, even one with nothing to validate.
export const DeleteSessionBodySchema = z.object({}).strict().or(z.undefined());

// ── Middleware factory ───────────────────────────────────────────────────────
// Usage:  app.post('/api/foo', validate(FooSchema), handler)
// On failure returns HTTP 400 with { error: '<first issue message>' }.

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Invalid request body';
      const path = result.error.issues[0]?.path.join('.') ?? '';
      res.status(400).json({ error: path ? `${path}: ${msg}` : msg });
      return;
    }
    next();
  };
}

// Usage:  app.get('/api/foo/:id', validateParams(FooParamSchema), handler)
// Same 400 shape as validate() above, applied to req.params instead of
// req.body — for GET/route-param routes (e.g. CharIdParamSchema) that have
// no JSON body to validate at all.
export function validateParams(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Invalid request parameters';
      const path = result.error.issues[0]?.path.join('.') ?? '';
      res.status(400).json({ error: path ? `${path}: ${msg}` : msg });
      return;
    }
    next();
  };
}
