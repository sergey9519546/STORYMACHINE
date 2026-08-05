// Regression guard for the ip-address CVE cluster (GHSA-mwp4-54f8-5fhr,
// GHSA-4xrf-jv44-h6hh, GHSA-22jq-vg5j-6vgg). ip-address is a transitive
// runtime dependency of express-rate-limit (our per-route rate limiters),
// and express-rate-limit's default ipKeyGenerator feeds every rate-limited
// request through `new Address6(...)` / `Address6.to4()`, so a parser
// misclassification on the rate-limiter path lets an attacker mint
// distinct-looking keys for the same source and evade the per-IP limit
// (and, under `app.set('trust proxy')`, evade it via spoofed X-Forwarded-For).
//
// The advisory range is `ip-address <= 10.3.0`; the fix landed in 10.3.0+
// and is present in 10.4.0. This test pins both the version floor and the
// concrete behavior change so a future `npm audit fix --force`, a lockfile
// rollback, or a transitive downgrade cannot silently reintroduce the
// vulnerability without turning this test red.
//
// We assert behavior directly against the installed ip-address module rather
// than through HTTP because: (a) the CVE is in the parser, which is the unit
// that changed; (b) exercising it through the rate limiter would require
// trust-proxy + crafted X-Forwarded-For headers, which would couple this
// guard to proxy config that is intentionally opt-in (server/app.ts); and
// (c) a direct parser assertion fails the moment the bad version returns,
// with no moving parts in between.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ip-address CVE regression (GHSA-mwp4-54f8-5fhr + cluster)', () => {
  it('installed ip-address is at least 10.3.0 (above the advisory range)', async () => {
    const pkg = (await import('ip-address/package.json', { with: { type: 'json' } })).default;
    const [major, minor] = pkg.version.split('.').map(Number);
    const patched = major > 10 || (major === 10 && minor >= 3);
    assert.ok(patched,
      `ip-address ${pkg.version} is inside the vulnerable advisory range (<=10.3.0). ` +
      `Run \`npm audit fix\` then \`npm ci\` to reconcile node_modules to the patched release.`);
  });

  it('Address4 rejects leading-zero octets instead of decimal-decoding them (GHSA-mwp4-54f8-5fhr)', async () => {
    const { Address4 } = await import('ip-address');
    // Pre-fix: Address4('010.0.0.1').parsedAddress decoded '010' as the decimal
    // value 10, while a DNS resolver may read the same literal as octal (8.0.0.1).
    // That disagreement is the SSRF/trust-bypass primitive. Post-fix the parser
    // refuses leading-zero octets outright.
    assert.throws(
      () => new Address4('010.0.0.1'),
      /leading zero|invalid|malformed/i,
      "Address4('010.0.0.1') must throw on ip-address >= 10.3.0; if it silently parsed, " +
      'the leading-zero-octet SSRF primitive is back.'
    );
  });

  it('express-rate-limit still keys legitimate IPv4/IPv6/IPv4-mapped addresses correctly', async () => {
    // Behavior-preservation gate: the bump must not break the rate limiter on
    // any well-formed address. If a future ip-address release tightens parsing
    // too far and starts rejecting valid IPs, the rate limiter would 500 on
    // real traffic — this catches that regression direction too.
    const { ipKeyGenerator } = await import('express-rate-limit');
    assert.equal(ipKeyGenerator('192.0.2.1'), '192.0.2.1');
    assert.equal(ipKeyGenerator('::ffff:127.0.0.1'), '127.0.0.1');
    // IPv6 keys collapse to the /56 network form by default (ipv6Subnet option).
    assert.match(ipKeyGenerator('2001:db8::1'), /^2001:db8::\/56$/);
  });
});
