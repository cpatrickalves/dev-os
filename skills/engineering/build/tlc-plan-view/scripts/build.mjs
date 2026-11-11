#!/usr/bin/env node
// Builds the tlc-plan-view page: wraps the body the agent wrote in the fixed skeleton, embeds the
// fonts, stamps the plan's date and hash, then proves two things before the page is shown:
//   1. every literal of the plan (criteria and their examples, Landing, Assumptions, the plan's own
//      mermaid diagrams) appears in the page's visible text, unchanged;
//   2. the only resource the page loads from the network is Mermaid.
// Usage: node build.mjs <plan.md> <body.html> <out.html> [--lang pt|en]
// Exit 0: page written and verified. Exit 1: page written, verification failed (fix the body and
// rerun). Exit 2: bad input, including a plan that is not in the tlc-plan format. No dependencies.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "..", "assets");
export const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const REQUIRED = ["Problem", "Criteria", "Landing"];

// ---------- plan parsing ----------

export function sections(md) {
  const out = {};
  let name = null;
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence && /^## (.+?)\s*$/.exec(line);
    if (h) { name = h[1]; out[name] = []; continue; }
    if (name) out[name].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n")]));
}

export function missingSections(md) {
  const s = sections(md);
  return REQUIRED.filter((r) => !(r in s));
}

const tableCells = (line) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim()).filter(Boolean);
const isSeparator = (line) => /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");

function tableLiterals(text, where) {
  const out = [];
  const rows = text.split("\n").filter((l) => l.trim().startsWith("|"));
  rows.forEach((row, i) => {
    if (i === 0 || isSeparator(row)) return; // header row is a schema, not a decision
    tableCells(row).forEach((c) => out.push({ where, text: c }));
  });
  return out;
}

function bulletLiterals(text, where) {
  return text.split("\n").filter((l) => /^- /.test(l)).map((l) => ({ where, text: l.slice(2) }));
}

function criteriaLiterals(text) {
  const out = [];
  let cur = null; // the literal still collecting continuation lines
  let n = null; // the criterion the next example belongs to
  const flush = () => { if (cur) out.push(cur); cur = null; };
  for (const line of text.split("\n")) {
    const story = /^### (.+)$/.exec(line);
    const num = /^(\d+)\.\s+(.*)$/.exec(line);
    const sub = /^\s+- (.*)$/.exec(line);
    if (story) { flush(); n = null; out.push({ where: "Criteria story", text: story[1] }); }
    else if (num) { flush(); n = num[1]; cur = { where: `Criterion ${n}`, text: num[2] }; }
    else if (sub && n) { flush(); cur = { where: `Criterion ${n} example`, text: sub[1] }; }
    else if (cur && /^\s+\S/.test(line)) cur.text += " " + line.trim();
    else if (!line.trim()) flush();
  }
  flush();
  return out;
}

export function mermaidBlocks(md) {
  const out = [];
  const re = /^```mermaid\s*\n([\s\S]*?)^```/gm;
  let m;
  while ((m = re.exec(md))) out.push({ where: "mermaid diagram", text: m[1], raw: true });
  return out;
}

export function literals(md) {
  const s = sections(md);
  const out = [...criteriaLiterals(s.Criteria || "")];
  out.push(...tableLiterals(s.Landing || "", "Landing"), ...bulletLiterals(s.Landing || "", "Landing"));
  if (s.Assumptions) {
    out.push(...tableLiterals(s.Assumptions, "Assumptions"));
    const oq = /\*\*Open questions:\*\*\s*(.+)/.exec(s.Assumptions);
    if (oq) out.push({ where: "Open questions", text: oq[1] });
  }
  out.push(...mermaidBlocks(md));
  return out;
}

// ---------- comparison ----------

// Markdown inline syntax becomes the text a reader sees; whitespace is ignored on both sides, so
// only a changed word, number or symbol fails the check.
export function mdToText(s) {
  return s
    .replace(/\\\|/g, "|")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "");
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function htmlToText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
      if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENT[e.toLowerCase()] ?? all;
    });
}

const squash = (s) => s.replace(/\s+/g, "");

export function missingLiterals(md, body) {
  const page = squash(htmlToText(body));
  return literals(md).filter((l) => !page.includes(squash(l.raw ? l.text : mdToText(l.text))));
}

// ---------- network ----------

export function networkViolations(html) {
  const bad = [];
  const tagRe = /<([a-z][\w-]*)\b([^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[1].toLowerCase() === "a") continue; // a link loads nothing until clicked
    const attr = /\b(src|href|srcset|data|poster|action|xlink:href)\s*=\s*["']?\s*((?:https?:)?\/\/[^"'\s>]*)/i.exec(m[2]);
    if (attr) bad.push(`<${m[1]} ${attr[1]}="${attr[2]}">`);
  }
  for (const re of [/url\(\s*['"]?\s*((?:https?:)?\/\/[^'")\s]*)/gi, /@import[^;]*/gi, /\bimport\(\s*['"]([^'"]+)['"]/g,
    /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b\s*\(/g]) {
    while ((m = re.exec(html))) {
      if (m[1] === MERMAID_URL) continue;
      bad.push(m[0].slice(0, 120));
    }
  }
  return bad;
}

// ---------- assembly ----------

export function detectLang(md) {
  const pt = (md.match(/\b(não|ção|ções|são|também|quando|para|uma)\b/gi) || []).length;
  const en = (md.match(/\b(the|and|when|with|which|that)\b/gi) || []).length;
  return pt > en ? "pt" : "en";
}

const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fontsCss() {
  const face = (family, file, weight) =>
    `@font-face { font-family: "${family}"; src: url(data:font/woff2;base64,${readFileSync(join(ASSETS, "fonts", file)).toString("base64")}) format("woff2"); font-weight: ${weight}; font-display: swap; }`;
  return [face("Outfit", "outfit-variable-latin.woff2", "100 900"), face("Martian Mono", "martian-mono-variable-latin.woff2", "100 800")].join("\n  ");
}

export function assemble({ md, body, planPath, lang, date }) {
  const title = (/^# (.+)$/m.exec(md) || [, "Plan"])[1].trim();
  const hash = createHash("sha256").update(md).digest("hex").slice(0, 12);
  const values = {
    __PV_FONTS__: fontsCss(),
    __PV_LANG__: lang,
    __PV_TITLE_JSON__: JSON.stringify(title).replace(/</g, "\\u003c"),
    __PV_PLAN_PATH_JSON__: JSON.stringify(planPath).replace(/</g, "\\u003c"),
    __PV_TITLE__: escHtml(title),
    __PV_PLAN_PATH__: escHtml(planPath),
    __PV_DATE__: date,
    __PV_HASH__: hash,
    __PV_BODY__: body,
  };
  let html = readFileSync(join(ASSETS, "skeleton.html"), "utf8");
  // Body last, and through a function, so nothing the agent wrote is read as a placeholder or a $-pattern.
  for (const [k, v] of Object.entries(values)) html = html.split(k).join(k === "__PV_BODY__" ? "\u0000BODY\u0000" : v);
  return { html: html.replace("\u0000BODY\u0000", () => body), title, hash };
}

// ---------- CLI ----------

function main(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const langFlag = argv.indexOf("--lang");
  if (args.length < 3) {
    console.error("usage: node build.mjs <plan.md> <body.html> <out.html> [--lang pt|en]");
    return 2;
  }
  const [planFile, bodyFile, outFile] = langFlag >= 0 ? args.filter((a) => a !== argv[langFlag + 1]) : args;
  let md, body;
  try { md = readFileSync(planFile, "utf8"); body = readFileSync(bodyFile, "utf8"); }
  catch (e) { console.error(`cannot read input: ${e.message}`); return 2; }

  const missing = missingSections(md);
  if (missing.length) {
    console.error(`not a tlc-plan plan: missing ${missing.map((m) => "## " + m).join(", ")}. Nothing was built.`);
    return 2;
  }
  if (/<\/?(html|head|body)\b/i.test(body)) {
    console.error("body.html must be a fragment: no <html>, <head> or <body>; the skeleton provides them.");
    return 2;
  }

  const lang = langFlag >= 0 ? argv[langFlag + 1] : detectLang(md);
  const rel = relative(process.cwd(), planFile);
  const planPath = rel && !rel.startsWith("..") ? rel : resolve(planFile);
  const date = new Date().toISOString().slice(0, 10);
  const { html, hash } = assemble({ md, body, planPath, lang, date });
  writeFileSync(outFile, html);

  const lits = literals(md);
  const gone = missingLiterals(md, body);
  const net = networkViolations(html);
  console.log(`wrote ${outFile} (${Math.round(html.length / 1024)} KB, lang ${lang}, plan sha256 ${hash})`);
  console.log(`literals: ${lits.length - gone.length}/${lits.length} present`);
  for (const l of gone) console.log(`  MISSING [${l.where}] ${l.text.replace(/\s+/g, " ").slice(0, 160)}`);
  console.log(`network: ${net.length ? net.length + " violation(s)" : "only Mermaid"}`);
  for (const v of net) console.log(`  BLOCKED ${v}`);
  return gone.length || net.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
