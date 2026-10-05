import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOn, normalizePhone } from "./auth.ts";
import { extractPhoto, listEnabledPersonas, parsePersonaFile } from "./personas.ts";

const file = (frontmatter: string, body = "You are Test.") => `---\n${frontmatter}\n---\n${body}`;

test("parses a persona and merges the base prompt", () => {
  const p = parsePersonaFile(file("id: test\nname: Tara\nage: 22"), "Base for {{name}}.\n{{photos}}");
  assert.equal(p.id, "test");
  assert.equal(p.enabled, true);
  assert.match(p.systemPrompt, /^Base for Tara\./);
  assert.match(p.systemPrompt, /no photos available/);
  assert.match(p.systemPrompt, /## Your character\nYou are Test\./);
});

test("strips HTML comments from prompts", () => {
  const p = parsePersonaFile(file("id: test\nname: Tara\nage: 22", "<!-- note -->Hello"), "<!-- x -->Base");
  assert.doesNotMatch(p.systemPrompt, /note|x -->/);
});

test("rejects personas under 18 or with bad ids", () => {
  assert.throws(() => parsePersonaFile(file("id: test\nname: T\nage: 17"), ""), /18 or above/);
  assert.throws(() => parsePersonaFile(file("id: Bad Id\nname: T\nage: 20"), ""), /lowercase/);
  assert.throws(() => parsePersonaFile("no frontmatter", ""), /frontmatter/);
});

test("bundled personas all load", () => {
  const ids = listEnabledPersonas().map((p) => p.id);
  assert.deepEqual(ids, ["priya", "ananya", "meera"]);
});

test("extractPhoto pulls known tags and drops unknown ones", () => {
  const p = parsePersonaFile(file("id: test\nname: T\nage: 20"), "");
  p.photos = [{ id: "chai", file: "t/chai.jpg", caption: "" }];
  assert.deepEqual(extractPhoto(p, "Look!\n[photo:chai]"), { text: "Look!", photo: p.photos[0] });
  assert.deepEqual(extractPhoto(p, "Hi [photo:nope]"), { text: "Hi", photo: undefined });
});

test("normalizePhone handles Indian formats", () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+91-9876543210"), "+919876543210");
  assert.equal(normalizePhone("09876543210"), "+919876543210");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("5876543210"), null);
});

test("ageOn computes age and rejects impossible dates", () => {
  const today = new Date(Date.UTC(2026, 9, 5));
  assert.equal(ageOn("2008-10-05", today), 18);
  assert.equal(ageOn("2008-10-06", today), 17);
  assert.equal(ageOn("2001-02-30", today), null);
  assert.equal(ageOn("05/10/2000", today), null);
});
