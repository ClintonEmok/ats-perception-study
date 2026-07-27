'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useDemoStkde } from './lib/useDemoStkde';

type DashboardDemo3dValue = ReturnType<typeof useDemoStkde>;

const DashboardDemo3dContext = createContext<DashboardDemo3dValue | null>(null);

export function DashboardDemo3dProvider({ children }: { children: ReactNode }) {
  const stkde = useDemoStkde();

  return (
    <DashboardDemo3dContext.Provider value={stkde}>
      {children}
    </DashboardDemo3dContext.Provider>
  );
}

export function useDashboardDemo3d(): DashboardDemo3dValue {
  const value = useContext(DashboardDemo3dContext);
  if (!value) {
    throw new Error('useDashboardDemo3d must be used within DashboardDemo3dProvider');
  }
  return value;
}
