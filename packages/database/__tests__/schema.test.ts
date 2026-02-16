import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../src/schema.js'

const TEST_DB_NAME = 'atena_test'
const BASE_URL = 'postgresql://atena:atena_dev@localhost:5433/postgres'
const TEST_URL = `postgresql://atena:atena_dev@localhost:5433/${TEST_DB_NAME}`

let testClient: ReturnType<typeof postgres>
let db: ReturnType<typeof drizzle<typeof schema>>

// Helper to insert a minimal tenant
async function insertTenant(overrides: Partial<typeof schema.tenants.$inferInsert> = {}) {
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: 'Test Tenant',
      slug: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      businessName: 'Test Business',
      ...overrides,
    })
    .returning()
  return tenant
}

// Helper to insert a minimal agent
async function insertAgent(tenantId: string, overrides: Partial<typeof schema.agents.$inferInsert> = {}) {
  const [agent] = await db
    .insert(schema.agents)
    .values({
      tenantId,
      name: 'Test Agent',
      email: `agent-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      passwordHash: '$2b$10$test_hash',
      ...overrides,
    })
    .returning()
  return agent
}

// Helper to insert a minimal lead
async function insertLead(tenantId: string, overrides: Partial<typeof schema.leads.$inferInsert> = {}) {
  const [lead] = await db
    .insert(schema.leads)
    .values({
      tenantId,
      channel: 'whatsapp',
      ...overrides,
    })
    .returning()
  return lead
}

// Helper to insert a minimal conversation
async function insertConversation(
  tenantId: string,
  leadId: string,
  overrides: Partial<typeof schema.conversations.$inferInsert> = {},
) {
  const [conv] = await db
    .insert(schema.conversations)
    .values({
      tenantId,
      leadId,
      channel: 'whatsapp',
      ...overrides,
    })
    .returning()
  return conv
}

beforeAll(async () => {
  // Create test DB if needed
  const adminClient = postgres(BASE_URL, { max: 1 })
  const existing = await adminClient`
    SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}
  `
  if (existing.length === 0) {
    await adminClient.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
  }
  await adminClient.end()

  // Connect and run migrations
  testClient = postgres(TEST_URL)
  db = drizzle(testClient, { schema })
  await migrate(db, { migrationsFolder: './drizzle' })
})

afterAll(async () => {
  await testClient.end()
})

beforeEach(async () => {
  await db.execute(sql`
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
})

describe('Schema constraints', () => {
  // 1. Insert tenant with required fields -> success
  it('should insert a tenant with required fields', async () => {
    const tenant = await insertTenant()
    expect(tenant.id).toBeDefined()
    expect(tenant.name).toBe('Test Tenant')
    expect(tenant.businessName).toBe('Test Business')
    expect(tenant.plan).toBe('starter')
    expect(tenant.billingStatus).toBe('trial')
  })

  // 2. Insert tenant without business_name -> NOT NULL error
  it('should reject tenant without business_name', async () => {
    await expect(
      db.insert(schema.tenants).values({
        name: 'No Business',
        slug: 'no-business',
        businessName: undefined as unknown as string,
      }),
    ).rejects.toThrow(/not-null/)
  })

  // 3. Insert lead without valid tenant_id -> FK error
  it('should reject lead with non-existent tenant_id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    await expect(
      db.insert(schema.leads).values({
        tenantId: fakeId,
        channel: 'whatsapp',
      }),
    ).rejects.toThrow(/foreign key|violates/)
  })

  // 4. 2 leads same tenant+phone -> unique violation
  it('should reject duplicate phone for same tenant', async () => {
    const tenant = await insertTenant()
    await insertLead(tenant.id, { phone: '5511999999999' })

    await expect(
      insertLead(tenant.id, { phone: '5511999999999' }),
    ).rejects.toThrow(/unique|duplicate/)
  })

  // 5. 2 leads same tenant, both phone=NULL -> both OK (partial unique)
  it('should allow multiple leads with NULL phone in same tenant', async () => {
    const tenant = await insertTenant()
    const lead1 = await insertLead(tenant.id, { phone: null })
    const lead2 = await insertLead(tenant.id, { phone: null })

    expect(lead1.id).toBeDefined()
    expect(lead2.id).toBeDefined()
    expect(lead1.id).not.toBe(lead2.id)
  })

  // 6. Lead with instagram_id=NULL + phone filled -> OK
  it('should allow lead with phone and no instagram_id', async () => {
    const tenant = await insertTenant()
    const lead = await insertLead(tenant.id, {
      phone: '5511888888888',
      instagramId: null,
    })

    expect(lead.phone).toBe('5511888888888')
    expect(lead.instagramId).toBeNull()
  })

  // 7. Lead with invalid stage -> enum error (via raw SQL)
  it('should reject lead with invalid stage via raw SQL', async () => {
    const tenant = await insertTenant()
    await expect(
      db.execute(
        sql`INSERT INTO leads (tenant_id, channel, stage) VALUES (${tenant.id}, 'whatsapp', 'invalid_stage')`,
      ),
    ).rejects.toThrow(/invalid input value|enum/)
  })

  // 8. Conversation with invalid status -> enum error
  it('should reject conversation with invalid status via raw SQL', async () => {
    const tenant = await insertTenant()
    const lead = await insertLead(tenant.id)
    await expect(
      db.execute(
        sql`INSERT INTO conversations (tenant_id, lead_id, channel, status) VALUES (${tenant.id}, ${lead.id}, 'whatsapp', 'invalid_status')`,
      ),
    ).rejects.toThrow(/invalid input value|enum/)
  })

  // 9. Tenant with invalid plan -> enum error
  it('should reject tenant with invalid plan via raw SQL', async () => {
    await expect(
      db.execute(
        sql`INSERT INTO tenants (name, slug, business_name, plan) VALUES ('Test', 'test-bad-plan', 'Biz', 'enterprise')`,
      ),
    ).rejects.toThrow(/invalid input value|enum/)
  })

  // 10. Delete tenant -> cascades to all children
  it('should cascade delete from tenant to all children', async () => {
    const tenant = await insertTenant()
    const agent = await insertAgent(tenant.id)
    const lead = await insertLead(tenant.id, { phone: '5511777777777' })
    const conv = await insertConversation(tenant.id, lead.id)

    await db.insert(schema.messages).values({
      tenantId: tenant.id,
      conversationId: conv.id,
      direction: 'inbound',
      senderType: 'lead',
      content: 'Hello',
    })

    await db.insert(schema.leadEvents).values({
      tenantId: tenant.id,
      leadId: lead.id,
      eventType: 'score_change',
      createdBy: 'system',
    })

    await db.insert(schema.monthlyLeadCounts).values({
      tenantId: tenant.id,
      yearMonth: '2026-02',
      leadCount: 1,
    })

    await db.insert(schema.conversationNotes).values({
      tenantId: tenant.id,
      conversationId: conv.id,
      agentId: agent.id,
      content: 'Note',
    })

    // Delete tenant
    await db.delete(schema.tenants).where(sql`id = ${tenant.id}`)

    // Verify cascades
    const remainingLeads = await db
      .select()
      .from(schema.leads)
      .where(sql`tenant_id = ${tenant.id}`)
    const remainingConvs = await db
      .select()
      .from(schema.conversations)
      .where(sql`tenant_id = ${tenant.id}`)
    const remainingMsgs = await db
      .select()
      .from(schema.messages)
      .where(sql`tenant_id = ${tenant.id}`)
    const remainingAgents = await db
      .select()
      .from(schema.agents)
      .where(sql`tenant_id = ${tenant.id}`)
    const remainingEvents = await db
      .select()
      .from(schema.leadEvents)
      .where(sql`tenant_id = ${tenant.id}`)
    const remainingCounts = await db
      .select()
      .from(schema.monthlyLeadCounts)
      .where(sql`tenant_id = ${tenant.id}`)
    const remainingNotes = await db
      .select()
      .from(schema.conversationNotes)
      .where(sql`tenant_id = ${tenant.id}`)

    expect(remainingLeads).toHaveLength(0)
    expect(remainingConvs).toHaveLength(0)
    expect(remainingMsgs).toHaveLength(0)
    expect(remainingAgents).toHaveLength(0)
    expect(remainingEvents).toHaveLength(0)
    expect(remainingCounts).toHaveLength(0)
    expect(remainingNotes).toHaveLength(0)
  })

  // 11. Monthly lead counts duplicate (tenant_id, year_month) -> unique violation
  it('should reject duplicate monthly_lead_counts for same tenant and month', async () => {
    const tenant = await insertTenant()
    await db.insert(schema.monthlyLeadCounts).values({
      tenantId: tenant.id,
      yearMonth: '2026-02',
      leadCount: 5,
    })

    await expect(
      db.insert(schema.monthlyLeadCounts).values({
        tenantId: tenant.id,
        yearMonth: '2026-02',
        leadCount: 10,
      }),
    ).rejects.toThrow(/unique|duplicate/)
  })

  // 12. Insert security_incidents with all valid types -> OK
  it('should insert security incidents with all valid types', async () => {
    const tenant = await insertTenant()
    const lead = await insertLead(tenant.id)
    const conv = await insertConversation(tenant.id, lead.id)

    const types = [
      'injection_attempt',
      'prompt_leak',
      'off_topic',
      'over_promise',
      'validation_failed',
      'identity_leak',
    ] as const

    for (const incidentType of types) {
      const [incident] = await db
        .insert(schema.securityIncidents)
        .values({
          tenantId: tenant.id,
          conversationId: conv.id,
          leadId: lead.id,
          incidentType,
          severity: 'medium',
          detectionLayer: 'sanitization',
          actionTaken: 'blocked',
        })
        .returning()

      expect(incident.incidentType).toBe(incidentType)
    }

    const allIncidents = await db
      .select()
      .from(schema.securityIncidents)
      .where(sql`tenant_id = ${tenant.id}`)

    expect(allIncidents).toHaveLength(6)
  })
})
