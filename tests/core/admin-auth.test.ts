// Unit coverage for the shared admin-gate primitives in
// server/lib/admin-auth.ts. isLoopbackAddress() and timingSafeStringEqual()
// are the two helpers every config-mutating route (POST /api/ai-config and
// friends) plus GET /metrics' METRICS_TOKEN gate share, so a behavior change
// here silently changes who can reconfigure AI providers / read metrics in
// production. These cases lock the exact contract before any refactor.
//
// isLoopbackAddress: the loopback predicate behind the "loopback-only until
// ADMIN_TOKEN is set" default posture. Behind a proxy req.ip may arrive as an
// IPv4-mapped IPv6 literal (::ffff:127.0.0.1), so the ::ffff: prefix is
// stripped before the check — that mapping is load-bearing and covered below.
//
// timingSafeStringEqual: the constant-ish-time compare behind every bearer
// token check. The length-mismatch branch deliberately self-compares the
// longer buffer so a mismatched length does not short-circuit instantly; it
// must never throw and must always return false on a length difference.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isLoopbackAddress, timingSafeStringEqual } from '../../server/lib/admin-auth.ts';

describe('admin-auth — isLoopbackAddress', () => {
  it('returns true for the canonical 127.0.0.1 loopback', () => {
    assert.equal(isLoopbackAddress('127.0.0.1'), true);
  });

  it('returns true for any address in the 127/8 loopback block', () => {
    // Loopback is the whole 127.0.0.0/8 range, not just 127.0.0.1 — the
    // startsWith('127.') check is what covers the rest of the block.
    assert.equal(isLoopbackAddress('127.1.2.3'), true);
    assert.equal(isLoopbackAddress('127.255.255.254'), true);
  });

  it('returns true for the IPv6 loopback ::1', () => {
    assert.equal(isLoopbackAddress('::1'), true);
  });

  it('returns true for an IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)', () => {
    // Behind a dual-stack listener req.ip can arrive in this mapped form;
    // stripping the ::ffff: prefix before the 127. check is what keeps the
    // gate correct there.
    assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  });

  it('returns false for RFC1918 private ranges (private is NOT loopback)', () => {
    assert.equal(isLoopbackAddress('10.0.0.1'), false);
    assert.equal(isLoopbackAddress('192.168.1.1'), false);
    assert.equal(isLoopbackAddress('172.16.0.1'), false);
  });

  it('returns false for the cloud metadata IP', () => {
    // 169.254.169.254 is link-local, not loopback — a config write from the
    // metadata IP must NOT be treated as a local admin.
    assert.equal(isLoopbackAddress('169.254.169.254'), false);
  });

  it('returns false for undefined (no peer address at all)', () => {
    assert.equal(isLoopbackAddress(undefined), false);
  });

  it('returns false for a non-IP string', () => {
    assert.equal(isLoopbackAddress('not-an-ip'), false);
  });

  it('returns false for an IPv4-mapped PUBLIC address', () => {
    // The ::ffff: strip must not make a mapped public address look loopback.
    assert.equal(isLoopbackAddress('::ffff:8.8.8.8'), false);
  });
});

describe('admin-auth — timingSafeStringEqual', () => {
  it('returns true for identical strings', () => {
    assert.equal(timingSafeStringEqual('abc', 'abc'), true);
  });

  it('returns false for strings that differ only in the last character', () => {
    assert.equal(timingSafeStringEqual('abc', 'abd'), false);
  });

  it('returns false (never throws) on a length mismatch where a is shorter', () => {
    // The length-mismatch branch self-compares aBuf against itself to avoid
    // an instant short-circuit; the contract is "no throw, return false".
    assert.equal(timingSafeStringEqual('ab', 'abc'), false);
  });

  it('returns false (never throws) on a length mismatch where a is longer', () => {
    assert.equal(timingSafeStringEqual('abc', 'abcd'), false);
  });

  it('returns false for completely different content of equal length', () => {
    assert.equal(timingSafeStringEqual('abc', 'xyz'), false);
  });

  it('returns false when comparing against an empty string', () => {
    assert.equal(timingSafeStringEqual('abc', ''), false);
    assert.equal(timingSafeStringEqual('', 'abc'), false);
  });

  it('returns true for two empty strings', () => {
    assert.equal(timingSafeStringEqual('', ''), true);
  });

  it('handles UTF-8 multi-byte content correctly (compare by utf8 bytes)', () => {
    // 'café' encodes to 5 utf8 bytes (é is 2 bytes); an equal string compares
    // equal, a same-character-count but different-bytes string does not.
    assert.equal(timingSafeStringEqual('café', 'café'), true);
    assert.equal(timingSafeStringEqual('café', 'cafe'), false);
  });
});
