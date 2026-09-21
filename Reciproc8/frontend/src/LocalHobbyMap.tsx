import { useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { MapMatch } from './matching';

interface Props {
  matches: MapMatch[];
  compact?: boolean;
}

export function LocalHobbyMap({ matches, compact = false }: Props) {
  const [selected, setSelected] = useState<MapMatch | null>(null);
  const center = matches[0]
    ? [matches[0].latitude, matches[0].longitude] as [number, number]
    : [14.5995, 120.9842] as [number, number];

  return (
    <div className={`${compact ? 'h-60' : 'h-96'} overflow-hidden rounded-2xl border border-white/[0.08]`}>
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {matches.map((match) => (
          <CircleMarker
            key={match.profile_id}
            center={[match.latitude, match.longitude]}
            radius={9}
            pathOptions={{
              color: match.match_type === 'mutual' ? '#34d399' : '#a78bfa',
              fillColor: match.match_type === 'mutual' ? '#10b981' : '#8b5cf6',
              fillOpacity: 0.85,
            }}
            eventHandlers={{ click: () => setSelected(match) }}
          >
            {selected?.profile_id === match.profile_id && (
              <Popup eventHandlers={{ remove: () => setSelected(null) }}>
                <div className="min-w-52 p-1 text-slate-900">
                  <strong className="block text-base">{match.full_name}</strong>
                  <span className="text-xs capitalize text-slate-500">
                    {match.match_type} match · {match.distance_miles} miles away
                  </span>
                  <p className="mt-2 text-sm">{match.bio}</p>
                  <a className="mt-2 inline-block text-sm font-semibold text-emerald-700" href={`/profiles/${match.profile_id}`}>
                    View full profile
                  </a>
                </div>
              </Popup>
            )}
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
