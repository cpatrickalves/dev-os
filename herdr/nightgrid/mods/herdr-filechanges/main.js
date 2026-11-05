import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, v_resizable, resizable_panel, Editor, EditorState } from "gpui-base";
import { appHome, home, agents, focused, panes, props, closeOverlay, exec, notify, readTextFile, run, shared, setShared, terminals, theme, settings, watchFolder } from "herdr";

// The snapshot the `herdr-filechanges` pi extension writes: pi's own log of the
// files it edited since the last accept (baselines from the session entries),
// which is a different set from this app's git-based `changes` panel.
const DATA = () => `${appHome()}/data/herdr-filechanges`;
// Pi writes its own terminal address (HC_TERMINAL_ID); remote ones carry a `machine/` prefix.
const snapshotPath = (address) => `${DATA()}/${address.slice(address.lastIndexOf("/") + 1)}.json`;
const icon = (name) => `mods/herdr-filechanges/icons/${name}.svg`;
// Paths outside the pi's folder arrive absolute; the home prefix is noise in a narrow pane.
const shortPath = (path) => {
  const h = home().replace(/\\/g, "/").replace(/\/$/, "");
  return h && path.startsWith(h + "/") ? "~" + path.slice(h.length) : path;
};

// pi knows two kinds; herdr-van has no letter badges, so these are small flat chips.
const KIND = { new: { label: "A", color: "ansi2" }, edited: { label: "M", color: "accent" } };
const kindOf = (f) => KIND[f.kind] ?? KIND.edited;

// Row heights: an indent guide inside a row has to match it, or the rail breaks at the seam.
const DIR_ROW = 24;
const FILE_ROW = 26;

// The shell's highlighter takes semantic names, not colors of its own.
const SYNTAX = (t) => ({
  keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi6,
  number: t.ansi3, constant: t.ansi3, variable: t.foreground, operator: t.muted,
  punctuation: t.dim, boolean: t.ansi3,
});

const LANGUAGES = {
  php: "php", ts: "typescript", tsx: "tsx", js: "javascript", jsx: "javascript", mjs: "javascript",
  cjs: "javascript", json: "json", md: "markdown", css: "css", scss: "scss", html: "html",
  py: "python", rs: "rust", go: "go", java: "java", kt: "kotlin", c: "c", h: "c", cpp: "cpp",
  sh: "bash", ps1: "powershell", yml: "yaml", yaml: "yaml", sql: "sql", xml: "xml",
  toml: "toml", vue: "vue", svelte: "svelte", diff: "diff",
};
function languageOf(path) {
  const parts = String(path || "").split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  return LANGUAGES[ext] || "text";
}

// Rows of a unified patch. Header noise (Index:, ===, ---, +++) is dropped — the File list
// already names the file — and so is the marker character: the tint says what it said.
function diffRows(patch) {
  const rows = [];
  let old = 0, next = 0, inHunk = false;
  for (const line of String(patch || "").split("\n")) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) { inHunk = true; old = +hunk[1]; next = +hunk[2]; rows.push({ kind: "@", text: line }); continue; }
    // Everything before the first hunk is `Index:`, `===`, `--- name`, `+++ name`:
    // the file's own header, and the reason "read only inside a hunk" is required —
    // `--- name` starts with `-` and `+++ name` with `+`.
    if (!inHunk) continue;
    const marker = line.charAt(0);
    if (marker === "+") rows.push({ kind: "+", number: next++, text: line.slice(1) });
    else if (marker === "-") rows.push({ kind: "-", number: old++, text: line.slice(1) });
    else if (marker === " ") rows.push({ kind: " ", number: next++, text: line.slice(1) });
    else if (marker === "\\") rows.push({ kind: "meta", text: line });
  }
  return rows;
}

const KEYWORDS = new Set(("abstract and as async await break case catch class const continue default delete do else enum export extends false final finally for from function if implements import in instanceof interface let new null of or private protected public readonly return static super switch this throw true try type typeof undefined var void while yield").split(" "));
const EXTRA = {
  python: new Set(("def elif except lambda None pass True False with yield").split(" ")),
  php: new Set(("echo elseif fn foreach namespace use require include").split(" ")),
  rust: new Set(("fn impl mut pub Some None Ok Err struct trait match").split(" ")),
  golang: new Set(("chan defer func go package range select").split(" ")),
  bash: new Set(("esac fi done then local export").split(" ")),
};
const HASH_COMMENT = new Set(["python", "bash", "yaml", "toml", "powershell", "ruby", "makefile"]);
const PLAIN = new Set(["text", "markdown"]);  // prose: a keyword in a sentence is not a keyword

/** `[{ text, cls }]` where cls is a SYNTAX key or "plain". */
function tokenize(text, language) {
  if (PLAIN.has(language)) return [{ text, cls: "plain" }];
  const hash = HASH_COMMENT.has(language) ? "#[^\\n]*|" : "";
  const re = new RegExp(`(${hash}\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`|\\b\\d[\\w.]*\\b|\\b[A-Za-z_$][\\w$]*\\b|\\s+|[^\\s\\w])`, "g");
  const words = new Set([...KEYWORDS, ...(EXTRA[language] ?? [])]);
  const spans = [];
  let last = 0, match;
  while ((match = re.exec(text))) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index), cls: "plain" });
    const token = match[0];
    let cls = "plain";
    if (token.startsWith("/*") || token.startsWith("//") || (hash && token.startsWith("#"))) cls = "comment";
    else if (/^["'`]/.test(token)) cls = "string";
    else if (/^\d/.test(token)) cls = "number";
    else if (/^\s+$/.test(token)) cls = "plain";
    else if (/^[A-Za-z_$]/.test(token)) {
      const after = text.slice(match.index + token.length).trimStart();
      if (words.has(token)) cls = token === "true" || token === "false" || token === "null" || token === "None" ? "boolean" : "keyword";
      else if (after.startsWith("(")) cls = "function";
      else if (/^[A-Z]/.test(token)) cls = "type";
      else cls = "variable";
    } else cls = "punctuation";
    spans.push({ text: token, cls });
    last = match.index + token.length;
  }
  if (last < text.length) spans.push({ text: text.slice(last), cls: "plain" });
  return spans;
}

// Wrap points for a diff line: one box per word, each keeping the spaces that follow it, so
// the row's flex can break a long line while every box keeps its token colour. Only spaces
// are break points — an unbroken token still overflows, the shell has no break-word.
function wrapWords(spans) {
  const out = [];
  for (const span of spans) {
    let at = 0;
    for (let i = 0; i < span.text.length; i += 1) {
      if (span.text[i] !== " ") continue;
      out.push({ text: span.text.slice(at, i + 1), cls: span.cls });
      at = i + 1;
    }
    if (at < span.text.length) out.push({ text: span.text.slice(at), cls: span.cls });
  }
  return out;
}

/** The terminal this pane was pinned to (`pane.split … props: {terminal}`), or null. */
function pinnedTerminal() {
  const pinned = props()?.terminal;
  return typeof pinned === "string" && pinned ? pinned : null;
}

/**
 * The pi this panel speaks for. Opened as a pane beside a pi, it is told which one
 * (`pane.split {mod, props: {terminal}}`) and stays on it; opened any other way it
 * follows the person: the focused pane's terminal when that is a pi, else the focused
 * space's pi (its focused one, else the first).
 */
function piTerminal() {
  const pinned = pinnedTerminal();
  if (pinned) return pinned;
  const f = focused();
  if (!f) return null;
  const pane = f.pane ? panes().find((p) => p.pane === f.pane) : null;
  const own = pane?.terminal ?? f.terminal ?? null;
  const list = agents();
  const here = list.find((a) => a.address === own);
  if (here?.app === "pi") return here.address;
  const inSpace = list.filter((a) => a.app === "pi" && a.space === f.space);
  return (inSpace.find((a) => a.focused) ?? inSpace[0])?.address ?? null;
}

/**
 * The pi's own address plus every terminal it started — its sub-agents, and theirs —
 * because a sub-agent works on the same tree and its edits are the same work. The order
 * puts the pi itself first, so its own files win when two sessions touched one path.
 */
function withSubagents(address) {
  const all = terminals() ?? [];
  const out = [address];
  for (let i = 0; i < out.length; i++) {
    for (const term of all) if (term.parent === out[i] && !out.includes(term.address)) out.push(term.address);
  }
  return out;
}

export default class HerdrFileChanges extends View {
  init(_props, cx) {
    this.address = null;
    this.sources = [];      // the pi and its sub-agents, own first
    this.snapshots = {};    // address -> snapshot, for every source that published
    this.open = null;
    this.mode = "diff";      // "diff" (what changed) or "file" (the whole file, highlighted)
    this.view = shared("herdr-filechanges.view") === "flat" ? "flat" : "tree";
    this.wrap = shared("herdr-filechanges.wrap") !== "off";  // soft-wrap long lines, both modes
    this.collapsed = new Set();  // folder paths the person folded away
    this.editor = null;
    this.editorKey = null;
    this.rows = [];
    this.rowsKey = null;
    this.fileText = null;    // { path, text } for "file" mode
    this.note = null;
    this.onPane = false;     // the pointer is over this pane, so its actions are shown
    this.busy = false;
    this.action = null;      // the command in flight, so only its own button says so
    this.watching = false;
    this.handle = cx.focus_handle();
    this.watchHost(cx);
    this.sync(cx);
    // The extension replaces the snapshot atomically; watch its folder instead of polling.
    cx.spawn(async (cx) => {
      for (;;) {
        try {
          await watchFolder(DATA());
          this.watching = true;
        } catch {
          // The folder appears with the first snapshot; the timer below retries.
          this.watching = false;
          return;
        }
        this.sync(cx);
        cx.notify();
      }
    });
    cx.timer.every(5000, (cx) => { if (!this.watching) this.sync(cx); });
  }

  // A split pinned to a terminal belongs to it: when that terminal's pane goes away, so
  // does this panel. Panes carry no props, so the panel finds itself by mod name in the tab
  // it was created in — remembered once, because it stays where it was created.
  watchHost(cx) {
    const pinned = pinnedTerminal();
    if (!pinned) return;
    let hostTab = null;
    const watch = cx.timer.every(1000, () => {
      const host = panes().find((p) => p.terminal === pinned);
      if (host) {
        if (!hostTab) hostTab = host.tab;
        return;
      }
      if (!hostTab) return; // never saw it: not ours to close
      const self = panes().find((p) => p.mod === "herdr-filechanges" && p.tab === hostTab);
      watch.cancel();
      if (self) run("pane.close", { pane: self.pane });
    });
  }

  sync(cx) {
    const address = piTerminal();
    if (address !== this.address) {
      this.address = address;
      this.sources = [];
      this.snapshots = {};
      this.open = null;
      this.fileText = null;
      this.note = null;
    }
    if (!address) return;
    const sources = withSubagents(address);
    cx.spawn(async (cx) => {
      const snapshots = {};
      for (const source of sources) {
        // pi replaces its snapshot by rename, so a read can land mid-swap, and a session
        // may never have written one: neither may blank a list the person is reading.
        const text = await readTextFile(snapshotPath(source)).catch(() => null);
        let fresh = null;
        try { if (text !== null) fresh = JSON.parse(text); } catch { fresh = null; }
        snapshots[source] = fresh ?? this.snapshots[source] ?? null;
      }
      if (address !== this.address) return;
      this.sources = sources;
      this.snapshots = snapshots;
      const files = this.mergedFiles();
      if (!files.some((f) => f.path === this.open)) this.open = files[0]?.path ?? null;
      if (this.mode === "file") this.loadFile(this.file(), cx);
      this.refresh(cx);
    });
  }

  /** Every source's files as one list, each row remembering which sessions own it. */
  mergedFiles() {
    const seen = new Map();
    for (const source of this.sources) {
      for (const file of this.snapshots[source]?.files ?? []) {
        const known = seen.get(file.path);
        // One path touched by two sessions is one row, but accepting must reach both.
        if (known) { known.owners.push(source); continue; }
        seen.set(file.path, { ...file, owners: [source] });
      }
    }
    return [...seen.values()];
  }

  file() {
    return this.mergedFiles().find((f) => f.path === this.open) ?? null;
  }

  /** The current file, for "file" mode: pi's absolute path is readable in the home folder. */
  loadFile(file, cx) {
    if (!file || (this.fileText && this.fileText.path === file.path)) return;
    const absolute = file.path.charAt(0) === "/" || file.path.charAt(1) === ":";
    const cwd = this.snapshots[file.owners[0]]?.cwd ?? "";
    const path = absolute ? file.path : (cwd + "/" + file.path).replace(/\\/g, "/");
    this.fileText = { path: file.path, text: null };
    cx.spawn(async (cx) => {
      const text = await readTextFile(path).catch(() => null);
      if (this.fileText?.path !== file.path) return;
      this.fileText = { path: file.path, text: text === null ? null : text.slice(0, 400_000) };
      this.refresh(cx);
    });
  }

  pick(path, cx) {
    this.open = this.open === path ? null : path;
    this.note = null;
    if (this.mode === "file") this.loadFile(this.file(), cx);
    this.refresh(cx);
  }

  setView(view, cx) {
    if (this.view === view) return;
    this.view = view;
    setShared("herdr-filechanges.view", view);
    cx.notify();
  }

  setWrap(on, cx) {
    if (this.wrap === on) return;
    this.wrap = on;
    setShared("herdr-filechanges.wrap", on ? "on" : "off");
    // The editor wraps in place; the diff rows carry word boxes, so they rebuild.
    if (this.editor?.set_soft_wrap) this.editor.set_soft_wrap(on);
    this.rowsKey = null;
    this.refresh(cx);
  }

  toggleDir(path, cx) {
    if (!this.collapsed.delete(path)) this.collapsed.add(path);
    cx.notify();
  }

  setMode(mode, cx) {
    this.mode = mode;
    this.fileText = null;
    if (mode === "file") this.loadFile(this.file(), cx);
    this.refresh(cx);
  }

  /** Rebuild what the current mode and file imply, then repaint. */
  refresh(cx) {
    this.ensureEditor();
    this.ensureRows();
    cx.notify();
  }

  /**
   * One editor per (mode, file, revision): the shell keeps the language and its parse,
   * so a new state is only built when one of those actually changes. Never called from
   * render — the shell forbids creating state there — only from init, events and tasks.
   */
  ensureEditor() {
    if (this.mode !== "file") {
      if (this.editor && this.editor.release) this.editor.release();
      this.editor = null;
      this.editorKey = null;
      return;
    }
    const file = this.file();
    const text = !file ? "" : this.fileText && this.fileText.path === file.path ? this.fileText.text : null;
    const path = file ? file.path : "";
    const revision = file ? file.updatedAt : 0;
    const key = this.mode + "|" + path + "|" + revision + "|" + (text === null ? "none" : "text");
    if (this.editorKey === key) return;
    if (text === null) {
      // "file" mode before the text arrives: nothing to draw yet.
      this.editor = null;
      this.editorKey = null;
      return;
    }
    if (this.editor && this.editor.release) this.editor.release();
    const t = theme();
    this.editor = EditorState.new({
      language: languageOf(file ? file.path : ""),
      value: text ?? "",
      readonly: true,
      folding: false,
      line_numbers: true,
      soft_wrap: this.wrap,
      font_family: settings().font_family ?? "JetBrains Mono",
      font_size: 11,
      syntax: SYNTAX(t),
    });
    this.editorKey = key;
  }

  ensureRows() {
    const file = this.file();
    const key = file ? `${file.path}|${file.updatedAt}|${this.mode}` : "";
    if (this.rowsKey === key) return;
    this.rowsKey = key;
    const rows = file && this.mode === "diff" ? diffRows(file.diff) : [];
    const language = languageOf(file ? file.path : "");
    // 4 000 rows is far past pi's own diff cap; the guard exists so a hostile patch cannot
    // build an unbounded element tree in one frame.
    this.rows = rows.slice(0, 4000).map((row) => {
      if (row.kind === "meta" || row.kind === "@") return row;
      const spans = tokenize(row.text, language);
      return { ...row, boxes: this.wrap ? wrapWords(spans) : spans };
    });
  }

  command(command, cx) {
    if (!this.address || this.busy) return;
    // Every session shown here, not just the pi: a sub-agent baselines its own files, so
    // leaving it out would leave its rows listed after the person accepted them.
    const targets = [...new Set(this.mergedFiles().flatMap((f) => f.owners))];
    if (!targets.length) return;
    this.busy = true;
    this.action = command;
    this.note = null;
    cx.spawn(async (cx) => {
      const failed = [];
      try {
        for (const address of targets) {
          // The extension's own command; `force` because a mod can never answer its confirm prompt.
          const r = await exec("hc", ["send", address, `/${command} force`])
            .catch((e) => ({ code: -1, stdout: "", stderr: String(e) }));
          if (r.code !== 0) failed.push(`${address}: ${(r.stderr || r.stdout).trim()}`);
        }
        if (failed.length) this.note = `Failed: ${failed.join("; ")}`;
        else notify({ title: command === "filechanges-accept" ? "pi changes accepted" : "pi changes reverted", body: targets.join(", "), level: "success" });
      } finally {
        this.busy = false;
        this.action = null;
        this.sync(cx);
        cx.notify();
      }
    });
    cx.notify();
  }

  // Indent guides: one hairline per ancestor level, painted as the cell's left border —
  // a border lands on whole pixels, while a centred 1px child lands on a half pixel at
  // odd depths and the rail then walks 1px sideways row to row.
  guides(t, depth, h) {
    return h_flex().w(depth * 12).h(h).flex_none().gap(0)
      .children(Array.from({ length: depth }, () => div().w(12).h(h).flex_none()
        .border_l(1).border_color(t.border)));
  }

  // Rows: the height, the marker, the name, then its folder as a dim tail in the flat view.
  fileRow(f, t, depth = 0, showFolder = true) {
    const kind = kindOf(f);
    const tone = t[kind.color] ?? t.muted;
    const parts = shortPath(f.path).split("/"), name = parts.pop();
    const on = this.open === f.path;
    return h_flex().id(`pi-change-${f.path}`).h(FILE_ROW).flex_none().pl(6).pr(6).gap(6).items_center().rounded(6).text_size(12)
      .cursor_pointer().hover((s) => s.bg(t.hover)).when(on, (e) => e.bg(t.selected))
      .on_click((_e, cx) => this.pick(f.path, cx))
      .when(depth > 0, (e) => e.child(this.guides(t, depth, FILE_ROW)))
      .child(div().w(16).h(16).flex_none().flex().items_center().justify_center().rounded(4)
        .bg(tone + "22").text_size(9.5).font_semibold().text_color(tone).child(kind.label))
      .child(h_flex().flex_1().min_w(0).gap(5).text_color(on ? t.foreground : t.muted)
        .child(div().flex_none().child(name))
        .when(showFolder, (e) => e.child(div().min_w(0).truncate().text_size(11).text_color(t.dim).child(parts.length ? parts.join("/") : "")))
        .when(!showFolder, (e) => e.child(div().w(16).flex_none())))
      .when(f.added > 0, (e) => e.child(div().flex_none().text_size(11).text_color(t.ansi2).child(`+${f.added}`)))
      .when(f.removed > 0, (e) => e.child(div().flex_none().text_size(11).text_color(t.ansi1).child(`−${f.removed}`)));
  }

  // pi reports paths, so the tree is built from strings — no directory reads (mods/files
  // lists a real folder with exec instead). Folders come first, then files, each sorted.
  treeRows(files, t) {
    const root = { path: "", dirs: new Map(), files: [] };
    for (const f of files) {
      const parts = shortPath(f.path).split("/");
      const name = parts.pop();
      let node = root;
      for (const part of parts) {
        const path = node.path ? `${node.path}/${part}` : part;
        if (!node.dirs.has(part)) node.dirs.set(part, { path, dirs: new Map(), files: [] });
        node = node.dirs.get(part);
      }
      node.files.push({ ...f, name });
    }
    const count = (node) => node.files.length + [...node.dirs.values()].reduce((n, d) => n + count(d), 0);
    const out = [];
    const walk = (node, depth) => {
      for (const name of [...node.dirs.keys()].sort()) {
        const dir = node.dirs.get(name), shut = this.collapsed.has(dir.path);
        out.push(h_flex().id(`pi-dir-${dir.path}`).h(DIR_ROW).flex_none().pl(6).pr(6).gap(6)
          .items_center().rounded(6).cursor_pointer().hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.toggleDir(dir.path, cx))
          .when(depth > 0, (e) => e.child(this.guides(t, depth, DIR_ROW)))
          .child(svg(icon(shut ? "chevron-right" : "chevron-down")).size(11).flex_none().text_color(t.dim))
          .child(div().text_size(11.5).text_color(t.muted).child(name))
          .child(div().text_size(10).text_color(t.dim).child(String(count(dir)))));
        if (!shut) walk(dir, depth + 1);
      }
      for (const f of node.files) out.push(this.fileRow(f, t, depth, false));
    };
    walk(root, 0);
    return out;
  }

  // The tint carries the marker: what was added, what was removed, no `+`/`-` glyph.
  diffRow(row, t) {
    const wrap = this.wrap;
    const line = (text) => div().flex_none().px(8).py(2).text_size(11).text_color(t.dim)
      .when(wrap, (e) => e.whitespace_normal()).when(!wrap, (e) => e.h(18).truncate()).child(text);
    if (row.kind === "@") return line(row.text).bg(t.raised);
    if (row.kind === "meta") return line(row.text);
    const tint = row.kind === "+" ? t.ansi2 + "18" : row.kind === "-" ? t.ansi1 + "18" : null;
    const syntax = SYNTAX(t);
    // One element per span: the shell has no rich-text element, so a coloured run of text is
    // a box of its own. Wrapped, those boxes are words and the row's flex breaks between them;
    // unwrapped, they stay on one line and truncate.
    return h_flex().flex_none().px(6).gap(6).when(Boolean(tint), (e) => e.bg(tint))
      .when(wrap, (e) => e.items_start().py(2)).when(!wrap, (e) => e.items_center().h(18))
      .child(div().w(30).flex_none().text_right().text_size(10.5).text_color(t.dim)
        .child(row.number === undefined ? "" : String(row.number)))
      .child(h_flex().flex_1().min_w(0).gap(0).text_size(11)
        .when(wrap, (e) => e.flex_wrap()).when(!wrap, (e) => e.truncate())
        .children(row.boxes.map((box) =>
          div().flex_none().when(Boolean(syntax[box.cls]), (e) => e.text_color(syntax[box.cls])).child(box.text))));
  }

  // A section's own rule: name (and count) on the left, its facts on the right.
  section(id, label, count, t, right) {
    return h_flex().id(id).h(22).flex_none().px(8).gap(6).items_center()
      .bg(t.raised).text_size(10.5).text_color(t.dim)
      .child(div().font_semibold().text_color(t.foreground).child(label))
      .when(count !== null, (e) => e.child(div().px(4).rounded(4).bg(t.background).text_size(10).text_color(t.dim).child(String(count))))
      .child(div().flex_1())
      .child(right);
  }

  // An icon chip for a section rule: the chosen one reads bright, the other dim.
  iconChip(id, glyph, t, active, on) {
    return div().id(id).h(16).w(18).flex().items_center().justify_center().rounded(4).cursor_pointer()
      .bg(active ? t.selected : t.background).text_color(active ? t.foreground : t.dim)
      .hover((s) => s.text_color(t.foreground)).on_click(on)
      .child(svg(icon(glyph)).size(11).flex_none());
  }

  // Icon + label chip, as the sidebar's buttons are drawn.
  button(id, label, glyph, tones, enabled, on) {
    return h_flex().id(id).h(26).flex_none().px(9).gap(5).items_center().rounded(6).text_size(11.5)
      .bg(tones.bg).text_color(tones.text).when(enabled, (e) => e.cursor_pointer().hover((s) => s.bg(tones.hover).text_color(tones.hoverText)))
      .on_click(on)
      .child(svg(icon(glyph)).size(12).flex_none()).child(label);
  }

  render(cx) {
    if (piTerminal() !== this.address) this.sync(cx);
    const t = theme();
    const files = this.mergedFiles();
    const add = files.reduce((n, f) => n + f.added, 0);
    const rem = files.reduce((n, f) => n + f.removed, 0);
    const file = this.file();
    const enabled = Boolean(this.address && files.length && !this.busy);

    // The editor is built in an event handler or task (render may not create state); read it here.
    const editor = this.editor;
    // Pointer-in-pane tracking, attached to the elements that cover the pane: a mouse
    // move arrives only while hovering, and the hover exit clears it again.
    const inPane = (el) => el
      .on_mouse_move((_e, cx) => { if (!this.onPane) { this.onPane = true; cx.notify(); } })
      .on_hover((on, cx) => { if (!on && this.onPane) { this.onPane = false; cx.notify(); } });
    const pending = this.mode === "file" && Boolean(file) && (!this.fileText || this.fileText.path !== file.path);
    // Nothing to draw: no rows yet in diff mode, no editor yet in file mode.
    const empty = this.mode === "diff" ? this.rows.length === 0 : !editor;

    const anySnapshot = this.sources.some((source) => Boolean(this.snapshots[source]));
    const headline = !this.address
      ? "No pi session in this space"
      : !anySnapshot
        ? `${this.address} hasn't published yet`
        : "No pi changes recorded";
    const hint = !this.address || anySnapshot ? null : "restart pi there, or /reload";

    // 0.8 alpha: the window's background reads faintly through the body, rows stay legible.
    return v_flex().id("herdr-filechanges").size_full().min_h(0).overflow_hidden()
      .bg(t.background + "cc").text_color(t.foreground).track_focus(this.handle)
      // "The pointer is in this pane": a mouse move is delivered only while hovering, and
      // the hover exit clears it, so the footer's actions are here while the person is.
      // It rides on these two wrappers rather than the root — a handler on a pane mod's
      // root never fires — and together they cover every pixel of the pane.
      .child(inPane(v_flex().id("pi-changes-body").flex_1().min_h(0))
      // The shell's own splitter: drag the divider, sizes live in the window and survive repaints.
        .child(v_resizable("pi-changes-split").flex_1().min_h(0)
        .child(resizable_panel().size(200).size_range(88, 900)
          .child(v_flex().id("files").size_full().min_h(0)
            .child(this.section("files-head", "File", files.length, t, h_flex().min_w(0).gap(5)
              .when(add > 0, (e) => e.child(div().text_size(10.5).text_color(t.ansi2).child(`+${add}`)))
              .when(rem > 0, (e) => e.child(div().text_size(10.5).text_color(t.ansi1).child(`−${rem}`)))
              .child(this.iconChip("file-view-flat", "list", t, this.view === "flat", (_e, cx) => { this.setView("flat", cx); }))
              .child(this.iconChip("file-view-tree", "folder-tree", t, this.view === "tree", (_e, cx) => { this.setView("tree", cx); }))
              // Not a feature: mod.open opens this mod as the overlay its mod.json describes —
              // content-sized, clipped, with no close of its own. This is the way out.
              .when(Boolean(props()?.overlay), (e) => e.child(div().id("pi-close").w(16).h(16).flex_none().ml(2)
                .flex().items_center().justify_center().rounded(4).cursor_pointer().text_color(t.dim)
                .hover((s) => s.bg(t.hover).text_color(t.foreground))
                .on_click(() => closeOverlay(props().overlay)).child(svg(icon("x")).size(10))))))
            .child(v_flex().id("files-body").flex_1().min_h(0).overflow_y_scrollbar().p(4)
              .children(this.view === "tree" ? this.treeRows(files, t) : files.map((f) => this.fileRow(f, t)))
              .when(!files.length, (e) => e.child(h_flex().h(26).px(6).gap(7).items_center().text_size(12).text_color(t.dim)
                .child(svg(icon("clock")).size(13).flex_none())
                .child(v_flex().gap(1).child(div().child(headline))
                  .when(Boolean(hint), (x) => x.child(div().text_size(11).text_color(t.dim).child(hint)))))))))
        .child(resizable_panel()
          .child(v_flex().id("code").size_full().min_h(0)
            .child(this.section("code-head", "Code", null, t, h_flex().min_w(0).gap(5)
              .when(Boolean(file), (e) => {
                const kind = kindOf(file);
                return e.child(div().font_semibold().text_color(t[kind.color] ?? t.accent).child(kind.label));
              })
              .when(Boolean(file?.truncated), (x) => x.child(div().child("truncated")))
              .when(!file, (e) => e.child(div().child(files.length ? "no file selected" : "")))
              .child(this.iconChip("mode-wrap", "wrap-text", t, this.wrap, (_e, cx) => { this.setWrap(!this.wrap, cx); }))
              .child(this.iconChip("mode-diff", "diff", t, this.mode === "diff", (_e, cx) => { this.setMode("diff", cx); }))
              .child(this.iconChip("mode-file", "code", t, this.mode === "file", (_e, cx) => { this.setMode("file", cx); }))))
            .child(div().flex_1().min_h(0)
              .when(this.mode === "diff" && this.rows.length > 0, (e) =>
                e.child(v_flex().id("pi-diff").size_full().min_h(0).overflow_y_scrollbar()
                  .children(this.rows.map((row) => this.diffRow(row, t)))))
              .when(this.mode === "file" && Boolean(editor), (e) => e.child(Editor.new(editor)))
              .when(empty, (e) => e.child(div().p(8).text_size(11).text_color(t.dim)
                .child(pending ? "Reading the file…" : "Select a file to see its changes"))))))))
      .when(Boolean(this.note), (e) => e.child(div().px(8).pb(6).text_size(11).text_color(t.ansi1).child(this.note)))
      // The actions are hover-only. The row keeps a fixed height (26px buttons + 12px of
      // padding) so the diff above it never resizes as the pointer comes and goes.
      .child(inPane(h_flex().id("pi-changes-actions").flex_none().h(38).px(8).gap(6).items_center().border_t(1).border_color(t.border).when(this.onPane, (e) => e
          .child(this.button("pi-accept", this.busy && this.action === "filechanges-accept" ? "Accepting…" : "Accept", "check",
            // Primary: the accent fill with its ink. `solid`/`solid_foreground` are the theme's own
            // primary pair, but a theme may leave them undefined, which falls back to ink-on-paper.
            { bg: enabled ? t.accent : t.raised, text: enabled ? t.accent_foreground : t.dim, hover: t.ansi12, hoverText: t.accent_foreground },
            enabled, (_e, cx) => this.command("filechanges-accept", cx)))
          .child(this.button("pi-revert", this.busy && this.action === "filechanges-decline" ? "Reverting…" : "Revert", "x",
            { bg: t.raised, text: enabled ? t.ansi1 : t.dim, hover: t.ansi1 + "22", hoverText: t.ansi9 },
            enabled, (_e, cx) => this.command("filechanges-decline", cx))))
        .child(div().flex_1())
        .when(Boolean(this.address), (e) => e.child(div().text_size(10.5).text_color(t.dim)
          .child(this.sources.length > 1 ? `${this.address} +${this.sources.length - 1}` : this.address)))));
  }
}
