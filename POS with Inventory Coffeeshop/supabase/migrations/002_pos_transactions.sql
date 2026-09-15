-- Phase 2 POS persistence. Run after the existing AdiDB > Coffeeshop master schema.
create table if not exists public.pos_orders (
  order_id uuid primary key default uuid_generate_v4(),
  order_number bigint generated always as identity unique,
  user_id uuid not null references public.users(user_id),
  customer_name varchar(100) not null default 'Walk-in customer',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax_amount numeric(12,2) not null check (tax_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status varchar(20) not null default 'completed' check (status in ('completed','voided')),
  created_at timestamptz not null default now()
);
create table if not exists public.pos_order_items (
  order_item_id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.pos_orders(order_id) on delete cascade,
  product_id uuid not null references public.products(product_id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create table if not exists public.pos_payments (
  payment_id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.pos_orders(order_id) on delete cascade,
  payment_method varchar(30) not null,
  amount numeric(12,2) not null check (amount >= 0),
  paid_at timestamptz not null default now()
);

create or replace function public.complete_pos_order(
  p_user_id uuid,
  p_customer_name varchar,
  p_items jsonb,
  p_payment_method varchar
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row record;
  recipe_row record;
  new_order pos_orders%rowtype;
  subtotal numeric(12,2) := 0;
  tax numeric(12,2) := 0;
  quantity integer;
  line_total numeric(12,2);
begin
  if jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into product_row from products
      where product_id = (item->>'product_id')::uuid and is_active = true;
    if not found then raise exception 'Product not found'; end if;
    quantity := (item->>'quantity')::integer;
    if quantity < 1 then raise exception 'Quantity must be positive'; end if;
    line_total := product_row.base_price * quantity;
    subtotal := subtotal + line_total;
    tax := tax + (line_total * product_row.tax_rate);
    for recipe_row in select * from product_recipes where product_id = product_row.product_id loop
      update raw_ingredients
      set stock_quantity = stock_quantity - (recipe_row.quantity_required * quantity),
          updated_at = current_timestamp
      where ingredient_id = recipe_row.ingredient_id
        and stock_quantity >= (recipe_row.quantity_required * quantity);
      if not found then raise exception 'Insufficient ingredient stock'; end if;
    end loop;
  end loop;
  insert into pos_orders (user_id, customer_name, subtotal, tax_amount, total_amount)
  values (p_user_id, coalesce(nullif(p_customer_name, ''), 'Walk-in customer'), round(subtotal,2), round(tax,2), round(subtotal + tax,2))
  returning * into new_order;
  for item in select * from jsonb_array_elements(p_items) loop
    select base_price into product_row from products where product_id = (item->>'product_id')::uuid;
    quantity := (item->>'quantity')::integer;
    insert into pos_order_items (order_id, product_id, quantity, unit_price, line_total)
    values (new_order.order_id, (item->>'product_id')::uuid, quantity, product_row.base_price, product_row.base_price * quantity);
  end loop;
  insert into pos_payments (order_id, payment_method, amount)
  values (new_order.order_id, p_payment_method, new_order.total_amount);
  return jsonb_build_object('order', row_to_json(new_order), 'order_number', new_order.order_number);
end;
$$;

alter table public.pos_orders enable row level security;
alter table public.pos_order_items enable row level security;
alter table public.pos_payments enable row level security;
grant execute on function public.complete_pos_order(uuid, varchar, jsonb, varchar) to anon, authenticated;
