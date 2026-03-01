import type { Tenant } from '@/types'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useUpdateTenant } from '@/hooks/use-tenant'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'

interface ChannelsSectionProps {
  tenant: Tenant
}

interface FormData {
  whatsappProvider: string
  whatsappConfig: string
  instagramConfig: string
  telegramBotConfig: string
}

export function ChannelsSection({ tenant }: ChannelsSectionProps) {
  const updateTenant = useUpdateTenant()

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      whatsappProvider: tenant.whatsappProvider ?? 'zapi',
      whatsappConfig: JSON.stringify(tenant.whatsappConfig ?? {}, null, 2),
      instagramConfig: JSON.stringify(tenant.instagramConfig ?? {}, null, 2),
      telegramBotConfig: JSON.stringify(tenant.telegramBotConfig ?? {}, null, 2),
    },
  })

  useEffect(() => {
    reset({
      whatsappProvider: tenant.whatsappProvider ?? 'zapi',
      whatsappConfig: JSON.stringify(tenant.whatsappConfig ?? {}, null, 2),
      instagramConfig: JSON.stringify(tenant.instagramConfig ?? {}, null, 2),
      telegramBotConfig: JSON.stringify(tenant.telegramBotConfig ?? {}, null, 2),
    })
  }, [tenant, reset])

  function onSubmit(data: FormData) {
    try {
      updateTenant.mutate({
        whatsappProvider: data.whatsappProvider as 'zapi' | 'meta_cloud',
        whatsappConfig: JSON.parse(data.whatsappConfig || '{}'),
        instagramConfig: JSON.parse(data.instagramConfig || '{}'),
        telegramBotConfig: JSON.parse(data.telegramBotConfig || '{}'),
      })
    } catch {
      // JSON parse error handled by form
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Provedor WhatsApp"
        options={[
          { value: 'zapi', label: 'Z-API' },
          { value: 'meta_cloud', label: 'Meta Cloud API' },
        ]}
        {...register('whatsappProvider')}
      />
      <Textarea
        label="Config WhatsApp (JSON)"
        {...register('whatsappConfig')}
        className="font-mono text-xs"
      />
      <Textarea
        label="Config Instagram (JSON)"
        {...register('instagramConfig')}
        className="font-mono text-xs"
      />
      <Textarea
        label="Config Telegram Bot (JSON)"
        {...register('telegramBotConfig')}
        className="font-mono text-xs"
      />
      <Button type="submit" loading={updateTenant.isPending}>
        Salvar
      </Button>
    </form>
  )
}
