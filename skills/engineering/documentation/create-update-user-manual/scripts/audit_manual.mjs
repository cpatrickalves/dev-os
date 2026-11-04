#!/usr/bin/env node
// Responde se o manual de uso ainda se sustenta: se os ponteiros resolvem, se
// toda imagem citada existe e é usada, se os capítulos seguem o molde e se o
// roteiro espelha o manual. Os arquivos saem do disco, sem lista fixa, para um
// capítulo novo entrar na varredura sem manutenção aqui.
//
// Saída 0 = aprovado; 1 = regra quebrada; 2 = uso incorreto.
// Os literais de --source são só aviso: nunca reprovam.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const USAGE = `Uso: node audit_manual.mjs --manual <pasta> [opções]

  --manual <pasta>        Pasta com README.md, NN-*.md e img/ (obrigatório)
  --roteiro <arquivo>     Roteiro de testes que espelha o manual
  --extra <arquivo>       Outro documento cujos links relativos e âncoras são conferidos (repetível)
  --marker <texto>        Texto exigido em todo capítulo; substitui os padrões (repetível)
  --case-id <regex>       Formato do ID de caso do roteiro (padrão: T-[A-Z]{3}-\\d{2})
  --source <pasta>        Código da interface: lista negritos e citações não encontrados (repetível)
  --allow-placeholders    Aceita marcadores de imagem pendente (fase de escrita)
`;

const DEFAULT_MARKERS = ['**Para quem:**', '**O que você faz aqui:**', '## Quando pedir ajuda'];
const SOURCE_EXTENSIONS = new Set(
  '.ts .tsx .js .jsx .mjs .vue .svelte .html .py .rb .php .java .kt .swift .dart .json .yaml .yml .po'.split(' '),
);
const SOURCE_SKIPPED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '.venv', '__pycache__', '__tests__', 'e2e', 'test', 'tests',
]);
const TEST_FILE_RE = /\.(test|spec)\.[^.]+$/;

let args;
try {
  args = parseArgs({
    options: {
      manual: { type: 'string' },
      roteiro: { type: 'string' },
      extra: { type: 'string', multiple: true, default: [] },
      marker: { type: 'string', multiple: true, default: [] },
      'case-id': { type: 'string', default: 'T-[A-Z]{3}-\\d{2}' },
      source: { type: 'string', multiple: true, default: [] },
      'allow-placeholders': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  }).values;
} catch (err) {
  console.error(`${err.message}\n\n${USAGE}`);
  process.exit(2);
}
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!args.manual) {
  console.error(USAGE);
  process.exit(2);
}

const errors = [];
const fail = (file, message) => errors.push(`${path.relative(process.cwd(), file) || file}: ${message}`);
const read = (file) => readFileSync(file, 'utf8');
const withoutFences = (text) => text.replace(/^( {0,3})(```|~~~)[\s\S]*?^ {0,3}\2[^\n]*$/gm, '');
const prose = (text) => withoutFences(text).replace(/`[^`\n]*`/g, '');

// Regra do GitHub: acentos ficam, a pontuação sai e cada espaço vira um hífen,
// sem colapsar. "T-01 — Sair" fica com dois hífens. Slug repetido ganha -1, -2.
function githubSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .replace(/ /g, '-');
}

function anchorsOf(file) {
  const seen = new Map();
  const anchors = new Set();
  for (const match of withoutFences(read(file)).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = githubSlug(match[1]);
    const count = seen.get(slug) ?? 0;
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
    seen.set(slug, count + 1);
  }
  return anchors;
}

const linkTargets = (text) =>
  [...prose(text).matchAll(/(?<!!)\[[^\]]*]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]);

function decodeAnchor(anchor) {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
}

/** Confere se o arquivo e a âncora de um link relativo existem. Devolve o caminho resolvido. */
function checkRelativeLink(sourceFile, target) {
  const [relPath, rawAnchor] = target.split('#');
  const resolved = relPath ? path.resolve(path.dirname(sourceFile), relPath) : sourceFile;
  if (!existsSync(resolved)) {
    fail(sourceFile, `link para arquivo inexistente: ${target}`);
    return null;
  }
  if (rawAnchor && resolved.endsWith('.md') && !anchorsOf(resolved).has(decodeAnchor(rawAnchor))) {
    fail(sourceFile, `âncora inexistente: ${target}`);
  }
  return resolved;
}

function checkManualLinks(file) {
  const text = read(file);
  for (const target of linkTargets(text)) {
    // Cada arquivo do manual pode virar uma tela: alvo fora da pasta seria link
    // morto ou tiraria a pessoa do produto.
    if (!/^(#.+|[^/:#]+\.md(#.+)?)$/.test(target)) {
      fail(file, `link para fora do manual: ${target}`);
      continue;
    }
    checkRelativeLink(file, target);
  }
  for (const url of prose(text).match(/\bhttps?:\/\/[^\s)]+/g) ?? []) {
    if (!linkTargets(text).includes(url)) fail(file, `URL solta no texto: ${url}`);
  }
}

function checkChapter(file, markers) {
  const text = read(file);
  const number = Number(path.basename(file).slice(0, 2));
  const title = /^# (\d+)\. \S.*$/.exec(text.split('\n')[0] ?? '');
  if (!title) fail(file, 'a primeira linha precisa ser "# N. Título"');
  else if (Number(title[1]) !== number) fail(file, `título numerado ${title[1]}, arquivo numerado ${number}`);
  for (const marker of markers) {
    if (!text.includes(marker)) fail(file, `falta o trecho do molde: ${marker}`);
  }
}

function checkImages(manualDir, files, allowPlaceholders) {
  const referenced = new Set();
  for (const file of files) {
    const text = withoutFences(read(file));
    const baseName = path.basename(file);
    const chapterId = /^\d{2}/.exec(baseName)?.[0];
    for (const [, alt, target] of text.matchAll(/!\[([^\]]*)]\(([^)\s]+)[^)]*\)/g)) {
      referenced.add(target);
      if (!alt.trim()) fail(file, `imagem sem texto alternativo: ${target}`);
      const shape = /^img\/(\d{2})\/[^/]+\.png$/.exec(target);
      if (!shape) {
        fail(file, `imagem fora do formato img/NN/slug.png: ${target}`);
        continue;
      }
      if (chapterId && shape[1] !== chapterId) fail(file, `imagem de outro capítulo: ${target}`);
      if (!existsSync(path.join(manualDir, target))) fail(file, `imagem inexistente: ${target}`);
    }
    for (const [, target] of text.matchAll(/<!--\s*🖼️\s*(\S+)/gu)) {
      referenced.add(target);
      if (!allowPlaceholders) fail(file, `marcador de imagem pendente: ${target}`);
    }
  }

  const imgDir = path.join(manualDir, 'img');
  if (!existsSync(imgDir)) return;
  for (const chapter of readdirSync(imgDir)) {
    const chapterDir = path.join(imgDir, chapter);
    if (!statSync(chapterDir).isDirectory()) continue;
    for (const name of readdirSync(chapterDir)) {
      if (name.endsWith('.png') && !referenced.has(`img/${chapter}/${name}`)) {
        fail(path.join(chapterDir, name), 'imagem que nenhum capítulo cita');
      }
    }
  }
}

function parseCases(text, caseId) {
  const cases = [];
  const caseRe = new RegExp(`^###\\s+(${caseId})\\b`);
  let section = null;
  let current = null;
  for (const line of text.split('\n')) {
    const sectionMatch = /^##\s+(\d+)\.\s+/.exec(line);
    const caseMatch = caseRe.exec(line);
    if (sectionMatch) {
      section = Number(sectionMatch[1]);
      current = null;
    } else if (caseMatch) {
      current = { id: caseMatch[1], section, body: '' };
      cases.push(current);
    } else if (/^#{1,3}\s/.test(line)) {
      current = null;
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  return cases;
}

function checkExternalDoc(file) {
  for (const target of linkTargets(read(file))) {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(target)) checkRelativeLink(file, target);
  }
}

function checkRoteiro(file, chapters, caseId) {
  if (!existsSync(file)) {
    fail(file, 'roteiro não encontrado');
    return;
  }
  const text = withoutFences(read(file));
  const sections = [...text.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)].map((m) => `${Number(m[1])}. ${m[2].trim()}`);
  const expected = chapters.map((chapter) => read(chapter).split('\n')[0].replace(/^#\s+/, '').trim());
  for (const title of expected) {
    if (!sections.includes(title)) fail(file, `falta a seção do capítulo: ${title}`);
  }
  for (const title of sections) {
    if (!expected.includes(title)) fail(file, `seção sem capítulo correspondente: ${title}`);
  }
  if (expected.every((title) => sections.includes(title)) && sections.join('\n') !== expected.join('\n')) {
    fail(file, 'as seções estão em ordem diferente da dos capítulos');
  }

  const cases = parseCases(text, caseId);
  if (cases.length === 0) fail(file, `nenhum caso no formato "### ${caseId}"`);
  const anyLevel = [...text.matchAll(new RegExp(`^#+\\s+${caseId}\\b`, 'gm'))].length;
  if (anyLevel !== cases.length) fail(file, 'há caso fora do nível de título ###');
  for (const testCase of cases) {
    const flow = /^- \*\*Fluxo:\*\* \[[^\]]+]\(([^)]+)\)/m.exec(testCase.body);
    if (!flow) {
      fail(file, `${testCase.id}: falta a linha "- **Fluxo:** [seção](capítulo#âncora)"`);
      continue;
    }
    const [relPath, anchor] = flow[1].split('#');
    if (!anchor) fail(file, `${testCase.id}: o Fluxo precisa de âncora`);
    const chapter = /^(\d{2})-/.exec(path.basename(relPath))?.[1];
    if (Number(chapter) !== testCase.section) {
      fail(file, `${testCase.id}: está na seção ${testCase.section}, mas o Fluxo aponta o capítulo ${chapter}`);
    }
  }
  checkExternalDoc(file);
}

function sourceCorpus(dirs) {
  const parts = [];
  const walk = (entry) => {
    const stat = statSync(entry);
    if (stat.isDirectory()) {
      if (SOURCE_SKIPPED_DIRS.has(path.basename(entry))) return;
      for (const child of readdirSync(entry)) walk(path.join(entry, child));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry)) && !TEST_FILE_RE.test(entry)) {
      parts.push(read(entry));
    }
  };
  for (const dir of dirs) walk(path.resolve(dir));
  return parts.join('\n');
}

/** Negritos e citações dos capítulos que não aparecem no código da interface. */
function unmatchedLiterals(chapters, corpus, markers) {
  const unmatched = [];
  // `\\<nome\\>` e números são a parte variável do texto: confere só os trechos fixos.
  const found = (literal) =>
    literal
      .split(/\\<[^>]*\\>|\d+/)
      .map((piece) => piece.trim().replace(/[.:!?]+$/, ''))
      .filter((piece) => piece.length > 2)
      .every((piece) => corpus.includes(piece));
  for (const chapter of chapters) {
    const lines = prose(read(chapter)).replace(/!\[[^\]]*]\([^)]*\)/g, '');
    const literals = new Set();
    for (const [, bold] of lines.matchAll(/\*\*([^*\n]+)\*\*/g)) literals.add(bold.trim());
    for (const [, quoted] of lines.matchAll(/"([^"\n]+)"/g)) literals.add(quoted.trim());
    for (const literal of literals) {
      if (literal.endsWith(':') || literal === 'Se aparecer') continue;
      if (markers.some((marker) => marker.includes(literal))) continue;
      if (!found(literal)) unmatched.push(`${path.basename(chapter)}: ${literal}`);
    }
  }
  return unmatched;
}

const manualDir = path.resolve(args.manual);
if (!existsSync(manualDir)) {
  console.error(`Pasta do manual não encontrada: ${manualDir}`);
  process.exit(2);
}
const readme = path.join(manualDir, 'README.md');
const chapters = readdirSync(manualDir)
  .filter((name) => /^\d{2}-.*\.md$/.test(name))
  .sort()
  .map((name) => path.join(manualDir, name));

// Sem isto, um caminho errado aprovaria o manual sem conferir nada.
if (!existsSync(readme)) fail(manualDir, 'falta o README.md, que é o índice do manual');
if (chapters.length === 0) fail(manualDir, 'nenhum capítulo NN-*.md encontrado');

const markers = args.marker.length > 0 ? args.marker : DEFAULT_MARKERS;
const manualFiles = [...(existsSync(readme) ? [readme] : []), ...chapters];
for (const file of manualFiles) checkManualLinks(file);
for (const chapter of chapters) checkChapter(chapter, markers);
checkImages(manualDir, manualFiles, args['allow-placeholders']);

if (existsSync(readme)) {
  const indexLinks = new Set(linkTargets(read(readme)).map((target) => target.split('#')[0]));
  for (const chapter of chapters) {
    if (!indexLinks.has(path.basename(chapter))) fail(chapter, 'o índice não leva a este capítulo');
  }
}

if (args.roteiro) checkRoteiro(path.resolve(args.roteiro), chapters, args['case-id']);
for (const extra of args.extra) {
  if (existsSync(extra)) checkExternalDoc(path.resolve(extra));
  else fail(path.resolve(extra), 'documento não encontrado');
}

if (args.source.length > 0) {
  const unmatched = unmatchedLiterals(chapters, sourceCorpus(args.source), markers);
  if (unmatched.length > 0) {
    console.log(`Aviso: ${unmatched.length} literais não encontrados no código. Confira um a um:`);
    for (const item of unmatched) console.log(`  ${item}`);
    console.log('');
  }
}

if (errors.length > 0) {
  console.error(`Reprovado: ${errors.length} problema(s).`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`Aprovado: índice e ${chapters.length} capítulo(s) conferidos.`);
