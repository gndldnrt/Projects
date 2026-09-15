# Local Hobbyist Finder & Skill Swapper

Phase 1 and Phase 2 prototype using React + TypeScript + Tailwind CSS, FastAPI, and a Supabase-compatible data contract.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

In another terminal, from the project root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Both the frontend and backend load the root `supabase.env` file automatically. The frontend keeps `MOCK_AUTH_MODE = true` for the prototype UI, while the FastAPI registration and local-profile routes use the live Supabase project configured in that file.

All profile, user-skill, and swap IDs follow the required `P-YYYYMMDD-00X`, `US-YYYYMMDD-00X`, and `SW-YYYYMMDD-00X` string formats.
