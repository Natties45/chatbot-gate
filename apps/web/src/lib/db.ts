import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

declare global {
  // eslint-disable-next-line no-var
  var chatbotGatePrisma: PrismaClient | undefined;
}

export function getPrisma() {
  if (!globalThis.chatbotGatePrisma) {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    const adapter = new PrismaLibSql({ url: dbUrl });
    globalThis.chatbotGatePrisma = new PrismaClient({ adapter });
  }

  return globalThis.chatbotGatePrisma;
}
