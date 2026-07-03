const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.APP2_ADMIN_USERNAME || 'admin';
  const password = process.env.APP2_ADMIN_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: APP2_ADMIN_PASSWORD is required in production. Set APP2_ADMIN_PASSWORD environment variable.');
      process.exit(1);
    }
    console.warn('WARNING: No APP2_ADMIN_PASSWORD set. Using unsafe default password for development only.');
  }

  const finalPassword = password || 'admin';
  const passwordHash = await bcrypt.hash(finalPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: {
      username,
      passwordHash,
      role: 'admin',
      status: 'active',
    },
  });
  console.log(`Seeded user: ${admin.username} (role: ${admin.role})`);

  // Seed test users for intelligence verification
  const nocPasswordHash = await bcrypt.hash('NocPassword123!', 10);
  const nocUser = await prisma.user.upsert({
    where: { username: 'noc_user' },
    update: { passwordHash: nocPasswordHash },
    create: {
      username: 'noc_user',
      passwordHash: nocPasswordHash,
      role: 'noc',
      status: 'active',
    },
  });
  console.log(`Seeded user: ${nocUser.username} (role: ${nocUser.role})`);

  const opPasswordHash = await bcrypt.hash('OpPassword123!', 10);
  const opUser = await prisma.user.upsert({
    where: { username: 'op_user' },
    update: { passwordHash: opPasswordHash },
    create: {
      username: 'op_user',
      passwordHash: opPasswordHash,
      role: 'operation',
      status: 'active',
    },
  });
  console.log(`Seeded user: ${opUser.username} (role: ${opUser.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
