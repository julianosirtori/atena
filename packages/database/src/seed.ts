import { eq } from 'drizzle-orm'
import { db, closeDb } from './client.js'
import {
  tenants,
  agents,
  leads,
  conversations,
  messages,
  leadEvents,
  monthlyLeadCounts,
} from './schema.js'

async function seed() {
  console.log('Seeding database...')

  // Idempotent: skip if demo tenant already exists
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'loja-demo'))
    .limit(1)

  if (existing.length > 0) {
    console.log('Seed data already exists (slug: loja-demo). Skipping.')
    await closeDb()
    return
  }

  // 1. Tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'Loja Demo',
      slug: 'loja-demo',
      plan: 'pro',
      leadsLimit: 500,
      agentsLimit: 3,
      businessName: 'Loja Demo Eletrônicos',
      businessDescription:
        'Loja de eletrônicos e acessórios com entrega rápida em São Paulo. Trabalhamos com smartphones, notebooks, tablets e acessórios das melhores marcas.',
      productsInfo:
        'iPhone 15 Pro Max - R$ 8.999\nSamsung Galaxy S24 Ultra - R$ 7.499\nMacBook Air M3 - R$ 12.999\nAirPods Pro 2 - R$ 1.899\nCapinhas a partir de R$ 49,90',
      pricingInfo:
        'Parcelamos em até 12x sem juros no cartão. PIX com 5% de desconto. Frete grátis acima de R$ 299.',
      faq: 'Prazo de entrega: 1-3 dias úteis para SP capital, 3-7 dias para demais regiões.\nTroca e devolução: até 7 dias após recebimento.\nGarantia: 12 meses de fábrica + 3 meses da loja.',
      businessHours: 'Segunda a sexta: 9h às 18h. Sábado: 9h às 13h.',
      paymentMethods: 'PIX, cartão de crédito (Visa, Mastercard, Elo), boleto bancário',
      customInstructions:
        'Sempre oferecer frete grátis quando o pedido ultrapassar R$ 299. Mencionar promoções ativas.',
      whatsappProvider: 'zapi',
      whatsappConfig: {
        instanceId: 'demo-instance-id',
        token: 'demo-token',
        webhookSecret: 'demo-webhook-secret',
        phone: '5511900000000',
      },
      billingStatus: 'active',
      trialEndsAt: new Date('2026-01-15'),
    })
    .returning()

  console.log(`  Tenant created: ${tenant.name} (${tenant.id})`)

  // 2. Agents
  const [agentAdmin, agentRegular] = await db
    .insert(agents)
    .values([
      {
        tenantId: tenant.id,
        name: 'Carlos Silva',
        email: 'carlos@lojademo.com.br',
        passwordHash: '$2b$10$placeholder_hash_admin_not_real',
        role: 'admin',
        isActive: true,
        isOnline: true,
        telegramChatId: '123456789',
      },
      {
        tenantId: tenant.id,
        name: 'Ana Oliveira',
        email: 'ana@lojademo.com.br',
        passwordHash: '$2b$10$placeholder_hash_agent_not_real',
        role: 'agent',
        isActive: true,
        isOnline: false,
      },
    ])
    .returning()

  console.log(`  Agents created: ${agentAdmin.name}, ${agentRegular.name}`)

  // 3. Leads (5 leads at varying stages/scores)
  const [lead1, lead2, lead3, lead4, lead5] = await db
    .insert(leads)
    .values([
      {
        tenantId: tenant.id,
        name: 'Maria Santos',
        phone: '5511999001001',
        channel: 'whatsapp',
        stage: 'hot',
        score: 75,
        tags: ['interessada', 'iphone'],
        utmSource: 'facebook',
        utmMedium: 'cpc',
        utmCampaign: 'black-friday-2026',
        lastCountedMonth: '2026-02',
        lastMessageAt: new Date('2026-02-14T15:30:00Z'),
      },
      {
        tenantId: tenant.id,
        name: 'João Pereira',
        phone: '5511999002002',
        channel: 'whatsapp',
        stage: 'qualifying',
        score: 40,
        tags: ['notebook'],
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'macbook-fev',
        lastCountedMonth: '2026-02',
        lastMessageAt: new Date('2026-02-13T10:00:00Z'),
      },
      {
        tenantId: tenant.id,
        name: 'Fernanda Lima',
        phone: '5511999003003',
        channel: 'whatsapp',
        stage: 'new',
        score: 10,
        lastCountedMonth: '2026-02',
        lastMessageAt: new Date('2026-02-14T18:00:00Z'),
      },
      {
        tenantId: tenant.id,
        name: 'Pedro Costa',
        phone: '5511999004004',
        channel: 'whatsapp',
        stage: 'human',
        score: 65,
        tags: ['urgente', 'samsung'],
        assignedTo: agentAdmin.id,
        lastCountedMonth: '2026-02',
        lastMessageAt: new Date('2026-02-14T16:45:00Z'),
      },
      {
        tenantId: tenant.id,
        name: 'Luciana Rocha',
        instagramId: 'luciana.rocha.ig',
        channel: 'instagram',
        stage: 'converted',
        score: 90,
        tags: ['convertida', 'airpods'],
        assignedTo: agentRegular.id,
        lastCountedMonth: '2026-02',
        convertedAt: new Date('2026-02-10T14:00:00Z'),
        lastMessageAt: new Date('2026-02-10T14:00:00Z'),
      },
    ])
    .returning()

  console.log(`  Leads created: ${[lead1, lead2, lead3, lead4, lead5].map((l) => l.name).join(', ')}`)

  // 4. Conversations (10 conversations — 2 per lead)
  const conversationValues = [
    // Lead 1 — Maria (hot)
    {
      tenantId: tenant.id,
      leadId: lead1.id,
      channel: 'whatsapp' as const,
      status: 'ai' as const,
      aiMessagesCount: 8,
      leadMessagesCount: 6,
      firstResponseTimeMs: 1200,
      aiSummary: 'Lead interessada em iPhone 15 Pro Max. Perguntou sobre preço e parcelamento.',
    },
    {
      tenantId: tenant.id,
      leadId: lead1.id,
      channel: 'whatsapp' as const,
      status: 'closed' as const,
      aiMessagesCount: 3,
      leadMessagesCount: 2,
      closedAt: new Date('2026-02-01T10:00:00Z'),
      aiSummary: 'Conversa anterior sobre capinha de celular. Resolvida.',
    },
    // Lead 2 — João (qualifying)
    {
      tenantId: tenant.id,
      leadId: lead2.id,
      channel: 'whatsapp' as const,
      status: 'ai' as const,
      aiMessagesCount: 4,
      leadMessagesCount: 3,
      firstResponseTimeMs: 950,
      aiSummary: 'Buscando MacBook Air M3. Comparando com Windows.',
    },
    {
      tenantId: tenant.id,
      leadId: lead2.id,
      channel: 'whatsapp' as const,
      status: 'closed' as const,
      aiMessagesCount: 2,
      leadMessagesCount: 1,
      closedAt: new Date('2026-01-28T16:00:00Z'),
    },
    // Lead 3 — Fernanda (new)
    {
      tenantId: tenant.id,
      leadId: lead3.id,
      channel: 'whatsapp' as const,
      status: 'ai' as const,
      aiMessagesCount: 1,
      leadMessagesCount: 1,
      firstResponseTimeMs: 800,
    },
    {
      tenantId: tenant.id,
      leadId: lead3.id,
      channel: 'whatsapp' as const,
      status: 'closed' as const,
      aiMessagesCount: 1,
      leadMessagesCount: 1,
      closedAt: new Date('2026-02-12T09:00:00Z'),
    },
    // Lead 4 — Pedro (human)
    {
      tenantId: tenant.id,
      leadId: lead4.id,
      channel: 'whatsapp' as const,
      status: 'waiting_human' as const,
      assignedAgentId: agentAdmin.id,
      aiMessagesCount: 6,
      leadMessagesCount: 5,
      humanMessagesCount: 0,
      firstResponseTimeMs: 1100,
      handoffReason: 'Lead solicitou falar com atendente humano',
      handoffAt: new Date('2026-02-14T16:40:00Z'),
      aiSummary: 'Lead quer Samsung Galaxy S24 Ultra mas tem dúvida sobre garantia estendida.',
    },
    {
      tenantId: tenant.id,
      leadId: lead4.id,
      channel: 'whatsapp' as const,
      status: 'closed' as const,
      aiMessagesCount: 2,
      leadMessagesCount: 2,
      closedAt: new Date('2026-02-05T11:00:00Z'),
    },
    // Lead 5 — Luciana (converted, Instagram)
    {
      tenantId: tenant.id,
      leadId: lead5.id,
      channel: 'instagram' as const,
      status: 'closed' as const,
      assignedAgentId: agentRegular.id,
      aiMessagesCount: 5,
      leadMessagesCount: 4,
      humanMessagesCount: 3,
      firstResponseTimeMs: 1500,
      closedAt: new Date('2026-02-10T14:00:00Z'),
      aiSummary: 'Comprou AirPods Pro 2 via Instagram. Pagou com PIX.',
    },
    {
      tenantId: tenant.id,
      leadId: lead5.id,
      channel: 'instagram' as const,
      status: 'closed' as const,
      aiMessagesCount: 2,
      leadMessagesCount: 1,
      closedAt: new Date('2026-01-20T08:00:00Z'),
    },
  ]

  const insertedConversations = await db
    .insert(conversations)
    .values(conversationValues)
    .returning()

  console.log(`  Conversations created: ${insertedConversations.length}`)

  // 5. Messages (50 messages across conversations)
  const c = insertedConversations
  const messageValues = [
    // Conv 0: Maria's active conversation (14 messages: 8 AI + 6 lead)
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Oi, boa tarde! Vocês têm o iPhone 15 Pro Max?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Olá, Maria! Boa tarde! 😊 Sim, temos o iPhone 15 Pro Max disponível. O valor é R$ 8.999 e parcelamos em até 12x sem juros. Quer saber mais detalhes?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Qual a cor disponível?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Temos nas cores: Titânio Natural, Titânio Azul, Titânio Branco e Titânio Preto. Todas com 256GB. Qual sua preferência?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Azul! E vocês entregam em Osasco?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Sim! Entregamos em Osasco, normalmente em 2 dias úteis. Como o valor é acima de R$ 299, o frete é grátis! 🚚' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'E tem desconto no PIX?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Temos sim! No PIX fica R$ 8.549,05 (5% de desconto). Quer que eu gere o link de pagamento?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Vou pensar, mas acho que vou querer. Posso comprar amanhã?' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Claro, sem problemas! Quando decidir, é só me chamar aqui mesmo. O estoque da cor Azul está limitado, então recomendo não demorar muito. 😉' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Tá bom, obrigada!' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Por nada, Maria! Estou à disposição. Boas compras! 🛍️' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Ah, e se preferir parcelar, as 12x ficam em R$ 749,92 por mês, sem juros!' },
    { tenantId: tenant.id, conversationId: c[0].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Qualquer dúvida, é só chamar. Bom final de semana!' },

    // Conv 1: Maria's closed conversation (5 messages)
    { tenantId: tenant.id, conversationId: c[1].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Oi, vocês vendem capinha pro iPhone 14?' },
    { tenantId: tenant.id, conversationId: c[1].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Olá! Sim, temos capinhas a partir de R$ 49,90. Temos modelos transparentes, coloridos e com proteção militar.' },
    { tenantId: tenant.id, conversationId: c[1].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Quanto fica a transparente?' },
    { tenantId: tenant.id, conversationId: c[1].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'A capinha transparente para iPhone 14 custa R$ 49,90. Posso ajudar com mais alguma coisa?' },
    { tenantId: tenant.id, conversationId: c[1].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Como não houve mais resposta, estou encerrando por aqui. Se precisar, é só chamar!' },

    // Conv 2: João's active conversation (7 messages)
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Boa noite! Estou procurando um notebook bom pra trabalho. Vocês têm MacBook?' },
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Boa noite, João! Temos sim! O MacBook Air M3 está por R$ 12.999. Excelente para trabalho — leve, bateria de 18h e performance incrível.' },
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'É caro... vocês têm algo mais em conta com Windows?' },
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Entendo! Infelizmente no momento estamos focados em produtos Apple. Mas o MacBook Air M3 pode ser parcelado em 12x de R$ 1.083,25 sem juros. Quer que eu envie mais detalhes?' },
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Hmm deixa eu pensar. Obrigado!' },
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Sem problemas! Quando decidir, estou por aqui. 😊' },
    { tenantId: tenant.id, conversationId: c[2].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Ah, no PIX o MacBook fica R$ 12.349,05. Só pra ter em mente! 😉' },

    // Conv 3: João's closed conversation (3 messages)
    { tenantId: tenant.id, conversationId: c[3].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Olá, quanto custa o frete pra Campinas?' },
    { tenantId: tenant.id, conversationId: c[3].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Olá! Para Campinas o frete é grátis em pedidos acima de R$ 299. Abaixo disso, fica R$ 29,90.' },
    { tenantId: tenant.id, conversationId: c[3].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Se precisar de mais alguma informação, estou por aqui!' },

    // Conv 4: Fernanda's active conversation (2 messages)
    { tenantId: tenant.id, conversationId: c[4].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Oi' },
    { tenantId: tenant.id, conversationId: c[4].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Olá! Bem-vinda à Loja Demo Eletrônicos! Como posso te ajudar hoje?' },

    // Conv 5: Fernanda's closed conversation (2 messages)
    { tenantId: tenant.id, conversationId: c[5].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Vocês são de onde?' },
    { tenantId: tenant.id, conversationId: c[5].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Somos de São Paulo capital! Fazemos entregas para todo o Brasil.' },

    // Conv 6: Pedro's waiting_human conversation (11 messages: 6 AI + 5 lead)
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Quero comprar um Samsung Galaxy S24 Ultra' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Ótima escolha, Pedro! O Samsung Galaxy S24 Ultra está por R$ 7.499. Temos nas cores Titânio Cinza e Titânio Violeta.' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Vocês oferecem garantia estendida?' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Oferecemos 12 meses de garantia de fábrica + 3 meses da loja, totalizando 15 meses. Para garantia estendida além disso, recomendo falar com um de nossos consultores.' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Quero falar com alguém sobre isso' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Claro! Vou te conectar com um de nossos consultores agora mesmo. Sobre a garantia estendida: nossos consultores podem te oferecer planos de 24 e 36 meses. Aguarde um momento!' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'outbound' as const, senderType: 'system' as const, content: 'Você está sendo transferido para um consultor. Tempo estimado de espera: 2 minutos.' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Ok, obrigado' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Por nada! O Carlos já vai te atender.' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Tô aguardando' },
    { tenantId: tenant.id, conversationId: c[6].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Obrigado pela paciência, Pedro! O consultor Carlos será notificado agora.' },

    // Conv 7: Pedro's closed conversation (4 messages)
    { tenantId: tenant.id, conversationId: c[7].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Qual o prazo de entrega pra Guarulhos?' },
    { tenantId: tenant.id, conversationId: c[7].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Para Guarulhos, normalmente 2 dias úteis. Frete grátis em pedidos acima de R$ 299!' },
    { tenantId: tenant.id, conversationId: c[7].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Valeu!' },
    { tenantId: tenant.id, conversationId: c[7].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'De nada! Precisando, é só chamar. 😊' },

    // Conv 8: Luciana's converted conversation (Instagram, 12 messages)
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Oi! Vi no stories que vocês têm AirPods Pro 2' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Olá, Luciana! Temos sim! O AirPods Pro 2 está por R$ 1.899. Com cancelamento de ruído ativo e USB-C.' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Quero comprar! Aceita PIX?' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Aceita sim! No PIX fica R$ 1.804,05 (5% de desconto). Quer que eu te passe para um consultor finalizar a compra?' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Sim, por favor!' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Perfeito! Vou te conectar com a Ana para finalizar. Enquanto isso, o valor no PIX é R$ 1.804,05 e o frete é grátis!' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'system' as const, content: 'Transferido para a consultora Ana Oliveira.' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'agent' as const, senderAgentId: agentRegular.id, content: 'Oi Luciana! Aqui é a Ana. Vou te enviar a chave PIX para pagamento, ok?' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Oi Ana! Pode mandar!' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'agent' as const, senderAgentId: agentRegular.id, content: 'Pronto! Chave PIX enviada. Assim que confirmar o pagamento, já embalo e envio hoje mesmo.' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'outbound' as const, senderType: 'agent' as const, senderAgentId: agentRegular.id, content: 'Pagamento confirmado! Seu AirPods Pro 2 será enviado hoje. O código de rastreio será enviado por aqui. Obrigada pela compra! 🎧' },
    { tenantId: tenant.id, conversationId: c[8].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Maravilha, obrigada Ana! 💜' },

    // Conv 9: Luciana's older closed conversation (3 messages)
    { tenantId: tenant.id, conversationId: c[9].id, direction: 'inbound' as const, senderType: 'lead' as const, content: 'Vocês vendem Apple Watch?' },
    { tenantId: tenant.id, conversationId: c[9].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Olá! No momento não trabalhamos com Apple Watch, mas fique de olho nas nossas redes que em breve teremos novidades!' },
    { tenantId: tenant.id, conversationId: c[9].id, direction: 'outbound' as const, senderType: 'ai' as const, content: 'Posso ajudar com mais alguma coisa?' },
  ]

  await db.insert(messages).values(messageValues)
  console.log(`  Messages created: ${messageValues.length}`)

  // 6. Lead events
  const eventValues = [
    { tenantId: tenant.id, leadId: lead1.id, eventType: 'score_change' as const, fromValue: '0', toValue: '10', createdBy: 'system' },
    { tenantId: tenant.id, leadId: lead1.id, eventType: 'stage_change' as const, fromValue: 'new', toValue: 'qualifying', createdBy: 'system' },
    { tenantId: tenant.id, leadId: lead1.id, eventType: 'score_change' as const, fromValue: '35', toValue: '75', createdBy: 'ai' },
    { tenantId: tenant.id, leadId: lead1.id, eventType: 'stage_change' as const, fromValue: 'qualifying', toValue: 'hot', createdBy: 'system' },
    { tenantId: tenant.id, leadId: lead1.id, eventType: 'tag_added' as const, toValue: 'interessada', createdBy: 'ai' },
    { tenantId: tenant.id, leadId: lead2.id, eventType: 'score_change' as const, fromValue: '0', toValue: '10', createdBy: 'system' },
    { tenantId: tenant.id, leadId: lead2.id, eventType: 'stage_change' as const, fromValue: 'new', toValue: 'qualifying', createdBy: 'system' },
    { tenantId: tenant.id, leadId: lead4.id, eventType: 'handoff' as const, toValue: 'waiting_human', createdBy: 'ai', metadata: { reason: 'Lead solicitou atendente humano' } },
    { tenantId: tenant.id, leadId: lead4.id, eventType: 'assigned' as const, toValue: agentAdmin.id, createdBy: 'system' },
    { tenantId: tenant.id, leadId: lead5.id, eventType: 'converted' as const, createdBy: `agent:${agentRegular.id}` },
  ]

  await db.insert(leadEvents).values(eventValues)
  console.log(`  Lead events created: ${eventValues.length}`)

  // 7. Monthly lead counts
  await db.insert(monthlyLeadCounts).values({
    tenantId: tenant.id,
    yearMonth: '2026-02',
    leadCount: 5,
    notified80: false,
    notified100: false,
  })
  console.log('  Monthly lead counts created: 1')

  console.log('Seed complete.')
  await closeDb()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
