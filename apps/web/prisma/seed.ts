import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const libsql = createClient({
  url: process.env.DATABASE_URL || 'file:./dev.db',
})
const adapter = new PrismaLibSql(libsql as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding data...')

  // Mock Users
  const users = [
    { username: 'admin', role: 'ADMIN', passwordHash: 'mock-hash-admin' },
    { username: 'noc01', role: 'NOC', passwordHash: 'mock-hash-noc01' },
    { username: 'noc02', role: 'NOC', passwordHash: 'mock-hash-noc02' },
    { username: 'ops01', role: 'OPERATION', passwordHash: 'mock-hash-ops01' },
    { username: 'ops02', role: 'OPERATION', passwordHash: 'mock-hash-ops02' },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    })
  }

  // Mock Settings
  const settings = [
    { key: 'KB_REPO_URL', value: 'https://github.com/company/kb-data' },
    { key: 'AI_MODEL', value: 'gemini-1.5-pro' },
    { key: 'CASE_PUSH_ENDPOINT', value: 'https://api.company.local/cases' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
