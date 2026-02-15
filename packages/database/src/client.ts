import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@atena/config'

const queryClient = postgres(env.DATABASE_URL)

export const db = drizzle(queryClient)

export async function closeDb() {
  await queryClient.end()
}
