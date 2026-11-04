import fs from 'node:fs';
import { test as setup } from '@playwright/test';
import { AUTH_DIR, USER, USER_STATE, loginViaUi } from './helpers';

// Prepara sessões e dados para os capítulos. Não captura telas. Um `throw` aqui
// é falha ao criar dados, e não assert de comportamento.
setup('sessões e dados fictícios', async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // TODO(manual): remova o login se o produto não tiver contas.
  await loginViaUi(page, USER.email, USER.password);
  await page.context().storageState({ path: USER_STATE });

  // TODO(manual): crie pela API os dados que o seed não cria. Busque antes de
  // criar, porque este setup roda de novo sobre um ambiente mantido de pé.
});
