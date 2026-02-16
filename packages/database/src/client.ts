import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@atena/config'
import * as schema from './schema.js'

const queryClient = postgres(env.DATABASE_URL)

export const db = drizzle(queryClient, { schema })

export async function closeDb() {
  await queryClient.end()
}
