# Brewline POS

A clean, separate POS and inventory system for a coffee shop.

- `frontend/`: TypeScript + React + Vite
- `backend/`: Python HTTP API backed by Supabase REST
- `supabase/migrations/`: database schema and seed menu

## Setup

1. Do not run a new schema migration. Phase 1 uses the existing `AdiDB > Coffeeshop` tables.
2. Copy `.env.example` to `.env` and add the project anon/publishable key.
3. Install dependencies and start the API:

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 app.py
```

4. In another terminal, start the TypeScript frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` to `http://localhost:8000`.

## Phase 1 database mapping

The backend reads the existing `products` table joined to `categories`, and reads `raw_ingredients` for inventory visibility and reorder alerts. Login uses `users.username`, `users.pin_code`, `users.is_active`, and the related `roles.role_name`. The `password_hash` column is not used by this Phase 1 passcode login.

### Product relationship blueprint

The product workspace is based on the relationships in the existing schema:

```text
categories.category_id
        └── products.category_id
                ├── product_variants.product_id
                ├── product_recipes.product_id
                │       └── product_recipes.ingredient_id → raw_ingredients.ingredient_id
                └── product_modifier_groups.product_id
                        └── product_modifier_groups.group_id → modifier_groups.group_id
                                └── modifiers.group_id
```

`GET /api/state` fetches the catalog graph: products, categories, raw ingredients, variants, recipes, modifier groups, product-to-group mappings, modifiers, and recent POS orders. The product form supports CRUD for the existing `products` table using its real columns: `product_name`, `sku`, `barcode`, `category_id`, `description`, `base_price`, `tax_rate`, `image_url`, `is_active`, and `is_composite`.

## POS setup

Run [`supabase/migrations/002_pos_transactions.sql`](supabase/migrations/002_pos_transactions.sql) in the same Supabase project. It adds only POS transaction tables (`pos_orders`, `pos_order_items`, `pos_payments`) and the `complete_pos_order` RPC. The RPC writes the order, payment, and line items atomically and deducts recipe quantities from `raw_ingredients`. The POS screen supports keyboard-wedge barcode scanners: focus the barcode field, scan, and press Enter. Completed orders can be printed using the browser receipt print dialog.
