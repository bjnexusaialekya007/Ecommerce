import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import type { CatalogResponse } from '../api/client';
import type { ClientConfig } from '../config/schema';

interface StoreContextValue {
  config: ClientConfig;
  isDemo: boolean;
  catalog: CatalogResponse | null;
  loadingCatalog: boolean;
  refreshCatalog: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  initialConfig,
  isDemo,
  children,
}: {
  initialConfig: ClientConfig;
  isDemo: boolean;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<ClientConfig>(initialConfig);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const latest = await api.getConfigPublic();
      setConfig(latest);
    } catch {
      // ignore if offline
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const c = await api.getCatalog();
      setCatalog(c);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void refreshConfig();
    void refreshCatalog();
  }, [refreshConfig, refreshCatalog]);

  return (
    <StoreContext.Provider
      value={{
        config,
        isDemo,
        catalog,
        loadingCatalog,
        refreshCatalog,
        refreshConfig,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
