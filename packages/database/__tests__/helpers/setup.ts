import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import * as schema from '../../src/schema.js'

const TEST_DB_NAME = 'atena_test'
const BASE_URL = 'postgresql://atena:atena_dev@localhost:5433/postgres'
const TEST_URL = `postgresql://atena:atena_dev@localhost:5433/${TEST_DB_NAME}`

// Set env vars before any @atena/config import can parse them
process.env.DATABASE_URL = TEST_URL
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.NODE_ENV = 'test'

let testDb: ReturnType<typeof drizzle<typeof schema>>
let testClient: ReturnType<typeof postgres>

export async function setupTestDb() {
  // Create test database if it doesn't exist
  const adminClient = postgres(BASE_URL, { max: 1 })
  const existing = await adminClient`
    SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}
  `
  if (existing.length === 0) {
    await adminClient.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
  }
  await adminClient.end()

  // Connect to test database
  testClient = postgres(TEST_URL)
  testDb = drizzle(testClient, { schema })

  // Push schema (create tables from Drizzle schema definitions)
  // We use raw SQL to create enums and tables, leveraging drizzle-kit push
  // Instead, we migrate using the same migration files
  // For tests, we'll use drizzle-kit push programmatically by importing migrate
  return testDb
}

export function getTestDb() {
  return testDb
}

export function getTestClient() {
  return testClient
}

export async function cleanAllTables() {
  await testDb.execute(sql`
    TRUNCATE TABLE
      security_incidents,
      scheduled_messages,
      conversation_notes,
      lead_events,
      messages,
      monthly_lead_counts,
      conversations,
      leads,
      agents,
      tenants
    CASCADE
  `)
}

export async function closeTestDb() {
  if (testClient) {
    await testClient.end()
  }
}
