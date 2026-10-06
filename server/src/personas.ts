import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { PERSONAS_DIR, MEDIA_DIR } from "./config.ts";

export type PersonaPhoto = { id: string; file: string; caption: string };

export type Persona = {
  id: string;
  name: string;
  age: number;
  city: string;
  languages: string[];
  tagline: string;
  /** One line in her own voice; falls back to the tagline. */
  vibe: string;
  /** Mood chips shown on her card. */
  tags: string[];
  /** Quick-reply suggestions for the user. */
  starters: string[];
  /** Two hex colors for her card gradient, or null for the app default. */
  accent: [string, string] | null;
  avatar?: string;
  greeting: string;
  enabled: boolean;
  sortOrder: number;
  photos: PersonaPhoto[];
  systemPrompt: string;
};

const BASE_FILE = "_base.md";
const DEFAULT_STARTERS = ["Kya kar rahi ho?", "Tumhara din kaisa tha?"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

let cache: { signature: string; personas: Map<string, Persona> } | null = null;

/**
 * Returns all personas, re-reading the markdown files whenever any of them
 * changes on disk. Edit a persona file and the next request picks it up.
 */
export function getPersonas(): Map<string, Persona> {
  const files = fs.readdirSync(PERSONAS_DIR).filter((f) => f.endsWith(".md")).sort();
  const signature = files
    .map((f) => `${f}:${fs.statSync(path.join(PERSONAS_DIR, f)).mtimeMs}`)
    .join("|");
  if (cache?.signature === signature) return cache.personas;

  const base = files.includes(BASE_FILE)
    ? fs.readFileSync(path.join(PERSONAS_DIR, BASE_FILE), "utf8")
    : "";

  const personas = new Map<string, Persona>();
  for (const file of files) {
    if (file.startsWith("_")) continue;
    try {
      const persona = parsePersonaFile(fs.readFileSync(path.join(PERSONAS_DIR, file), "utf8"), base);
      if (personas.has(persona.id)) throw new Error(`duplicate id "${persona.id}"`);
      personas.set(persona.id, persona);
    } catch (err) {
      // One broken file shouldn't take the whole app down.
      console.error(`[personas] skipping ${file}: ${(err as Error).message}`);
    }
  }
  cache = { signature, personas };
  console.log(`[personas] loaded ${personas.size}: ${[...personas.keys()].join(", ")}`);
  return personas;
}

export function getPersona(id: string): Persona | undefined {
  const p = getPersonas().get(id);
  return p?.enabled ? p : undefined;
}

export function listEnabledPersonas(): Persona[] {
  return [...getPersonas().values()]
    .filter((p) => p.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function parsePersonaFile(raw: string, base: string): Persona {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("missing --- frontmatter block");
  const meta = (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
  const body = stripComments(match[2]).trim();

  const str = (key: string, required = true): string => {
    const v = meta[key];
    if (v === undefined || v === null || v === "") {
      if (required) throw new Error(`"${key}" is required`);
      return "";
    }
    return String(v);
  };

  const id = str("id");
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`id "${id}" must be lowercase letters, digits or dashes`);
  if (!body) throw new Error("system prompt (text after frontmatter) is empty");

  const age = Number(meta.age);
  if (!Number.isFinite(age) || age < 18) throw new Error("age must be a number, 18 or above");

  const photos: PersonaPhoto[] = [];
  for (const p of (meta.photos as PersonaPhoto[] | undefined) ?? []) {
    if (!p?.id || !p?.file) throw new Error("each photo needs an id and a file");
    if (!fs.existsSync(path.join(MEDIA_DIR, p.file))) {
      console.warn(`[personas] ${id}: photo "${p.id}" skipped, missing media/${p.file}`);
      continue;
    }
    photos.push({ id: String(p.id), file: String(p.file), caption: String(p.caption ?? "") });
  }

  const strList = (key: string): string[] =>
    Array.isArray(meta[key]) ? (meta[key] as unknown[]).map((v) => String(v).trim()).filter(Boolean) : [];
  const accent = parseAccent(meta.accent);
  if (meta.accent !== undefined && meta.accent !== null && !accent) {
    console.warn(`[personas] ${id}: ignoring accent, expected two colors like ["#FF8A5B", "#FF3D7F"]`);
  }
  const tagline = str("tagline", false);
  const starters = strList("starters");

  const avatar = str("avatar", false);
  const name = str("name");
  const photoList = photos.length
    ? photos.map((p) => `- ${p.id}: ${p.caption}`).join("\n")
    : "(You have no photos available right now. Do not send any.)";

  const systemPrompt = [
    stripComments(base).replaceAll("{{name}}", name).replaceAll("{{photos}}", photoList).trim(),
    `## Your character\n${body}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id,
    name,
    age,
    city: str("city", false),
    languages: strList("languages"),
    tagline,
    vibe: str("vibe", false) || tagline,
    tags: strList("tags"),
    starters: starters.length ? starters : [...DEFAULT_STARTERS],
    accent,
    avatar: avatar && fs.existsSync(path.join(MEDIA_DIR, avatar)) ? avatar : undefined,
    greeting: str("greeting", false) || `Hi! I'm ${name} 😊`,
    enabled: meta.enabled !== false,
    sortOrder: Number(meta.sortOrder ?? 100),
    photos,
    systemPrompt,
  };
}

function parseAccent(v: unknown): [string, string] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [a, b] = v.map(String);
  return HEX_COLOR.test(a) && HEX_COLOR.test(b) ? [a, b] : null;
}

function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

const PHOTO_TAG = /\[photo:([a-z0-9_-]+)\]/gi;

/** Pulls a `[photo:id]` tag out of a reply; unknown ids are dropped silently. */
export function extractPhoto(persona: Persona, reply: string): { text: string; photo?: PersonaPhoto } {
  let photo: PersonaPhoto | undefined;
  const text = reply
    .replace(PHOTO_TAG, (_, id: string) => {
      photo ??= persona.photos.find((p) => p.id === id.toLowerCase());
      return "";
    })
    .trim();
  return { text, photo };
}
