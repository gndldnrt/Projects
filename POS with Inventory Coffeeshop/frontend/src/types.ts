export type Product = { product_id: string; category_id: string | null; sku: string; barcode: string | null; product_name: string; description: string | null; base_price: number; tax_rate: number; image_url: string | null; is_active: boolean; is_composite: boolean; categories?: { category_name: string } | null };
export type Order = { order_id: string; order_number: number; customer_name: string; subtotal: number; tax_amount: number; total_amount: number; status: string; created_at: string };
export type CartItem = Product & { quantity: number };
