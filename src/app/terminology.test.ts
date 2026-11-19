import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Terminology guard: AegisNet user-facing UI must say Network/Room, never
 * "server"/"channel", and Trusted/Known Contact rather than "Friend".
 * "Server" is allowed ONLY in backend-infrastructure contexts (the Admin
 * Center's operator tools), which are excluded below.
 */

const UI_ROOTS = [join(process.cwd(), "src", "app", "screens"), join(process.cwd(), "src", "app", "components"), join(process.cwd(), "src", "app", "data")];

// Admin Center = backend operator tooling where "server" wording is explicitly allowed.
const ALLOWED_PATH_FRAGMENTS = ["components\\admin", "components/admin", "AdminCenterScreen"];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

const files = UI_ROOTS.flatMap(collectFiles).filter(
  (file) => !ALLOWED_PATH_FRAGMENTS.some((fragment) => file.includes(fragment)),
);

// Visible JSX text between tags, e.g. >Mutual Servers<
const visibleText = (source: string) => Array.from(source.matchAll(/>([^<>{}]+)</g)).map((match) => match[1]);
// Quoted string literals (labels, placeholders, titles).
const stringLiterals = (source: string) => Array.from(source.matchAll(/"([^"\\]{2,120})"/g)).map((match) => match[1]);

describe("user-facing terminology", () => {
  it("never says Mutual Server / Server Settings / Server Profile / Invite to Server / Leave Server", () => {
    const banned = [/mutual server/i, /server settings/i, /server profile/i, /invite to server/i, /leave server/i];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of banned) {
        expect(pattern.test(source), `${relative(process.cwd(), file)} contains banned phrase ${pattern}`).toBe(false);
      }
    }
  });

  it("does not show the words 'server' or 'channel' in visible UI text", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const text of [...visibleText(source), ...stringLiterals(source)]) {
        const lowered = text.toLowerCase();
        // Word-boundary match so identifiers like updateChannel don't trip it.
        const offender = /\bservers?\b/.test(lowered) || /\bchannels?\b/.test(lowered);
        expect(offender, `${relative(process.cwd(), file)} shows "${text.trim()}" in user-facing text`).toBe(false);
      }
    }
  });

  it("uses Known/Trusted Contact instead of Friend in user-facing roles and labels", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const text of [...visibleText(source), ...stringLiterals(source)]) {
        // "friendly" (e.g. dyslexia-friendly, friendly errors) is fine; the label "Friend" is not.
        const offender = /\bfriends?\b/i.test(text) && !/friendly/i.test(text);
        expect(offender, `${relative(process.cwd(), file)} shows "${text.trim()}" — use Trusted Contact or Known Contact`).toBe(false);
      }
    }
  });
});
