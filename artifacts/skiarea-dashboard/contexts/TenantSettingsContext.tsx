import React, { createContext, useContext, useMemo } from "react";
import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantSettingsValue {
  logoBase64: string | null;
  colors: string[];
  maxSeasons: number;
  isLoading: boolean;
  queryKey: readonly unknown[];
}

const DEFAULT: TenantSettingsValue = {
  logoBase64: null,
  colors: [],
  maxSeasons: 3,
  isLoading: false,
  queryKey: [],
};

const TenantSettingsContext = createContext<TenantSettingsValue>(DEFAULT);

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, queryKey } = useGetSettings({ query: { enabled: isAuthenticated } as any });

  const value = useMemo<TenantSettingsValue>(
    () => ({
      logoBase64: data?.logoBase64 ?? null,
      colors: data?.colors ?? [],
      maxSeasons: data?.maxSeasons ?? 3,
      isLoading,
      queryKey,
    }),
    [data, isLoading, queryKey]
  );

  return (
    <TenantSettingsContext.Provider value={value}>
      {children}
    </TenantSettingsContext.Provider>
  );
}

export function useTenantSettings(): TenantSettingsValue {
  return useContext(TenantSettingsContext);
}
