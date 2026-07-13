import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export const useLogger = () => {
  const log = useCallback((type: string, payload?: unknown) => {
    logger.log(type, payload);
  }, []);

  return { log };
};
