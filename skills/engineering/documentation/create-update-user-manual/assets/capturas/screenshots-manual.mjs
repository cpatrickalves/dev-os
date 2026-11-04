#!/usr/bin/env node
// Regenera as imagens do manual: sobe o ambiente descartável, roda o seed,
// captura e apaga tudo (down -v).
// Uso: <gerenciador> run screenshots:manual [--keep-stack] [--force] [args do Playwright]
import { spawnSync } from 'node:child_process';

// TODO(manual): caminho do Compose descartável, relativo à pasta do frontend.
const COMPOSE = ['compose', '-f', '../docker-compose-e2e.yml'];
// TODO(manual): comando de seed dentro do ambiente, ou null se não houver.
const SEED = ['exec', '-T', 'backend', 'python', 'scripts/seed_dev_users.py'];
// TODO(manual): como este projeto executa o Playwright (pnpm exec, npx…).
const PLAYWRIGHT = ['pnpm', 'exec', 'playwright'];
const CONFIG = 'playwright.manual.config.ts';

const rawArgs = process.argv.slice(2);
const force = rawArgs.includes('--force');
// Quem usa --force assume um ambiente que não subiu. Apagá-lo no fim destruiria
// o banco de outra pessoa, então --force sempre mantém o ambiente de pé.
const keepStack = rawArgs.includes('--keep-stack') || force;
const playwrightArgs = rawArgs.filter((arg) => arg !== '--keep-stack' && arg !== '--force');
const composeCommand = `docker ${COMPOSE.join(' ')}`;

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`comando falhou (${res.status ?? 'sinal'}): ${cmd} ${args.join(' ')}`);
  }
}

const ps = spawnSync('docker', [...COMPOSE, 'ps', '--quiet'], { encoding: 'utf8' });
if (ps.error || ps.status !== 0) {
  // Sem esta checagem, Docker parado produz saída vazia, que parece ambiente
  // desligado, e a falha só aparece depois com outra mensagem.
  console.error(`Não foi possível checar o ambiente. O Docker está disponível? ${ps.error?.message ?? ''}`);
  process.exit(1);
}
if (ps.stdout.trim() !== '' && !force) {
  console.error(
    `O ambiente já está de pé. Abortando para não apagá-lo no fim da rodada.\n` +
      `Derrube-o antes (${composeCommand} down -v) ou use --force, que o mantém de pé ao final.`,
  );
  process.exit(1);
}

let tornDown = false;
function teardown() {
  if (tornDown) return 0;
  tornDown = true;
  if (keepStack) {
    console.log(`▶ O ambiente continua de pé. Para derrubar: ${composeCommand} down -v`);
    return 0;
  }
  console.log('▶ apagando o ambiente (down -v)…');
  return spawnSync('docker', [...COMPOSE, 'down', '-v'], { stdio: 'inherit' }).status === 0 ? 0 : 1;
}

// Com spawnSync e stdio herdado, Ctrl+C encerra o Node antes do `finally`.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n▶ ${signal} recebido, apagando o ambiente antes de sair…`);
    process.exit(teardown() || 130);
  });
}

let exitCode = 0;
try {
  console.log('▶ subindo o ambiente (build + healthchecks)…');
  run('docker', [...COMPOSE, 'up', '-d', '--build', '--wait']);
  if (SEED) {
    console.log('▶ criando os dados de exemplo…');
    run('docker', [...COMPOSE, ...SEED]);
  }
  console.log('▶ capturando as telas…');
  run(PLAYWRIGHT[0], [...PLAYWRIGHT.slice(1), 'test', '--config', CONFIG, ...playwrightArgs]);
  console.log('▶ imagens regeneradas. Abra cada PNG alterado e compare com o capítulo.');
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err));
  exitCode = 1;
} finally {
  exitCode = teardown() || exitCode;
}
process.exit(exitCode);
