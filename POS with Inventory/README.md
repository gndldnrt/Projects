# Brew & Co. POS

The Python backend is the active implementation and uses Supabase as its database.

## Python

```bash
cd "Python"
python3 server.py
```

If port `8000` is already in use, start it on another port:

```bash
PORT=8001 python3 server.py
```

Open http://localhost:8000.

The default credentials are:

- Username: `geandell`
- Password: `12345678`

## Supabase setup

The Python backend uses the Supabase REST API for the `products` and `sales` tables. Configure a valid project API key locally; do not place it in source files:

```bash
export SUPABASE_URL="https://thugdizbphittwuqifcj.supabase.co"
export SUPABASE_KEY="your-valid-publishable-or-anon-key"
cd "Python"
python3 server.py
```

To migrate local Python records to Supabase:

```bash
cd "Python"
python3 migrate_to_supabase.py
```

The React frontend source is in `Python/frontend`. Install Node.js, then build it with:

```bash
cd "Python/frontend"
npm install
npm run build
cd ..
python3 server.py
```

The Python server serves `frontend/dist` at `http://localhost:8000` after the build.

Expected columns are:

- `products`: `p_id`, `name`, `sku`, `category`, `price`, `stock`, `emoji`
- `sales`: `sales_id`, `date`, `customer`, `items`, `total`, `status`

Product requests use `product_id`, which maps to `products.p_id`.

Check the connection after logging in with `GET /api/database`. The tables must allow the API role to select, insert, update, and delete rows through Supabase RLS policies. Database mode is required by default; set `SUPABASE_REQUIRED=0` only when intentionally using local fallback storage.
