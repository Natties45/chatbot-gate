import { getPrisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/password';
import { DEFAULT_SETTINGS } from '../src/lib/settings-service';

async function main() {
  const prisma = getPrisma();
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'password';
  const users = [
    { username: 'admin', role: 'ADMIN' },
    { username: 'noc01', role: 'NOC' },
    { username: 'noc02', role: 'NOC' },
    { username: 'ops01', role: 'OPERATION' },
    { username: 'ops02', role: 'OPERATION' },
  ];

  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    const passwordHash = await hashPassword(defaultPassword);
    for (const user of users) {
      await prisma.user.create({
        data: {
          ...user,
          passwordHash,
          status: 'ACTIVE',
        },
      });
    }
    console.log(`[seed-production] Seeded ${users.length} users.`);
  } else {
    console.log(`[seed-production] User table already contains ${existingUsers} user(s); skipped user seed.`);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log('[seed-production] Settings defaults are present.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
