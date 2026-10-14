import { env } from './shared/config/env';
import { prisma } from './shared/prisma';
import { criarApp } from './app';
import { contaService } from './modules/conta/conta.service';

async function iniciar() {
  await contaService.garantirUsuarioInicial();

  const servidor = criarApp().listen(env.PORT, () => {
    console.log(`Trocado API ouvindo na porta ${env.PORT}${env.DEMO ? ' (demonstração)' : ''}`);
  });

  const encerrar = () => {
    servidor.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar:', erro);
  process.exit(1);
});
