import { createContext, useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api-client.js'
import { queryKeys } from '../lib/query-keys.js'
import type { Tenant, ListResponse } from '../types/api.types.js'

export interface TenantContextValue {
  tenantId: string | null
  tenant: Tenant | null
  tenants: { id: string; name: string; slug: string; plan: string }[]
  setTenantId: (id: string) => void
  isLoading: boolean
  error: Error | null
}

export const TenantContext = createContext<TenantContextValue>({
  tenantId: null,
  tenant: null,
  tenants: [],
  setTenantId: () => {},
  isLoading: true,
  error: null,
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(() => {
    return localStorage.getItem('atena_tenant_id')
  })

  const {
    data: tenantsData,
    isLoading: isLoadingTenants,
    error: tenantsError,
  } = useQuery({
    queryKey: queryKeys.tenants.all,
    queryFn: () =>
      api.get<ListResponse<{ id: string; name: string; slug: string; plan: string }>>(
        '/tenants',
      ),
  })

  const {
    data: tenantData,
    isLoading: isLoadingTenant,
    error: tenantError,
  } = useQuery({
    queryKey: queryKeys.tenants.detail(tenantId || ''),
    queryFn: () =>
      api.get<{ data: Tenant }>(`/tenants/${tenantId}`),
    enabled: !!tenantId,
  })

  const tenants = tenantsData?.data ?? []
  const error = tenantsError || tenantError || null

  // Auto-select first tenant if none selected
  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id)
    }
  }, [tenantId, tenants])

  function setTenantId(id: string) {
    setTenantIdState(id)
    localStorage.setItem('atena_tenant_id', id)
    api.setTenantId(id)
  }

  // Sync api client on mount
  useEffect(() => {
    if (tenantId) api.setTenantId(tenantId)
  }, [tenantId])

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenant: tenantData?.data ?? null,
        tenants,
        setTenantId,
        isLoading: isLoadingTenants || isLoadingTenant,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}
