-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA', 'GUARDAR', 'RESGATAR');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DEBITO', 'CREDITO', 'DINHEIRO', 'TRANSFERENCIA', 'BOLETO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "percentualGuardar" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "cor" VARCHAR(7) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "diaFechamento" INTEGER NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "cor" VARCHAR(7) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cartoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixinhas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "metaCentavos" INTEGER,
    "cor" VARCHAR(7) NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "arquivada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caixinhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "data" VARCHAR(10) NOT NULL,
    "competencia" VARCHAR(7) NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoriaId" TEXT,
    "caixinhaId" TEXT,
    "formaPagamento" "FormaPagamento",
    "cartaoId" TEXT,
    "compraId" TEXT,
    "parcela" INTEGER,
    "totalParcelas" INTEGER,
    "origemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "data" VARCHAR(10) NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "deId" TEXT NOT NULL,
    "paraId" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_usuarioId_tipo_nome_key" ON "categorias"("usuarioId", "tipo", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "cartoes_usuarioId_nome_key" ON "cartoes"("usuarioId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "caixinhas_usuarioId_nome_key" ON "caixinhas"("usuarioId", "nome");

-- CreateIndex
CREATE INDEX "lancamentos_usuarioId_competencia_idx" ON "lancamentos"("usuarioId", "competencia");

-- CreateIndex
CREATE INDEX "lancamentos_usuarioId_data_idx" ON "lancamentos"("usuarioId", "data");

-- CreateIndex
CREATE INDEX "lancamentos_compraId_idx" ON "lancamentos"("compraId");

-- CreateIndex
CREATE INDEX "lancamentos_origemId_idx" ON "lancamentos"("origemId");

-- CreateIndex
CREATE INDEX "transferencias_usuarioId_data_idx" ON "transferencias"("usuarioId", "data");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartoes" ADD CONSTRAINT "cartoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixinhas" ADD CONSTRAINT "caixinhas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_caixinhaId_fkey" FOREIGN KEY ("caixinhaId") REFERENCES "caixinhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "cartoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "lancamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_deId_fkey" FOREIGN KEY ("deId") REFERENCES "caixinhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_paraId_fkey" FOREIGN KEY ("paraId") REFERENCES "caixinhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
