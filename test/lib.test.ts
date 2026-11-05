import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildHeaders,
  EXPIRES_PATTERN,
  extendBody,
  formatExtend,
  formatResult,
  formatUpdate,
  updateBody,
} from "../src/lib.ts";

const base = {
  id: "abc",
  url: "https://gui.now/abc",
  edit_token: "tok",
  expires_at: "2026-11-04T12:00:00.000Z",
  pro: false,
  format: "html",
};

test("expires accepts durations and never, rejects the rest", () => {
  for (const ok of ["30m", "1h", "24h", "72h", "7d", "365d", "never"]) {
    assert.ok(EXPIRES_PATTERN.test(ok), ok);
  }
  for (const bad of ["", "0h", "24", "1w", "-1h", "Never", "1h ", "1234567d"]) {
    assert.ok(!EXPIRES_PATTERN.test(bad), bad);
  }
});

test("headers carry the client label, agent and key", () => {
  const h = buildHeaders({ apiKey: "k", agent: "claude-code", extra: { Authorization: "Bearer t" } });
  assert.equal(h["x-gui-client"], "gui-now-mcp");
  assert.equal(h["x-gui-agent"], "claude-code");
  assert.equal(h["x-api-key"], "k");
  assert.equal(h.Authorization, "Bearer t");
  const bare = buildHeaders({});
  assert.equal(bare["x-api-key"], undefined);
  assert.equal(bare["x-gui-agent"], undefined);
  assert.equal(buildHeaders({ agent: "x".repeat(100) })["x-gui-agent"].length, 64);
});

test("anonymous create shows the claim link with guidance for the user", () => {
  const text = formatResult({ ...base, claim_url: "https://gui.now/claim/abc#token=xyz" });
  assert.match(text, /Claim link: https:\/\/gui\.now\/claim\/abc#token=xyz/);
  assert.match(text, /Share the claim link with the user/);
  assert.match(text, /Edit token: tok/);
});

test("never-expiring and clamped pages read clearly", () => {
  const never = formatResult({ ...base, expires_at: null, pro: true });
  assert.match(never, /Expires: never/);
  assert.doesNotMatch(never, /Claim link/);
  const clamped = formatResult({ ...base, expires_clamped: true });
  assert.match(clamped, /shortened to the maximum/);
});

test("extend only sends expires when asked and formats the result", () => {
  assert.deepEqual(extendBody(), {});
  assert.deepEqual(extendBody("7d"), { expires: "7d" });
  assert.equal(formatExtend({ id: "abc", expires_at: null }), "Extended abc\nExpires: never");
  assert.match(formatExtend({ id: "abc", expires_at: "x", expires_clamped: true }), /shortened/);
});

test("update body takes markdown with theme and keeps fields left out", () => {
  assert.deepEqual(updateBody({ markdown: "# Hi", theme: "light" }), { markdown: "# Hi", theme: "light" });
  assert.deepEqual(updateBody({ title: "New" }), { title: "New" });
  assert.deepEqual(updateBody({ mermaid: "graph TD\n  A-->B" }), { mermaid: "graph TD\n  A-->B" });
  // No password or expiry is ever sent, so both stay as they are.
  const b = updateBody({ html: "<p>x</p>" });
  assert.equal("password" in b, false);
  assert.equal("expires" in b, false);
});

test("update body rejects two bodies and empty updates before calling the API", () => {
  assert.throws(() => updateBody({ html: "a", markdown: "b" }), /one of html, markdown or mermaid/);
  assert.throws(() => updateBody({}), /at least one of/);
  assert.throws(() => updateBody({ theme: "dark" }), /at least one of/);
});

test("update result shows what changed and the content hash", () => {
  const text = formatUpdate({
    id: "abc",
    updated: true,
    changed: ["html", "title"],
    ignored: ["expires"],
    format: "markdown",
    content_hash: "sha256:abc123",
    edit_count: 2,
    edits_remaining: 1,
  });
  assert.match(text, /^Updated abc/);
  assert.match(text, /Changed: html, title/);
  assert.match(text, /Format: markdown/);
  assert.match(text, /Content hash: sha256:abc123/);
  assert.match(text, /X-Content-Hash/);
  assert.match(text, /Ignored: expires/);
  assert.match(text, /Edits left: 1/);
  const same = formatUpdate({ id: "abc", updated: true, changed: [], content_hash: "sha256:1" });
  assert.match(same, /Changed: nothing/);
  assert.doesNotMatch(same, /Edits left/);
});

test("create shows the content hash when the API returns one", () => {
  assert.match(formatResult({ ...base, content_hash: "sha256:ff" }), /Content hash: sha256:ff/);
  assert.doesNotMatch(formatResult(base), /Content hash/);
});
