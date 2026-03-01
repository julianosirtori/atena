import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import type { Tenant } from '@/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useUpdateTenant } from '@/hooks/use-tenant'

interface BusinessSectionProps {
  tenant: Tenant
}

interface FormData {
  businessName: string
  businessDescription: string
  productsInfo: string
  pricingInfo: string
  faq: string
  businessHours: string
  paymentMethods: string
  customInstructions: string
}

export function BusinessSection({ tenant }: BusinessSectionProps) {
  const updateTenant = useUpdateTenant()
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      businessName: tenant.businessName ?? '',
      businessDescription: tenant.businessDescription ?? '',
      productsInfo: tenant.productsInfo ?? '',
      pricingInfo: tenant.pricingInfo ?? '',
      faq: tenant.faq ?? '',
      businessHours: tenant.businessHours ?? '',
      paymentMethods: tenant.paymentMethods ?? '',
      customInstructions: tenant.customInstructions ?? '',
    },
  })

  useEffect(() => {
    reset({
      businessName: tenant.businessName ?? '',
      businessDescription: tenant.businessDescription ?? '',
      productsInfo: tenant.productsInfo ?? '',
      pricingInfo: tenant.pricingInfo ?? '',
      faq: tenant.faq ?? '',
      businessHours: tenant.businessHours ?? '',
      paymentMethods: tenant.paymentMethods ?? '',
      customInstructions: tenant.customInstructions ?? '',
    })
  }, [tenant, reset])

  function onSubmit(data: FormData) {
    updateTenant.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome do negócio" {...register('businessName')} />
      <Textarea label="Descrição do negócio" {...register('businessDescription')} />
      <Textarea label="Produtos e serviços" {...register('productsInfo')} />
      <Textarea label="Preços e condições" {...register('pricingInfo')} />
      <Textarea label="Perguntas frequentes (FAQ)" {...register('faq')} />
      <Textarea label="Horário de atendimento" {...register('businessHours')} />
      <Textarea label="Formas de pagamento" {...register('paymentMethods')} />
      <Textarea label="Instruções personalizadas para a IA" {...register('customInstructions')} />
      <Button type="submit" loading={updateTenant.isPending}>
        Salvar
      </Button>
    </form>
  )
}
