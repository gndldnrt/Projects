import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface RadiusResult { profile_id: string; full_name: string; distance_miles: number }
interface Props { profileId: string }

export function RadiusFilter({ profileId }: Props) {
  const [radius, setRadius] = useState(25);
  const [results, setResults] = useState<RadiusResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true); setError('');
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc('find_profiles_within_radius', { p_profile_id: profileId, p_radius_miles: radius });
      if (rpcError) setError(rpcError.message);
      else setResults((data ?? []) as RadiusResult[]);
      setLoading(false);
    })();
  }, [profileId, radius]);
  return <section className="glass rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="font-medium">Search radius</h2><span className="text-sm text-emerald-300">{radius} miles</span></div><input type="range" min="5" max="25" step="5" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-4 w-full accent-emerald-300" /><p className="mt-3 text-sm text-slate-500">{loading ? 'Searching nearby profiles...' : error ? error : results.length ? `${results.length} hobbyists found nearby.` : 'No users found in this radius. Try widening your search.'}</p></section>;
}
