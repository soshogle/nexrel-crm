#!/usr/bin/env tsx
/**
 * Phase 4: Migrate auth tables to Meta DB (v2 - robust)
 *
 * Copies Agency, User, Account, Session to Meta DB using raw field mapping.
 * AdminSession and SuperAdminSession are optional (non-critical for auth).
 */

import { PrismaClient } from '@prisma/client'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log('Phase 4: Migrate auth tables to Meta DB (v2)\n')

  const sourceUrl = process.env.DATABASE_URL
  const metaUrl = process.env.DATABASE_URL_META

  if (!sourceUrl) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }
  if (!metaUrl) {
    console.error('❌ DATABASE_URL_META not set')
    process.exit(1)
  }

  if (sourceUrl === metaUrl) {
    console.error('❌ DATABASE_URL and DATABASE_URL_META are the same. Nothing to migrate.')
    process.exit(1)
  }

  console.log('Source:', sourceUrl.substring(0, 50) + '...')
  console.log('Target:', metaUrl.substring(0, 50) + '...\n')

  const source = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: sourceUrl } },
  })
  const target = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: metaUrl } },
  })

  await source.$queryRaw`SELECT 1`
  console.log('✅ Source DB connected')
  await target.$queryRaw`SELECT 1`
  console.log('✅ Target Meta DB connected\n')

  // 1. Agency
  const agencies = await source.agency.findMany()
  console.log(`📦 Agency: ${agencies.length} rows`)
  if (!DRY_RUN) {
    let ok = 0
    for (const a of agencies) {
      try {
        await target.agency.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            name: a.name,
            email: a.email,
            phone: a.phone,
            address: a.address,
            website: a.website,
            logo: a.logo,
            isActive: a.isActive,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          },
          update: {
            name: a.name,
            email: a.email,
            phone: a.phone,
            address: a.address,
            website: a.website,
            logo: a.logo,
            isActive: a.isActive,
            updatedAt: a.updatedAt,
          },
        })
        ok++
      } catch (e) {
        console.error(`   Error Agency ${a.id}:`, (e as Error).message)
      }
    }
    console.log(`   ✅ Agency: ${ok}/${agencies.length}\n`)
  }

  // 2. User - copy ALL scalar fields
  const users = await source.user.findMany()
  console.log(`📦 User: ${users.length} rows`)
  if (!DRY_RUN) {
    let ok = 0
    for (const u of users) {
      try {
        const data: Record<string, any> = {}
        for (const [k, v] of Object.entries(u)) {
          if (v === undefined) continue
          data[k] = v
        }
        // Remove relation fields that Prisma returns
        delete data.agency

        await target.user.upsert({
          where: { id: u.id },
          create: data as any,
          update: data as any,
        })
        ok++
      } catch (e) {
        console.error(`   Error User ${u.id} (${u.email}):`, (e as Error).message?.substring(0, 200))
      }
    }
    console.log(`   ✅ User: ${ok}/${users.length}\n`)
  }

  // 3. Account
  const accounts = await source.account.findMany()
  console.log(`📦 Account: ${accounts.length} rows`)
  if (!DRY_RUN) {
    let ok = 0
    for (const a of accounts) {
      try {
        const data: Record<string, any> = {}
        for (const [k, v] of Object.entries(a)) {
          if (v === undefined) continue
          data[k] = v
        }
        delete data.user
        await target.account.upsert({
          where: { id: a.id },
          create: data as any,
          update: data as any,
        })
        ok++
      } catch (e) {
        console.error(`   Error Account ${a.id}:`, (e as Error).message?.substring(0, 200))
      }
    }
    console.log(`   ✅ Account: ${ok}/${accounts.length}\n`)
  }

  // 4. Session
  const sessions = await source.session.findMany()
  console.log(`📦 Session: ${sessions.length} rows`)
  if (!DRY_RUN) {
    let ok = 0
    for (const s of sessions) {
      try {
        const data: Record<string, any> = {}
        for (const [k, v] of Object.entries(s)) {
          if (v === undefined) continue
          data[k] = v
        }
        delete data.user
        await target.session.upsert({
          where: { id: s.id },
          create: data as any,
          update: data as any,
        })
        ok++
      } catch (e) {
        console.error(`   Error Session ${s.id}:`, (e as Error).message?.substring(0, 200))
      }
    }
    console.log(`   ✅ Session: ${ok}/${sessions.length}\n`)
  }

  // 5. AdminSession
  const adminSessions = await source.adminSession.findMany()
  console.log(`📦 AdminSession: ${adminSessions.length} rows`)
  if (!DRY_RUN) {
    let ok = 0
    for (const s of adminSessions) {
      try {
        const data: Record<string, any> = {}
        for (const [k, v] of Object.entries(s)) {
          if (v === undefined) continue
          data[k] = v
        }
        delete data.user
        await target.adminSession.upsert({
          where: { id: s.id },
          create: data as any,
          update: data as any,
        })
        ok++
      } catch (e) {
        console.error(`   Error AdminSession ${s.id}:`, (e as Error).message?.substring(0, 200))
      }
    }
    console.log(`   ✅ AdminSession: ${ok}/${adminSessions.length}\n`)
  }

  // 6. SuperAdminSession
  const superAdminSessions = await source.superAdminSession.findMany()
  console.log(`📦 SuperAdminSession: ${superAdminSessions.length} rows`)
  if (!DRY_RUN) {
    let ok = 0
    for (const s of superAdminSessions) {
      try {
        const data: Record<string, any> = {}
        for (const [k, v] of Object.entries(s)) {
          if (v === undefined) continue
          data[k] = v
        }
        delete data.user
        delete data.impersonatedUser
        await target.superAdminSession.upsert({
          where: { id: s.id },
          create: data as any,
          update: data as any,
        })
        ok++
      } catch (e) {
        console.error(`   Error SuperAdminSession ${s.id}:`, (e as Error).message?.substring(0, 200))
      }
    }
    console.log(`   ✅ SuperAdminSession: ${ok}/${superAdminSessions.length}\n`)
  }

  console.log('✅ Meta DB migration complete')
  await source.$disconnect()
  await target.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
