const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log('Querying database:', dbUrl);

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cases = await prisma.caseLog.findMany({
    include: {
      messages: true
    }
  });
  console.log('--- Case Logs in DB ---');
  console.log(JSON.stringify(cases, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
