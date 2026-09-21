import { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { LocalHobbyMap } from './LocalHobbyMap';
import { useProfileMatches } from './useProfileMatches';

const radiusOptions = [5, 10, 25] as const;

export function Phase3MatchesPanel({ profileId, compact = false }: { profileId: string; compact?: boolean }) {
  const [radius, setRadius] = useState<number>(25);
  const { data, loading, error } = useProfileMatches(profileId, radius);

  return (
    <section className={`${compact ? 'mb-0 rounded-2xl p-3' : 'mb-9 rounded-3xl p-5 sm:p-6'} glass`}>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-emerald-300">
            <MapPin size={15} /> LIVE LOCAL MATCHING
          </div>
          <h2 className={compact ? 'text-base font-semibold' : 'text-xl font-semibold'}>Live matching map</h2>
          {!compact && <p className="mt-1 text-sm text-slate-500">Mutual matches appear first. Map pins are intentionally shifted for privacy.</p>}
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-400">
          Radius
          <select
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
          >
            {radiusOptions.map((option) => <option key={option} value={option}>{option} miles</option>)}
          </select>
        </label>
      </div>
      {loading && <div className="flex h-72 animate-pulse items-center justify-center rounded-2xl bg-white/[0.03] text-sm text-slate-500">Searching your local circle...</div>}
      {!loading && error && <div className="flex h-72 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-6 text-center text-sm text-rose-200">{error}</div>}
      {!loading && !error && data.length === 0 && <div className={`flex ${compact ? 'h-56' : 'h-72'} flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center`}><Search className="mb-3 text-slate-600" /><p className="text-sm text-slate-300">No matches found in this radius.</p><p className="mt-1 text-xs text-slate-500">Try expanding your search to find more hobbyists.</p></div>}
      {!loading && !error && data.length > 0 && <LocalHobbyMap matches={data} compact={compact} />}
    </section>
  );
}
