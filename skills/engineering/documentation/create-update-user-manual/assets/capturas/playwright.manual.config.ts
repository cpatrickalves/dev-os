import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

// Pipeline de imagens do manual de uso. Não é suíte de teste: roda fora dos
// testes e2e, sem retentativas e sem asserts de comportamento.

type Viewport = 'mobile' | 'desktop';

const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

// TODO(manual): um capítulo por linha, com o dispositivo do público dele.
const CHAPTER_VIEWPORTS: Record<string, Viewport> = {
  '01': 'mobile',
};

// TODO(manual): caminho da pasta do manual, relativo a este arquivo.
const MANUAL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'manual-de-uso',
);

const manualChapters = fs
  .readdirSync(MANUAL_DIR)
  .filter((name) => /^\d{2}-.*\.md$/.test(name))
  .map((name) => name.slice(0, 2));

// Sem capítulos, a checagem seguinte passaria sem conferir nada.
if (manualChapters.length === 0) {
  throw new Error(`Nenhum capítulo NN-*.md encontrado em ${MANUAL_DIR}.`);
}
const withoutViewport = manualChapters.filter((id) => !(id in CHAPTER_VIEWPORTS));
if (withoutViewport.length > 0) {
  throw new Error(
    `Capítulos do manual sem viewport em CHAPTER_VIEWPORTS: ${withoutViewport.join(', ')}.`,
  );
}

function specsFor(viewport: Viewport): RegExp {
  const ids = Object.keys(CHAPTER_VIEWPORTS).filter((id) => CHAPTER_VIEWPORTS[id] === viewport);
  return new RegExp(`(^|[\\\\/])(${ids.join('|')})-[^\\\\/]*\\.spec\\.ts$`);
}

export default defineConfig({
  testDir: './e2e/screenshots',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 180_000,
  use: {
    // TODO(manual): endereço do ambiente descartável.
    baseURL: 'http://localhost:4173',
    deviceScaleFactor: 2,
    // `reducedMotion` só vale aqui; como opção direta de `use`, é ignorado sem erro.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'off',
  },
  // Ordem declarada = ordem de execução com workers: 1. A jornada que cria dados
  // vem antes da captura que os mostra.
  projects: [
    { name: 'setup', testMatch: /setup\.spec\.ts/ },
    {
      name: 'mobile',
      testMatch: specsFor('mobile'),
      dependencies: ['setup'],
      use: { viewport: VIEWPORTS.mobile },
    },
    {
      name: 'desktop',
      testMatch: specsFor('desktop'),
      dependencies: ['setup'],
      use: { viewport: VIEWPORTS.desktop },
    },
  ],
});
