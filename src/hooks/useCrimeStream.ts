import { useState, useCallback } from 'react';
import { RecordBatchReader } from 'apache-arrow';

type StreamBatch = unknown;

interface UseCrimeStreamResult {
  isLoading: boolean;
  error: Error | null;
  fetchStream: () => Promise<void>;
}

export const useCrimeStream = (onBatch?: (batch: StreamBatch) => void): UseCrimeStreamResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/crime/stream');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }

      // RecordBatchReader.from() accepts a standard Fetch API Response, 
      // a ReadableStream, or an ArrayBuffer.
      // We pass the response directly or the body stream.
      const reader = await RecordBatchReader.from(response);

      for await (const batch of reader) {
        if (onBatch) {
          onBatch(batch);
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error during streaming'));
    } finally {
      setIsLoading(false);
    }
  }, [onBatch]);

  return { isLoading, error, fetchStream };
};
