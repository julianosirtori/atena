import { useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import type { Tenant } from '@/types'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useUpdateTenant, useChannelStatus } from '@/hooks/use-tenant'
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
  const [testEnabled, setTestEnabled] = useState(false)
  const { data: statusData, isLoading: isTestingConnection, refetch } = useChannelStatus({
    enabled: testEnabled,
    refetchInterval: 0,
  })

  const whatsappStatus = statusData?.data?.whatsapp
  const instagramStatus = statusData?.data?.instagram

  function handleTestConnection() {
    if (testEnabled) {
      refetch()
    } else {
      setTestEnabled(true)
    }
  }

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
      <div className="flex items-center gap-3">
        <Button type="submit" loading={updateTenant.isPending}>
          Salvar
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={isTestingConnection}
          onClick={handleTestConnection}
        >
          Testar conexão
        </Button>
      </div>

      {testEnabled && statusData && (
        <div className="space-y-2 rounded-lg border border-warm-200 bg-warm-50 p-3">
          <div className="flex items-center gap-2 text-sm">
            {whatsappStatus?.status === 'online' ? (
              <Wifi size={16} className="text-emerald-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
            <span className="font-medium">WhatsApp:</span>
            <span className={whatsappStatus?.status === 'online' ? 'text-emerald-700' : 'text-red-700'}>
              {whatsappStatus?.status === 'online' ? 'Online' : 'Offline'}
            </span>
            {whatsappStatus?.error && (
              <span className="text-xs text-red-500">— {whatsappStatus.error}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {instagramStatus?.status === 'online' ? (
              <Wifi size={16} className="text-emerald-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
            <span className="font-medium">Instagram:</span>
            <span className={instagramStatus?.status === 'online' ? 'text-emerald-700' : 'text-red-700'}>
              {instagramStatus?.status === 'online' ? 'Online' : 'Offline'}
            </span>
            {instagramStatus?.error && (
              <span className="text-xs text-red-500">— {instagramStatus.error}</span>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
