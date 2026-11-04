import { USER_STATE, capture, userTest as test } from './helpers';

// TODO(manual): renomeie para NN-nome.spec.ts. O prefixo NN liga o script ao
// viewport do capítulo em CHAPTER_VIEWPORTS.
test.use({ storageState: USER_STATE });

test('capítulo NN — nome da jornada', async ({ page }) => {
  // slug-da-tarefa.png: descreva aqui o estado capturado.
  await page.goto('/caminho-da-tela');
  await page.getByRole('heading', { name: 'Título da tela' }).waitFor();
  await page.getByLabel('Nome do campo').fill('Dado fictício');
  // Fotografe sem enviar, para não mudar o estado da captura seguinte.
  await capture(page, 'NN', 'slug-da-tarefa');
});
