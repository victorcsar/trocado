import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Cliente de dentro de uma transação, para funções que rodam dentro ou fora dela. */
export type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
