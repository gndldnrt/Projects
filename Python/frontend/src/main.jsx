import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const money = value => `₱${Number(value || 0).toFixed(2)}`;
const emptyForm = { name: '', category: 'Espresso', price: '', stock: '', emoji: '☕' };

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    setError('');
    try { await requestJson('/api/login', { method: 'POST', body: { username, password } }); onLogin(); }
    catch (loginError) { setError(loginError.message); }
  };
  return <main className="login-screen"><form className="login-card" onSubmit={submit}>
    <div className="brand"><span className="brand-mark">+</span><span>Brew & Co.</span></div>
    <p className="kicker">Store 01 · Brooklyn / NY</p><h1>Good coffee starts here.</h1><p className="muted">Sign in to manage today&apos;s counter.</p>
    <label>Username<input value={username} onChange={event => setUsername(event.target.value)} autoFocus /></label>
    <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
    {error && <p className="error">{error}</p>}<button className="primary full" type="submit">Open counter</button>
  </form></main>;
}

function Layout({ view, setView, onLogout, children }) {
  const links = [['dashboard', '◈', 'Dashboard'], ['pos', '＋', 'Build an order'], ['inventory', '▦', 'Inventory'], ['sales', '▤', 'Sales & reports']];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">+</span><span>Brew & Co.</span></div><nav>{links.map(([id, icon, label]) => <button className={view === id ? 'active' : ''} onClick={() => setView(id)} key={id}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-foot">Store 01<br />Brooklyn / NY<br /><br />All systems online</div></aside><section className="main"><header><strong>{links.find(link => link[0] === view)?.[2]}</strong><span className="muted">Wednesday, Aug 26, 2026</span><button className="outline" onClick={onLogout}>Sign out</button></header>{children}</section></div>;
}

function Dashboard({ products, sales, setView }) {
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  return <Page eyebrow="Good morning, Geandell" title="Your daily pour, at a glance." subtitle="A fresh view of today&apos;s cups, cravings, and cafe stock.">
    <div className="stats"><Stat label="Recorded sales" value={money(revenue)} note={`${sales.length} transactions`} /><Stat label="Menu items" value={products.length} note="Live from Supabase" /><Stat label="Low stock" value={products.filter(product => product.stock < 10).length} note="Need attention" /><Stat label="Units ready" value={products.reduce((sum, product) => sum + Number(product.stock || 0), 0)} note="Across the menu" /></div>
    <div className="split"><section className="panel feature"><div><span className="kicker">Counter shortcut</span><h2>Ready for the next guest?</h2><p className="muted">Build an order from the live menu and charge it in one step.</p><button className="primary" onClick={() => setView('pos')}>Start an order <span>→</span></button></div><div className="coffee-art">☕</div></section><section className="panel"><PanelTitle title="Recent sales" action="View all" onClick={() => setView('sales')} />{sales.slice(0, 4).map(sale => <div className="sale-line" key={sale.sales_id}><div><strong>{sale.sales_id}</strong><small>{sale.customer}</small></div><strong>{money(sale.total)}</strong></div>)}</section></div>
  </Page>;
}
function Stat({ label, value, note }) { return <div className="stat"><span className="kicker">{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function PanelTitle({ title, action, onClick }) { return <div className="panel-title"><h2>{title}</h2>{action && <button className="text-button" onClick={onClick}>{action} →</button>}</div>; }
function Page({ eyebrow, title, subtitle, children }) { return <main className="page"><span className="kicker">{eyebrow}</span><h1>{title}</h1><p className="muted">{subtitle}</p>{children}</main>; }

function POS({ products, setProducts, setSales, cart, setCart }) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const visible = products.filter(product => (category === 'All' || product.category === category) && product.stock > 0);
  const total = Object.values(cart).reduce((sum, item) => sum + item.price * item.qty, 0);
  const add = product => setCart(current => { const item = current[product.p_id]; if (item?.qty >= product.stock) return current; return { ...current, [product.p_id]: item ? { ...item, qty: item.qty + 1 } : { ...product, id: product.p_id, qty: 1 } }; });
  const change = (id, amount) => setCart(current => { const item = current[id]; if (!item || item.qty + amount < 1) { const next = { ...current }; delete next[id]; return next; } return { ...current, [id]: { ...item, qty: item.qty + amount } }; });
  const checkout = async () => { if (!Object.keys(cart).length) return; try { const result = await requestJson('/api/checkout', { method: 'POST', body: { items: Object.values(cart).map(item => ({ productId: String(item.id), quantity: item.qty })) } }); setProducts(result.state.products); setSales(result.state.sales); setCart({}); } catch (error) { window.alert(`Charge failed: ${error.message}`); } };
  return <Page eyebrow="Front counter" title="Build an order" subtitle="Tap a drink or pastry to start the guest order."><div className="pos-layout"><section><div className="tabs">{categories.map(item => <button className={item === category ? 'selected' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><div className="product-grid">{visible.map(product => <button className="product" onClick={() => add(product)} key={product.p_id}><span>{product.emoji}</span><strong>{product.name}</strong><small>{money(product.price)} · {product.stock} ready</small></button>)}</div></section><aside className="cart panel"><PanelTitle title="Current order" /><span className="muted">{Object.values(cart).reduce((sum, item) => sum + item.qty, 0)} items</span>{Object.values(cart).map(item => <div className="cart-line" key={item.id}><div><strong>{item.name}</strong><small>{money(item.price)}</small></div><div className="stepper"><button onClick={() => change(item.id, -1)}>−</button><span>{item.qty}</span><button onClick={() => change(item.id, 1)}>+</button></div></div>)}{!Object.keys(cart).length && <p className="empty">Your order is empty.<br />Choose a product to begin.</p>}<div className="total"><span>Total</span><strong>{money(total * 1.08875)}</strong></div><button className="primary full" disabled={!Object.keys(cart).length} onClick={checkout}>Charge {money(total * 1.08875)}</button></aside></div></Page>;
}

function Inventory({ products, refresh, setProducts }) {
  const [form, setForm] = useState(emptyForm); const [editing, setEditing] = useState(null); const [search, setSearch] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const resetForm = () => { setEditing(null); setForm(emptyForm); setError(''); };
  const save = async event => { event.preventDefault(); setSaving(true); setError(''); const path = editing ? `/api/products/${encodeURIComponent(editing.p_id)}` : '/api/products'; try { await requestJson(path, { method: editing ? 'PUT' : 'POST', body: { name: form.name.trim(), category: form.category, price: Number(form.price), stock: Number(form.stock), emoji: form.emoji } }); await refresh(); resetForm(); } catch (saveError) { setError(saveError.message); } finally { setSaving(false); } };
  const remove = async product => { if (!window.confirm(`Delete ${product.name}?`)) return; setError(''); try { await requestJson(`/api/products/${encodeURIComponent(product.p_id)}`, { method: 'DELETE' }); await refresh(); if (editing?.p_id === product.p_id) resetForm(); } catch (deleteError) { setError(deleteError.message); } };
  const filtered = products.filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase()));
  return <Page eyebrow="Product catalog" title="Inventory" subtitle="Keep every signature drink and fresh pastry ready for service."><div className="inventory-head"><input placeholder="Search products or SKU..." value={search} onChange={event => setSearch(event.target.value)} /></div><form className="panel product-form" onSubmit={save}><div className="form-heading"><div><span className="kicker">{editing ? 'Edit product' : 'New product'}</span><h2>{editing ? editing.name : 'Add an item to the menu'}</h2></div>{editing && <button className="outline" type="button" onClick={resetForm}>Cancel</button>}</div><div className="form-fields"><input required placeholder="Product name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input required type="number" min="0" step="0.01" placeholder="Price" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /><input required type="number" min="0" placeholder="Stock" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} /><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>Espresso</option><option>Non-coffee</option><option>Pastries</option><option>New</option></select><input maxLength="2" aria-label="Product emoji" value={form.emoji} onChange={event => setForm({ ...form, emoji: event.target.value })} /><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add product'}</button></div>{error && <p className="error">{error}</p>}</form><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>In stock</th><th>Actions</th></tr></thead><tbody>{filtered.map(product => <tr key={product.p_id}><td><strong>{product.emoji} {product.name}</strong></td><td>{product.sku}</td><td>{product.category}</td><td>{money(product.price)}</td><td><span className={product.stock < 10 ? 'warning' : ''}>{product.stock} units</span></td><td><button className="text-button" onClick={() => { setError(''); setEditing(product); setForm({ name: product.name, category: product.category, price: product.price, stock: product.stock, emoji: product.emoji || '☕' }); }}>Edit</button><button className="danger" onClick={() => remove(product)}>Delete</button></td></tr>)}</tbody></table></div></Page>;
}
function Sales({ sales }) { return <Page eyebrow="Transaction history" title="Sales & reports" subtitle="Review every order recorded by the counter."><div className="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{sales.map(sale => <tr key={sale.sales_id}><td><strong>{sale.sales_id}</strong></td><td>{sale.date}</td><td>{sale.customer}</td><td>{sale.items}</td><td><strong>{money(sale.total)}</strong></td><td><span className="status">{sale.status}</span></td></tr>)}</tbody></table></div></Page>; }

function App() {
  const [authenticated, setAuthenticated] = useState(null); const [view, setView] = useState('dashboard'); const [products, setProducts] = useState([]); const [sales, setSales] = useState([]); const [cart, setCart] = useState({});
  const refresh = async () => { const state = await requestJson('/api/state'); setProducts(state.products); setSales(state.sales); };
  useEffect(() => { requestJson('/api/session').then(result => setAuthenticated(result.authenticated)).catch(() => setAuthenticated(false)); }, []);
  useEffect(() => { if (authenticated) refresh().catch(error => window.alert(error.message)); }, [authenticated]);
  if (authenticated === null) return <div className="loading">Loading counter...</div>; if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;
  return <Layout view={view} setView={setView} onLogout={async () => { await requestJson('/api/logout', { method: 'POST' }); setAuthenticated(false); }}><>{view === 'dashboard' && <Dashboard products={products} sales={sales} setView={setView} />}{view === 'pos' && <POS products={products} setProducts={setProducts} setSales={setSales} cart={cart} setCart={setCart} />}{view === 'inventory' && <Inventory products={products} refresh={refresh} setProducts={setProducts} />}{view === 'sales' && <Sales sales={sales} />}</></Layout>;
}

createRoot(document.getElementById('root')).render(<App />);
