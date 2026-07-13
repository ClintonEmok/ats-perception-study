'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

export function DashboardThemeSync() {
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  return null;
}
