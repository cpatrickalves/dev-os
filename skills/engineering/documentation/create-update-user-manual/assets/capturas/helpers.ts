import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

// Ancorado no arquivo para o pipeline não gravar imagens em outro lugar quando
// for executado a partir de outra pasta.
const HERE = path.dirname(fileURLToPath(import.meta.url));
// TODO(manual): caminho até img/ da pasta do manual, relativo a este arquivo.
export const IMG_ROOT = path.resolve(HERE, '..', '..', '..', 'docs', 'manual-de-uso', 'img');
export const AUTH_DIR = path.resolve(HERE, '.auth');
export const USER_STATE = path.join(AUTH_DIR, 'user.json');

// TODO(manual): dados fictícios, os mesmos do roteiro de testes.
export const USER = { email: 'maria.teste@example.com', password: 'troque-esta-senha' };

/** Espera a tela estabilizar e grava img/<NN>/<slug>.png, sem fullPage. */
export async function capture(page: Page, chapter: string, slug: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  const file = path.join(IMG_ROOT, chapter, `${slug}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' });
}

/**
 * Regrava a sessão ao fim de cada teste. Com rotação de refresh token, o estado
 * em disco envelhece a cada navegação, e o capítulo seguinte falharia com um
 * 401 difícil de entender.
 */
export function withPersistedState(statePath: string) {
  return base.extend({
    page: async ({ page }, runTest) => {
      await runTest(page);
      await page.context().storageState({ path: statePath });
    },
  });
}

export const userTest = withPersistedState(USER_STATE);

// TODO(manual): login pela tela, com os rótulos reais do produto.
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/app**');
}
