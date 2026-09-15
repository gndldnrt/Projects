import { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { POS } from "./pos";

type Category = { category_id: string; category_name: string };
type Product = { product_id: string; category_id: string | null; sku: string; barcode: string | null; product_name: string; description: string | null; base_price: number; tax_rate: number; image_url: string | null; is_active: boolean; is_composite: boolean; categories?: { category_name: string } | null };
type Ingredient = { ingredient_id: string; ingredient_name: string; stock_quantity: number; unit_of_measure: string; reorder_level: number; cost_per_unit: number };
type Variant = { variant_id: string; product_id: string; variant_name: string; price_delta: number; sku: string | null; is_active: boolean };
type Recipe = { recipe_id: string; product_id: string; variant_id: string | null; ingredient_id: string; quantity_required: number };
type ModifierGroup = { group_id: string; group_name: string; min_selection: number; max_selection: number };
type Order = { order_id: string; order_number: number; customer_name: string; subtotal: number; tax_amount: number; total_amount: number; status: string; created_at: string };
type State = { products: Product[]; categories: Category[]; ingredients: Ingredient[]; variants: Variant[]; recipes: Recipe[]; modifier_groups: ModifierGroup[]; product_modifier_groups: { product_id: string; group_id: string }[]; modifiers: { modifier_id: string; group_id: string; modifier_name: string; price: number }[]; orders: Order[] };
type CartItem = Product & { quantity: number };
const peso = (value: number) => `₱${Number(value || 0).toFixed(2)}`;
const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
};

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ first_name: string; last_name: string; role?: string } | null>(null);
  const [state, setState] = useState<State>({ products: [], categories: [], ingredients: [], variants: [], recipes: [], modifier_groups: [], product_modifier_groups: [], modifiers: [], orders: [] });
  const [view, setView] = useState<"overview" | "pos" | "catalog" | "inventory">("overview");
  const [notice, setNotice] = useState("");
  const load = async () => setState(await api<State>("/api/state"));
  useEffect(() => { api<{ authenticated: boolean; user: typeof user }>("/api/session").then((session) => { setAuthenticated(session.authenticated); setUser(session.user); }).catch(() => setAuthenticated(false)); }, []);
  useEffect(() => { if (authenticated) load().catch((error) => setNotice(error.message)); }, [authenticated]);
  if (authenticated === null) return <div className="loading">Connecting to Brewline...</div>;
  if (!authenticated) return <Login onLogin={(nextUser) => { setUser(nextUser); setAuthenticated(true); }} />;
  const lowStock = state.ingredients.filter((item) => Number(item.stock_quantity) <= Number(item.reorder_level)).length;
  return <div className="shell">
    <aside><div className="logo"><span>✦</span> Brewline</div><p className="caption">COFFEE SHOP OPERATIONS</p><nav>{[["overview", "Overview", "⌂"], ["pos", "Point of sale", "＋"], ["catalog", "Product catalog", "▦"], ["inventory", "Ingredients", "◌"]].map(([id, label, icon]) => <button className={view === id ? "active" : ""} onClick={() => setView(id as typeof view)} key={id}><b>{icon}</b>{label}</button>)}</nav><div className="aside-bottom"><span className="online"/> Supabase connected<br/><small>AdiDB · Coffeeshop</small></div></aside>
    <main><header><div><p className="caption">PHASE 2 · POS & INVENTORY</p><h1>{view === "overview" ? "Good morning, barista." : view === "pos" ? "Point of sale" : view === "catalog" ? "Product catalog" : "Ingredient inventory"}</h1></div><div className="account"><span>{user?.first_name} {user?.last_name}</span><button onClick={async () => { await api("/api/logout", { method: "POST" }); setAuthenticated(false); }}>Sign out</button></div></header>
      {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {view === "overview" && <section className="content"><div className="hero"><div><p className="caption">ADI DB · COFFEESHOP</p><h2>Your live catalog, connected.</h2><p>Phase 1 is focused on reading and managing your existing products, categories, and raw ingredients.</p><button onClick={() => setView("catalog")}>Open catalog <span>→</span></button></div><div className="hero-art">☕</div></div><div className="stats"><article><span>Active products</span><strong>{state.products.length}</strong><small>From products table</small></article><article><span>Categories</span><strong>{state.categories.length}</strong><small>From categories table</small></article><article><span>Ingredients</span><strong>{state.ingredients.length}</strong><small>Raw stock records</small></article><article><span>Reorder alerts</span><strong>{lowStock}</strong><small>At or below level</small></article></div><div className="panel"><div className="panel-head"><h3>Phase 1 database mapping</h3><span className="pill">Connected</span></div><div className="mapping"><span>products</span><span>categories</span><span>raw_ingredients</span><span>users / roles</span></div><p className="muted">Orders, payments, and history remain reserved for Phase 2.</p></div></section>}
      {view === "pos" && <POS products={state.products} orders={state.orders} onSaved={load} setNotice={setNotice} />}
      {view === "catalog" && <Catalog state={state} onSaved={load} setNotice={setNotice} />}
      {view === "inventory" && <section className="content"><div className="panel"><div className="panel-head"><div><p className="caption">RAW INGREDIENTS</p><h3>Stock visibility</h3></div><span className="pill">{lowStock} alerts</span></div><div className="table"><div className="table-head"><span>Ingredient</span><span>On hand</span><span>Reorder level</span><span>Cost / unit</span></div>{state.ingredients.map((item) => <div className="table-row" key={item.ingredient_id}><span><b>{item.ingredient_name}</b></span><span className={Number(item.stock_quantity) <= Number(item.reorder_level) ? "low" : ""}>{item.stock_quantity} {item.unit_of_measure}</span><span>{item.reorder_level} {item.unit_of_measure}</span><span>{peso(item.cost_per_unit)}</span></div>)}</div></div></section>}
    </main>
  </div>;
}

function Login({ onLogin }: { onLogin: (user: { first_name: string; last_name: string; role?: string }) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await api<{ user: { first_name: string; last_name: string; role?: string } }>("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin(result.user);
    } catch (loginError) {
      setError((loginError as Error).message);
    }
  };
  return <main className="login-screen"><form className="login-card" onSubmit={submit}><div className="logo"><span>✦</span> Brewline</div><p className="caption">ADI DB · COFFEESHOP</p><h1>Welcome back.</h1><p className="muted">Sign in with your Supabase account email and password.</p><label>Email<input required autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error">{error}</p>}<button className="login-button" type="submit">Sign in</button></form></main>;
}

function Catalog({ state, onSaved, setNotice }: { state: State; onSaved: () => Promise<void>; setNotice: (message: string) => void }) {
  const blank = { product_name: "", sku: "", barcode: "", category_id: "", base_price: "", tax_rate: "0", description: "", image_url: "", is_active: true, is_composite: true };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = state.products.filter((product) => `${product.product_name} ${product.sku} ${product.barcode || ""}`.toLowerCase().includes(query.toLowerCase()));
  const save = async (event: FormEvent) => { event.preventDefault(); try { await api(editing ? `/api/products/${editing}` : "/api/products", { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...form, base_price: Number(form.base_price), tax_rate: Number(form.tax_rate) }) }); const wasEditing = Boolean(editing); setForm(blank); setEditing(null); setModalOpen(false); await onSaved(); setNotice(wasEditing ? "Product updated." : "Product created."); } catch (error) { setNotice((error as Error).message); } };
  const remove = async (product: Product) => { if (!window.confirm(`Delete ${product.product_name}?`)) return; try { await api(`/api/products/${product.product_id}`, { method: "DELETE" }); await onSaved(); setNotice("Product deleted."); } catch (error) { setNotice((error as Error).message); } };
  const edit = (product: Product) => { setEditing(product.product_id); setForm({ product_name: product.product_name, sku: product.sku, barcode: product.barcode || "", category_id: product.category_id || "", base_price: String(product.base_price), tax_rate: String(product.tax_rate), description: product.description || "", image_url: product.image_url || "", is_active: product.is_active, is_composite: product.is_composite }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(blank); };
  return <section className="content"><div className="catalog-layout"><div className="panel product-list"><div className="panel-head"><div><p className="caption">PRODUCTS TABLE</p><h3>Product information</h3></div><div className="catalog-actions"><span className="pill">{state.products.length} records</span><button className="save-product add-product" onClick={() => { setEditing(null); setForm(blank); setModalOpen(true); }}>+ Add product</button></div></div><input className="search" placeholder="Search by name, SKU, or barcode..." value={query} onChange={(e) => setQuery(e.target.value)}/><div className="product-cards">{filtered.map((product) => <article className="product-card" key={product.product_id}><div className="product-card-top"><div className="product-icon">{product.image_url ? <img src={product.image_url} alt="" /> : "☕"}</div><span className={product.is_active ? "status" : "status muted-status"}>{product.is_active ? "Active" : "Inactive"}</span></div><h4>{product.product_name}</h4><p>{product.description || "No description"}</p><div className="product-meta"><span>{product.sku}</span><strong>{peso(product.base_price)}</strong></div><small>{product.categories?.category_name || "Uncategorized"} · {product.is_composite ? "Recipe product" : "Standalone"}</small><div className="card-actions"><button className="secondary" onClick={() => edit(product)}>Edit</button><button className="danger-button" onClick={() => remove(product)}>Delete</button></div></article>)}</div></div></div>{modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal-window" role="dialog" aria-modal="true"><div className="panel-head"><div><p className="caption">{editing ? "EDIT PRODUCT" : "NEW PRODUCT"}</p><h3>{editing ? "Update product information" : "Add a product"}</h3></div><button className="secondary" type="button" onClick={closeModal}>Close</button></div><form className="product-fields" onSubmit={save}><label>Product name<input required value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })}/></label><label>SKU<input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}/></label><label>Barcode<input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}/></label><label>Category<select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Uncategorized</option>{state.categories.map((category) => <option value={category.category_id} key={category.category_id}>{category.category_name}</option>)}</select></label><label>Base price<input required type="number" min="0" step=".01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })}/></label><label>Tax rate<input type="number" min="0" step=".0001" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}/></label><label className="wide">Image URL<input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}/></label><label className="wide">Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label><label className="check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}/> Active product</label><label className="check"><input type="checkbox" checked={form.is_composite} onChange={(e) => setForm({ ...form, is_composite: e.target.checked })}/> Uses recipe / ingredients</label><button className="save-product" type="submit">{editing ? "Save changes" : "Create product"}</button></form></div></div>}</section>;
}

createRoot(document.getElementById("root")!).render(<App />);
