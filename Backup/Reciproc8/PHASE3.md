# Phase 3: Matching and privacy-first maps

## Database setup

Run [`003_phase3_matching_postgis.sql`](./supabase/migrations/003_phase3_matching_postgis.sql) in the Supabase SQL editor or through Supabase migrations. It:

- Enables PostGIS.
- Stores exact points in `profile_locations`, protected by owner-only RLS.
- Finds mutual matches when teach/learn interests overlap in both directions.
- Includes partial matches when one direction overlaps.
- Applies `ST_DWithin` for a 5, 10, or 25 mile search.
- Shifts every returned point by a random 200-500 meters inside the `SECURITY DEFINER` RPC before it leaves PostgreSQL.
- Grants the RPC only to authenticated users and verifies the requested profile belongs to `auth.uid()`.

The exact point must be written from a trusted geocoding flow. Never expose `profile_locations.point` through a client `select`.

## Frontend setup

Install dependencies:

```bash
cd frontend
npm install
```

The map uses Leaflet and OpenStreetMap tiles, so no Google Cloud account, billing account, or map API key is required for this student prototype.

The reusable integration is split across:

- [`matching.ts`](./frontend/src/matching.ts): typed Supabase RPC call.
- [`useProfileMatches.ts`](./frontend/src/useProfileMatches.ts): loading, error, refresh, and radius state boundary.
- [`LocalHobbyMap.tsx`](./frontend/src/LocalHobbyMap.tsx): Leaflet/OpenStreetMap markers and popups.
- [`Phase3MatchesPanel.tsx`](./frontend/src/Phase3MatchesPanel.tsx): 5/10/25 mile control, loading skeleton, empty state, and map integration.

The dashboard renders `Phase3MatchesPanel` using the authenticated profile ID and does not use fallback profile or match data.

## Free map provider

OpenStreetMap data is free to use with attribution. The public tile server is appropriate for development and a small student demo. For a high-traffic production deployment, use a hosted OpenStreetMap provider or self-host tiles instead of sending heavy traffic to the public tile server.

## Privacy model

PostGIS keeps the exact point server-side. The RPC projects the point to a random bearing and distance between 200 and 500 meters, then returns only the shifted latitude/longitude. This prevents the browser, a malicious client, or a leaked API response from recovering a participant's exact address from the map payload. The UI displays proximity and match skills, not a street address.

## Verification

```bash
cd frontend
npm run build
```

The build validates the map component, RPC response types, and dashboard integration. After applying the SQL migration and authenticating a user, the `find_profile_matches` RPC can be tested from Supabase's SQL editor:

```sql
select *
from public.find_profile_matches('P-20260915-001', 25);
```
