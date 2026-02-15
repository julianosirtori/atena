import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { existsSync } from 'node:fs'
import { db, closeDb } from './client.js'

async function runMigrations() {
  const migrationsFolder = './drizzle'

  if (!existsSync(`${migrationsFolder}/meta/_journal.json`)) {
    console.log('No migrations found. Run `npm run db:generate` after defining the schema.')
    await closeDb()
    return
  }

  console.log('Running migrations...')
  await migrate(db, { migrationsFolder })
  console.log('Migrations complete.')
  await closeDb()
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
