import { Bot, InlineKeyboard } from 'grammy'
import Redis from 'ioredis'
import { db } from '@atena/database'
import { agents, conversations, messages } from '@atena/database'
import { eq, and } from 'drizzle-orm'
import { env } from '@atena/config'
import { assignToAgent, returnToAI } from '../handoff.service.js'
import { logger } from '../../lib/logger.js'
import type { AgentForNotification, ReplyModeState } from './telegram.types.js'

const REPLY_MODE_TTL = 7200 // 2 hours
const LINK_TOKEN_TTL = 600 // 10 minutes

export class TelegramBotService {
  private bot: Bot
  private redis: Redis

  constructor(botToken: string, redisUrl: string) {
    this.bot = new Bot(botToken)
    this.redis = new Redis(redisUrl)
    this.setupCommands()
    this.setupCallbacks()
    this.setupTextHandler()
  }

  private setupCommands(): void {
    // /start {token} — Link agent's Telegram to their account
    this.bot.command('start', async (ctx) => {
      const token = ctx.match?.trim()
      if (!token) {
        await ctx.reply('Envie /start seguido do token de vinculação. Ex: /start abc123')
        return
      }

      const agentData = await this.redis.get(`telegram:link:${token}`)
      if (!agentData) {
        await ctx.reply('Token inválido ou expirado. Gere um novo no painel.')
        return
      }

      const { agentId } = JSON.parse(agentData)
      const chatId = String(ctx.chat.id)

      // Link telegram chat ID to agent
      await db
        .update(agents)
        .set({ telegramChatId: chatId, updatedAt: new Date() })
        .where(eq(agents.id, agentId))

      // Clean up token
      await this.redis.del(`telegram:link:${token}`)

      await ctx.reply('✅ Telegram vinculado com sucesso! Você receberá notificações de novos leads aqui.')
    })

    // /status — Show active conversations count
    this.bot.command('status', async (ctx) => {
      const chatId = String(ctx.chat.id)
      const agent = await this.findAgentByChatId(chatId)

      if (!agent) {
        await ctx.reply('Conta não vinculada. Use /start {token} para vincular.')
        return
      }

      const [agentData] = await db
        .select({ activeConversations: agents.activeConversations, isOnline: agents.isOnline })
        .from(agents)
        .where(eq(agents.id, agent.id))
        .limit(1)

      await ctx.reply(
        `📊 Status:\n• Conversas ativas: ${agentData?.activeConversations ?? 0}\n• Status: ${agentData?.isOnline ? '🟢 Online' : '🔴 Offline'}`,
      )
    })

    // /online — Set agent as online
    this.bot.command('online', async (ctx) => {
      const chatId = String(ctx.chat.id)
      const agent = await this.findAgentByChatId(chatId)

      if (!agent) {
        await ctx.reply('Conta não vinculada. Use /start {token} para vincular.')
        return
      }

      await db
        .update(agents)
        .set({ isOnline: true, updatedAt: new Date() })
        .where(eq(agents.id, agent.id))

      await ctx.reply('🟢 Você está online e receberá notificações de novos leads.')
    })

    // /offline — Set agent as offline
    this.bot.command('offline', async (ctx) => {
      const chatId = String(ctx.chat.id)
      const agent = await this.findAgentByChatId(chatId)

      if (!agent) {
        await ctx.reply('Conta não vinculada. Use /start {token} para vincular.')
        return
      }

      await db
        .update(agents)
        .set({ isOnline: false, updatedAt: new Date() })
        .where(eq(agents.id, agent.id))

      await ctx.reply('🔴 Você está offline. Não receberá notificações.')
    })

    // /sair — Exit reply mode
    this.bot.command('sair', async (ctx) => {
      const chatId = String(ctx.chat.id)
      const key = `telegram:reply:${chatId}`
      const exists = await this.redis.exists(key)

      if (exists) {
        await this.redis.del(key)
        await ctx.reply('✅ Modo resposta desativado.')
      } else {
        await ctx.reply('Você não está em modo resposta.')
      }
    })
  }

  private setupCallbacks(): void {
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data
      const chatId = String(ctx.chat!.id)

      const agent = await this.findAgentByChatId(chatId)
      if (!agent) {
        await ctx.answerCallbackQuery({ text: 'Conta não vinculada' })
        return
      }

      if (data.startsWith('reply:')) {
        const conversationId = data.slice(6)
        await this.handleReplyCallback(ctx, chatId, agent, conversationId)
      } else if (data.startsWith('return_ai:')) {
        const conversationId = data.slice(10)
        await this.handleReturnAICallback(ctx, agent, conversationId)
      } else if (data.startsWith('panel:')) {
        const conversationId = data.slice(6)
        const panelUrl = env.PANEL_URL ?? 'http://localhost:5173'
        await ctx.reply(`🔗 Abrir no painel: ${panelUrl}/conversations/${conversationId}`)
        await ctx.answerCallbackQuery()
      }
    })
  }

  private async handleReplyCallback(
    ctx: any,
    chatId: string,
    agent: { id: string; tenantId: string },
    conversationId: string,
  ): Promise<void> {
    // Get conversation to find tenant/lead
    const [conversation] = await db
      .select({ tenantId: conversations.tenantId, leadId: conversations.leadId, status: conversations.status })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conversation) {
      await ctx.answerCallbackQuery({ text: 'Conversa não encontrada' })
      return
    }

    // Try to assign agent
    try {
      await assignToAgent(conversationId, agent.id, conversation.tenantId)
    } catch {
      await ctx.reply('⚠️ Este lead já foi assumido por outro atendente.')
      await ctx.answerCallbackQuery()
      return
    }

    // Store reply mode in Redis
    const replyState: ReplyModeState = {
      conversationId,
      leadId: conversation.leadId,
      tenantId: conversation.tenantId,
      agentId: agent.id,
    }

    await this.redis.set(
      `telegram:reply:${chatId}`,
      JSON.stringify(replyState),
      'EX',
      REPLY_MODE_TTL,
    )

    await ctx.reply(
      '💬 Modo resposta ativado! Suas mensagens serão enviadas diretamente para o lead.\nUse /sair para desativar.',
    )
    await ctx.answerCallbackQuery()
  }

  private async handleReturnAICallback(
    ctx: any,
    agent: { id: string; tenantId: string },
    conversationId: string,
  ): Promise<void> {
    const [conversation] = await db
      .select({ tenantId: conversations.tenantId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conversation) {
      await ctx.answerCallbackQuery({ text: 'Conversa não encontrada' })
      return
    }

    try {
      await returnToAI(conversationId, agent.id, conversation.tenantId)
    } catch {
      await ctx.reply('⚠️ Não foi possível devolver para a IA. Verifique o status da conversa.')
      await ctx.answerCallbackQuery()
      return
    }

    // Clear reply mode if active for this conversation
    const chatId = String(ctx.chat!.id)
    const key = `telegram:reply:${chatId}`
    const stateStr = await this.redis.get(key)
    if (stateStr) {
      const state = JSON.parse(stateStr) as ReplyModeState
      if (state.conversationId === conversationId) {
        await this.redis.del(key)
      }
    }

    await ctx.reply('↩️ Conversa devolvida para a IA.')
    await ctx.answerCallbackQuery()
  }

  private setupTextHandler(): void {
    // Handle text messages (non-command) for reply mode
    this.bot.on('message:text', async (ctx) => {
      // Skip commands
      if (ctx.message.text.startsWith('/')) return

      const chatId = String(ctx.chat.id)
      const key = `telegram:reply:${chatId}`
      const stateStr = await this.redis.get(key)

      if (!stateStr) {
        await ctx.reply('💡 Clique em "Responder" em uma notificação primeiro para ativar o modo resposta.')
        return
      }

      const state = JSON.parse(stateStr) as ReplyModeState

      // Save message to DB
      await db.insert(messages).values({
        tenantId: state.tenantId,
        conversationId: state.conversationId,
        direction: 'outbound',
        senderType: 'agent',
        senderAgentId: state.agentId,
        content: ctx.message.text,
        contentType: 'text',
        deliveryStatus: 'queued',
      })

      // Send via channel adapter
      const { leads: leadsTable } = await import('@atena/database')
      const [lead] = await db
        .select({ phone: leadsTable.phone, name: leadsTable.name })
        .from(leadsTable)
        .where(eq(leadsTable.id, state.leadId))
        .limit(1)

      if (lead?.phone) {
        try {
          // Resolve channel adapter
          const { tenants: tenantsTable } = await import('@atena/database')
          const [tenant] = await db
            .select({
              whatsappProvider: tenantsTable.whatsappProvider,
              whatsappConfig: tenantsTable.whatsappConfig,
            })
            .from(tenantsTable)
            .where(eq(tenantsTable.id, state.tenantId))
            .limit(1)

          if (tenant) {
            const { resolveAdapter } = await import('./telegram.utils.js')
            const adapter = resolveAdapter(tenant)
            await adapter.sendMessage(lead.phone, ctx.message.text)
          }
        } catch (error) {
          logger.error({ error }, 'Failed to send message via channel adapter')
        }
      }

      // Increment human messages count
      const { sql } = await import('drizzle-orm')
      await db
        .update(conversations)
        .set({
          humanMessagesCount: sql`${conversations.humanMessagesCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, state.conversationId))

      // Refresh TTL
      await this.redis.expire(key, REPLY_MODE_TTL)

      const leadName = lead?.name ?? 'lead'
      await ctx.reply(`✅ Enviado para ${leadName}!`)
    })
  }

  async notifyNewLead(
    agentsToNotify: AgentForNotification[],
    leadName: string | null,
    leadScore: number,
    leadChannel: string,
    conversationId: string,
    summary: string,
  ): Promise<void> {
    const eligible = agentsToNotify.filter(
      (a) =>
        a.telegramChatId &&
        a.isOnline &&
        a.notificationPreferences?.telegram !== false,
    )

    if (eligible.length === 0) {
      logger.info('No eligible agents for Telegram notification')
      return
    }

    const name = leadName ?? 'Lead sem nome'
    const text = `🔥 Lead quente: ${name}\nScore: ${leadScore} | Canal: ${leadChannel}\nResumo: ${summary}`

    const keyboard = new InlineKeyboard()
      .text('💬 Responder', `reply:${conversationId}`)
      .text('🔗 Abrir painel', `panel:${conversationId}`)
      .row()
      .text('↩️ Devolver IA', `return_ai:${conversationId}`)

    for (const agent of eligible) {
      try {
        await this.bot.api.sendMessage(agent.telegramChatId!, text, {
          reply_markup: keyboard,
        })
      } catch (error) {
        logger.error({ error, agentId: agent.id }, 'Failed to send Telegram notification')
      }
    }
  }

  async storeLinkToken(agentId: string): Promise<string> {
    const token = crypto.randomUUID().slice(0, 8)
    await this.redis.set(
      `telegram:link:${token}`,
      JSON.stringify({ agentId }),
      'EX',
      LINK_TOKEN_TTL,
    )
    return token
  }

  private async findAgentByChatId(chatId: string) {
    const [agent] = await db
      .select({ id: agents.id, tenantId: agents.tenantId })
      .from(agents)
      .where(eq(agents.telegramChatId, chatId))
      .limit(1)

    return agent ?? null
  }

  async start(): Promise<void> {
    logger.info('Starting Telegram bot...')
    this.bot.start({
      onStart: () => logger.info('Telegram bot started'),
    })
  }

  async stop(): Promise<void> {
    logger.info('Stopping Telegram bot...')
    await this.bot.stop()
    await this.redis.quit()
  }
}
