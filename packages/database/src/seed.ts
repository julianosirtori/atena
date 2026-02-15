import { closeDb } from './client.js'

async function seed() {
  console.log('Seeding database...')
  // TODO: Implement seeding in S-002
  console.log('Seed complete.')
  await closeDb()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
