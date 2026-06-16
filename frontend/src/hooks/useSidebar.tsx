'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface SidebarContextType {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  expanded: false,
  setExpanded: () => {},
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

const STORAGE_KEY = 'vg_sidebar_expanded';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setExpanded(true);
    } catch {}
  }, []);

  const syncExpanded = useCallback((v: boolean) => {
    setExpanded(v);
    try { localStorage.setItem(STORAGE_KEY, String(v)); } catch {}
  }, []);

  const toggle = useCallback(() => {
    syncExpanded(!expanded);
  }, [expanded, syncExpanded]);

  return (
    <SidebarContext.Provider value={{ expanded, setExpanded: syncExpanded, toggle, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
