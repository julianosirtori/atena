import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTenants, getTenant } from '@/lib/api'
import type { TenantListItem, Tenant } from '@/types'

interface TenantContextValue {
  tenantId: string | null
  tenant: Tenant | null
  tenants: TenantListItem[]
  isLoading: boolean
  setTenantId: (id: string) => void
}

const TenantContext = createContext<TenantContextValue>({
  tenantId: null,
  tenant: null,
  tenants: [],
  isLoading: true,
  setTenantId: () => {},
})

const STORAGE_KEY = 'atena:tenantId'

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: getTenants,
  })

  const tenantQuery = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => getTenant(tenantId!),
    enabled: !!tenantId,
  })

  const tenants = tenantsQuery.data?.data ?? []

  // Auto-select first tenant if none selected
  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id)
    }
  }, [tenantId, tenants])

  function setTenantId(id: string) {
    setTenantIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenant: tenantQuery.data?.data ?? null,
        tenants,
        isLoading: tenantsQuery.isLoading,
        setTenantId,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  return useContext(TenantContext)
}
