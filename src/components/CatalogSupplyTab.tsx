import React, { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { DashboardSnapshot, Product } from '../types/vendtrack.ts';
import { apiRequest, formatPhp } from '../lib/api.ts';

interface CatalogSupplyTabProps {
  data: DashboardSnapshot;
  token: string;
  onRefresh: () => Promise<void>;
}

export function CatalogSupplyTab({ data, token, onRefresh }: CatalogSupplyTabProps) {
  const [subTab, setSubTab] = useState<'products' | 'categories' | 'suppliers'>('products');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Price edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editCost, setEditCost] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');

  // New Product form
  const [sku, setSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [catId, setCatId] = useState<number>(data.categories[0]?.category_id ?? 1);
  const [supId, setSupId] = useState<number>(data.suppliers[0]?.supplier_id ?? 1);
  const [unitCost, setUnitCost] = useState('15.00');
  const [unitPrice, setUnitPrice] = useState('25.00');

  // New Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Supplier form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddr, setSupAddr] = useState('');

  const catMap = useMemo(
    () => new Map(data.categories.map((c) => [c.category_id, c])),
    [data.categories]
  );
  const supMap = useMemo(
    () => new Map(data.suppliers.map((s) => [s.supplier_id, s])),
    [data.suppliers]
  );

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const created = await apiRequest<Product>('/api/products', {
        method: 'POST',
        token,
        body: {
          sku,
          product_name: prodName,
          category_id: catId,
          supplier_id: supId,
          unit_cost: Number(unitCost),
          unit_price: Number(unitPrice),
        },
      });
      await onRefresh();
      setSku('');
      setProdName('');
      setFeedback({ type: 'success', text: `Added product ${created.sku} — ${created.product_name}.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to add product.' });
    }
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setFeedback(null);
    try {
      await apiRequest(`/api/products/${editingProduct.product_id}/price`, {
        method: 'PATCH',
        token,
        body: {
          unit_cost: Number(editCost),
          unit_price: Number(editPrice),
        },
      });
      await onRefresh();
      setFeedback({
        type: 'success',
        text: `Updated pricing for ${editingProduct.product_name}. Prior sale item snapshots remain unchanged (BR7).`,
      });
      setEditingProduct(null);
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Price update failed.' });
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/categories', {
        method: 'POST',
        token,
        body: { category_name: catName, description: catDesc },
      });
      await onRefresh();
      setCatName('');
      setCatDesc('');
      setFeedback({ type: 'success', text: 'Added new product category.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to add category.' });
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/suppliers', {
        method: 'POST',
        token,
        body: {
          supplier_name: supName,
          contact_person: supContact,
          contact_no: supPhone,
          email: supEmail,
          address: supAddr,
        },
      });
      await onRefresh();
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupAddr('');
      setFeedback({ type: 'success', text: 'Added new supplier.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to add supplier.' });
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-[#ECFDF9] border-[#99F6E4] text-[#072E28]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setSubTab('products')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'products' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Products ({data.products.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('categories')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Categories ({data.categories.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('suppliers')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'suppliers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Suppliers ({data.suppliers.length})
        </button>
      </div>

      {subTab === 'products' && (
        <div className="space-y-6">
          {editingProduct && (
            <form
              onSubmit={handleSavePrice}
              className="bg-white rounded-xl border border-[#0F766E]/40 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Update Pricing: {editingProduct.sku} — {editingProduct.product_name}
                </h3>
                <span className="text-xs text-slate-500">
                  Historical sale snapshots remain untouched (BR7)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Selling Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono tabular-nums"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
                  >
                    Save Price
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Product Catalogue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Prices in Philippine Pesos (₱). Enforces BR4 (single category &amp; supplier) and BR5 (selling price ≥ unit cost).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.products.map((p) => {
                    const cat = catMap.get(p.category_id);
                    const sup = supMap.get(p.supplier_id);
                    const margin = p.unit_price - p.unit_cost;
                    const marginPct = p.unit_price > 0 ? Math.round((margin / p.unit_price) * 100) : 0;
                    return (
                      <tr key={p.product_id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {p.sku}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{p.product_name}</td>
                        <td className="py-3 px-4 text-slate-600">{cat?.category_name}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">{sup?.supplier_name}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatPhp(p.unit_cost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatPhp(p.unit_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#15803D]">
                          {formatPhp(margin)} ({marginPct}%)
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(p);
                              setEditCost(String(p.unit_cost));
                              setEditPrice(String(p.unit_price));
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit Price</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleAddProduct} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0F766E]" />
              <h3 className="text-sm font-semibold text-slate-900">Add New Product</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">SKU (Unique)</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="VT-P013"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Name &amp; Size</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Green Tea 350ml"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={catId}
                  onChange={(e) => setCatId(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  {data.categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Supplier</label>
                <select
                  value={supId}
                  onChange={(e) => setSupId(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  {data.suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
              >
                Add Product
              </button>
            </div>
          </form>
        </div>
      )}

      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Product Categories</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {data.categories.map((c) => {
                const count = data.products.filter((p) => p.category_id === c.category_id).length;
                return (
                  <div key={c.category_id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{c.category_name}</div>
                      <div className="text-xs text-slate-500">{c.description || 'No description'}</div>
                    </div>
                    <span className="text-xs font-mono text-slate-600 tabular-nums shrink-0">
                      {count} products
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddCategory} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-slate-900">Add Category</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category Name (Unique)</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full h-9 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
            >
              Save Category
            </button>
          </form>
        </div>
      )}

      {subTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Approved Suppliers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/60">
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.suppliers.map((s) => (
                    <tr key={s.supplier_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900">{s.supplier_name}</td>
                      <td className="py-3 px-4 text-slate-600">{s.contact_person || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{s.contact_no || '—'}</div>
                        <div className="text-slate-400">{s.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleAddSupplier} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-3.5 h-fit">
            <h3 className="text-sm font-semibold text-slate-900">Register Supplier</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Supplier Name</label>
              <input
                type="text"
                required
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={supContact}
                onChange={(e) => setSupContact(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contact No.</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={supAddr}
                onChange={(e) => setSupAddr(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full h-9 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
            >
              Save Supplier
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
