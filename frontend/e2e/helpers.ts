import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";

import { expect, type Page } from "@playwright/test";

export const API = "http://localhost:8001";
export const PASSWORD = "E2e-pass-123";
export const ACCOUNTS = {
  super: "super@e2e.test",
  staff: "staff@e2e.test",
  bride: "bride@e2e.test",
  groom: "groom@e2e.test",
};

const EMAIL_DIR = join(__dirname, "..", "..", "backend", "e2e_emails");

type Mail = { key: string; to: string; subject: string; body: string };

/** Every email the backend has "sent" (file backend). Order is not reliable. */
export function sentEmails(): Mail[] {
  let files: string[] = [];
  try {
    files = readdirSync(EMAIL_DIR).map((f) => join(EMAIL_DIR, f));
  } catch {
    return [];
  }
  const out: Mail[] = [];
  for (const f of files) {
    // one file can hold several messages separated by a dashed line
    readFileSync(f, "utf8")
      .split(/\n-{20,}\n/)
      .forEach((msg, i) => {
        const to = /^To: (.+)$/im.exec(msg)?.[1]?.trim() ?? "";
        const subject = /^Subject: (.+)$/im.exec(msg)?.[1]?.trim() ?? "";
        if (to) out.push({ key: `${f}#${i}`, to, subject, body: msg });
      });
  }
  return out;
}

/**
 * Run `action`, then wait for a NEW email to `to` whose subject mentions
 * `kind`, and return its 6-digit code (codes lead the subject line).
 */
export async function codeAfter(
  to: string,
  kind: "verification" | "password reset",
  action: () => Promise<unknown>,
): Promise<string> {
  const seen = new Set(sentEmails().map((m) => m.key));
  await action();
  let code = "";
  await expect
    .poll(
      () => {
        const hit = sentEmails().find(
          (m) => !seen.has(m.key) && m.to.toLowerCase() === to.toLowerCase() && m.subject.includes(kind),
        );
        code = /^(\d{6}) /.exec(hit?.subject ?? "")?.[1] ?? "";
        return code;
      },
      { timeout: 15_000, message: `no new ${kind} code emailed to ${to}` },
    )
    .toMatch(/^\d{6}$/);
  return code;
}

/** The single code emailed to `to` so far (for flows that send exactly one). */
export async function onlyCode(to: string, kind: "verification" | "password reset") {
  let code = "";
  await expect
    .poll(() => {
      const hits = sentEmails().filter((m) => m.to.toLowerCase() === to.toLowerCase() && m.subject.includes(kind));
      code = hits.length === 1 ? (/^(\d{6}) /.exec(hits[0].subject)?.[1] ?? "") : "";
      return code;
    }, { timeout: 15_000 })
    .toMatch(/^\d{6}$/);
  return code;
}

export function emailsTo(to: string) {
  return sentEmails().filter((m) => m.to.toLowerCase() === to.toLowerCase());
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/** Minimal valid JPEG/PNG and PDF buffers for upload fields. */
export function pngBuffer(w = 64, h = 64, rgb: [number, number, number] = [200, 60, 90]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3).map((_, i) => rgb[i % 3])]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const pdfBuffer = () =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  );

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a label exactly, with or without the " *" required marker. */
const labelRe = (label: string) => new RegExp(`^${esc(label)}( \\*)?$`);

/** A form field by its exact label; required fields render as "Label *". */
export function field(page: Page, label: string) {
  return page.getByLabel(labelRe(label));
}

/** Base UI <Select>: open the combobox for `label`, pick `option`. */
export async function pickSelect(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: labelRe(label) }).click();
  await page.getByRole("option", { name: option }).first().click();
}
