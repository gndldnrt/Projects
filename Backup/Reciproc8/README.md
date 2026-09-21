# Local Hobbyist Finder & Skill Swapper

Phase 1 and Phase 2 prototype using React + TypeScript + Tailwind CSS, FastAPI, and a Supabase-compatible data contract.

## Run locally

```bash
cd /Users/macbookprom1/Repository/Reciproc8
npm run dev
```

This starts both servers:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

If the virtual environment has not been created yet:

```bash
cd /Users/macbookprom1/Repository/Reciproc8
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd frontend
npm install
```

Both the frontend and backend load the root `supabase.env` file automatically. Live auth is enabled with `MOCK_AUTH_MODE = false`, so the frontend login and account creation screens use Supabase Auth and create/link a profile row.

For Phase 3 live matching, run the migrations in this order from the Supabase SQL Editor:

1. `supabase/migrations/003_phase3_matching_postgis.sql`
2. `supabase/migrations/004_philippines_demo_locations.sql`
3. `supabase/migrations/005_auth_profile_policies.sql`
4. `supabase/migrations/006_philippines_zip_constraint.sql`
5. `supabase/migrations/007_seed_20_philippines_profiles.sql`
6. `supabase/migrations/008_phase4_phase5_requests_chat_radius.sql`
7. `supabase/migrations/009_profiles_friends_cleanup.sql`
8. `supabase/migrations/010_swap_based_friends.sql`

Migration `007` inserts 20 non-authenticated Metro Manila sample profiles, 40
skill mappings, and privacy-safe PostGIS points. They are display-only records:
they do not have passwords or Supabase Auth accounts. A signed-in user with
ZIP `1000` will see them through the live `/api/profiles/local` dashboard
query.

All profile, user-skill, and swap IDs follow the required `P-YYYYMMDD-00X`, `US-YYYYMMDD-00X`, and `SW-YYYYMMDD-00X` string formats.

## Phase 4 and Phase 5

Migration `008` adds `swap_requests`, accepted-only `messages`, realtime
subscriptions, and the PostGIS `find_profiles_within_radius` RPC. Run it in
the Supabase SQL Editor after the earlier migrations. The browser uses the
existing Leaflet/OpenStreetMap integration; Google Maps and a Google API key
are not required.

Friends are derived from accepted `swap_requests`; there is no separate
friendship table. Migration `010` removes the earlier friendship trigger/table
and lets accepted swap participants view each other's profile, open the
existing realtime chat, and see the relationship in the Friends panel.

For production, configure the frontend environment as:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key
VITE_API_BASE_URL=https://api.example.com
```

Only public Supabase URL and publishable/anon keys belong in the frontend.
Never expose a Supabase service-role key, database password, or signing secret
in `.env.production` or browser code.

The copyable template is `frontend/.env.production.example`.

Supabase RLS is the authorization boundary for chat: a message insert must
match an `Accepted` swap request and the authenticated profile must be the
sender. The client realtime channel is therefore only a delivery mechanism;
it cannot bypass the database policy. Incoming requests are similarly limited
to their sender/receiver, and only the receiver can transition `Pending` to
`Accepted` or `Declined`.

## Password storage

Passwords are intentionally not part of `public.profiles`. Supabase Auth stores credentials in the protected `auth.users` system table and stores a one-way password hash, never a plaintext password. The application receives a session and uses the user's Auth UUID as `profiles.auth_id`. Do not add a `password` column to `public.profiles` and do not send passwords to the FastAPI profile endpoints.
