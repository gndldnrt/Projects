import { useCallback, useEffect, useState } from 'react';
import { findProfileMatches, type MapMatch } from './matching';

interface UseProfileMatchesResult {
  data: MapMatch[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProfileMatches(profileId: string, radiusMiles: number): UseProfileMatchesResult {
  const [data, setData] = useState<MapMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await findProfileMatches(profileId, radiusMiles));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load matches');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [profileId, radiusMiles]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
