# Guia de Teste Local

## 1. Pré-requisitos

```bash
# Subir PostgreSQL e Redis
docker compose up -d

# Instalar dependências
npm install

# Rodar migrations e seed
npm run db:migrate
npm run db:seed
```

Verifique que os containers estão saudáveis:
```bash
docker compose ps
# postgres (porta 5433) e redis (porta 6379) devem estar "healthy"
```

## 2. Configuração da IA

### OpenAI (padrão)

Adicione no `.env`:
```env
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
AI_MODEL=gpt-4o
```

**Custos estimados:** ~$0.01-0.03 por conversa (5-10 mensagens). Em testes com 100 conversas, espere gastar ~$1-3.

### Anthropic (Claude)

```env
CLAUDE_API_KEY=sk-ant-...
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
```

### Sem credenciais (MockAdapter)

Para desenvolver sem gastar em API, o sistema usa `MockAdapter` quando `whatsappConfig.instanceId` é `'mock'` ou ausente. O worker vai chamar a IA normalmente, mas mensagens de saída ficam apenas no banco.

## 3. Configuração do Z-API

### Criar instância

1. Acesse [z-api.io](https://z-api.io) e crie uma instância
2. Copie o `Instance ID` e `Token`
3. No `.env`:
   ```env
   ZAPI_INSTANCE_ID=seu-instance-id
   ZAPI_TOKEN=seu-token
   ```

### Configurar Webhook URL

Para desenvolvimento local, use ngrok para expor sua porta:

```bash
ngrok http 3000
```

No painel Z-API, configure o webhook para:
```
https://SEU-NGROK.ngrok-free.app/webhooks/whatsapp
```

### Conectar WhatsApp (QR Code)

1. No painel Z-API, clique em "QR Code"
2. Escaneie com o WhatsApp do número de teste
3. Aguarde a conexão confirmar

### Atualizar tenant no banco

```sql
UPDATE tenants SET
  whatsapp_provider = 'zapi',
  whatsapp_config = '{"instanceId": "seu-instance-id", "token": "seu-token", "phone": "5511999999999"}'
WHERE slug = 'loja-demo';
```

## 4. Testando o Pipeline Completo

### Subir API e Worker

```bash
# Terminal 1: API (recebe webhooks)
npm run dev --workspace=@atena/api

# Terminal 2: Worker (processa IA)
npm run dev --workspace=@atena/workers
```

### Simular mensagem via curl

```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ReceivedCallback",
    "instanceId": "demo-instance-id",
    "phone": "5511999999999",
    "messageId": "MSG-TEST-001",
    "fromMe": false,
    "momment": 1740218400000,
    "isGroup": false,
    "isNewsletter": false,
    "senderName": "Cliente Teste",
    "text": {"message": "Oi, quanto custa o iPhone?"}
  }'
```

### Verificar no banco

```sql
-- Ver mensagens da conversa
SELECT direction, sender_type, content, ai_metadata
FROM messages
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'loja-demo')
ORDER BY created_at DESC
LIMIT 5;

-- Ver score do lead
SELECT name, phone, score, stage
FROM leads
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'loja-demo');

-- Ver eventos
SELECT event_type, from_value, to_value, created_by
FROM lead_events
ORDER BY created_at DESC
LIMIT 10;
```

## 5. Rodando Testes

```bash
# Todos os testes do worker (96 testes)
npm run test --workspace=@atena/workers

# Testes de um módulo específico
cd apps/workers && npx vitest run __tests__/prompt.builder.test.ts

# Modo watch (re-roda ao salvar)
cd apps/workers && npx vitest

# Todos os testes do monorepo
npm run test

# Typecheck
npm run typecheck
```

## 6. MockAdapter para Dev sem Credenciais

O `MockAdapter` é usado automaticamente quando:
- `whatsappConfig.instanceId` é `'mock'` ou não está definido
- Não há credenciais Z-API/Meta configuradas

O adapter armazena mensagens enviadas em memória. Para inspecionar:

```typescript
import { MockAdapter } from '@atena/channels'

const adapter = new MockAdapter()
await adapter.sendMessage('5511999...', 'Olá!')
console.log(adapter.getSentMessages()) // [{ to, content, timestamp, type }]
```

## 7. Trocando de Provider

O provider de IA é configurado via variáveis de ambiente:

| Provider | `AI_PROVIDER` | `AI_MODEL` | API Key |
|----------|--------------|------------|---------|
| OpenAI | `openai` | `gpt-4o` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `claude-sonnet-4-20250514` | `CLAUDE_API_KEY` |

A troca é feita apenas alterando `.env` — nenhuma mudança de código necessária. O serviço de IA usa LangChain como camada de abstração.

### Adicionando um novo provider

1. Instale o pacote LangChain correspondente (ex: `@langchain/google-genai`)
2. Atualize `AI_PROVIDER` enum em `packages/config/src/env.ts`
3. Atualize `createAIService()` em `apps/workers/src/services/ai.service.ts`
