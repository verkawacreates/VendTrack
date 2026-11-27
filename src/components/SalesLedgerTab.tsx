import React, { useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { DashboardSnapshot, PaymentMethod } from '../types/vendtrack.ts';
import { apiRequest, formatPhp } from '../lib/api.ts';

interface SalesLedgerTabProps {
  data: DashboardSnapshot;
  token: string;
  onRefresh: () => Promise<void>;
  onExportCsv: (reportType: string, filename: string) => void;
}

export function SalesLedgerTab({ data, token, onRefresh, onExportCsv }: SalesLedgerTabProps) {
  const activeMachines = useMemo(
    () => data.machines.filter((m) => m.machine_status === 'Active'),
    [data.machines]
  );

  const [machineId, setMachineId] = useState<number>(activeMachines[0]?.machine_id ?? data.machines[0]?.machine_id ?? 1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GCash');
  const [cartLines, setCartLines] = useState<Array<{ product_id: number; quantity: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [lineQty, setLineQty] = useState<number>(1);
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentMethod>('All');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locMap = useMemo(() => new Map(data.locations.map((l) => [l.location_id, l])), [data.locations]);
  const machineMap = useMemo(() => new Map(data.machines.map((m) => [m.machine_id, m])), [data.machines]);
  const prodMap = useMemo(() => new Map(data.products.map((p) => [p.product_id, p])), [data.products]);

  // Products currently loaded in the selected machine with positive stock (BR8 & BR9)
  const availableProductsForMachine = useMemo(() => {
    const byProd = new Map<number, number>();
    for (const slot of data.machine_slots) {
      if (slot.machine_id === machineId) {
        byProd.set(slot.product_id, (byProd.get(slot.product_id) ?? 0) + slot.quantity);
      }
    }
    return Array.from(byProd.entries())
      .map(([product_id, qty]) => ({
        product_id,
        available: qty,
        product: prodMap.get(product_id),
      }))
      .filter((entry) => entry.product && entry.available > 0);
  }, [data.machine_slots, machineId, prodMap]);

  const effectiveSelectedProdId = useMemo(() => {
    if (availableProductsForMachine.some((p) => p.product_id === selectedProductId)) {
      return selectedProductId;
    }
    return availableProductsForMachine[0]?.product_id ?? 0;
  }, [availableProductsForMachine, selectedProductId]);

  function handleMachineSelect(id: number) {
    setMachineId(id);
    setCartLines([]);
    setFeedback(null);
  }

  function handleAddLine() {
    if (!effectiveSelectedProdId || lineQty <= 0) return;
    setCartLines((prev) => {
      const existing = prev.find((l) => l.product_id === effectiveSelectedProdId);
      if (existing) {
        return prev.map((l) =>
          l.product_id === effectiveSelectedProdId ? { ...l, quantity: l.quantity + lineQty } : l
        );
      }
      return [...prev, { product_id: effectiveSelectedProdId, quantity: lineQty }];
    });
    setLineQty(1);
  }

  const cartTotal = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const prod = prodMap.get(line.product_id);
      return sum + (prod ? prod.unit_price * line.quantity : 0);
    }, 0);
  }, [cartLines, prodMap]);

  async function handleRecordSale(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (cartLines.length === 0) {
      setFeedback({ type: 'error', text: 'BR6: Add at least one product item before recording a sale.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/api/sales', {
        method: 'POST',
        token,
        body: {
          machine_id: machineId,
          payment_method: paymentMethod,
          items: cartLines,
        },
      });
      await onRefresh();
      setCartLines([]);
      setFeedback({
        type: 'success',
        text: 'Sale recorded. Machine slot quantities deducted and unit prices snapshotted (BR7, BR9).',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to record sale.' });
    } finally {
      setSubmitting(false);
    }
  }

  const detailedSales = useMemo(() => {
    const itemsBySale = new Map<number, typeof data.sale_items>();
    for (const item of data.sale_items) {
      const arr = itemsBySale.get(item.sale_id) ?? [];
      arr.push(item);
      itemsBySale.set(item.sale_id, arr);
    }

    return [...data.sales]
      .filter((s) => paymentFilter === 'All' || s.payment_method === paymentFilter)
      .sort((a, b) => b.sale_id - a.sale_id)
      .map((sale) => {
        const machine = machineMap.get(sale.machine_id);
        const site = machine ? locMap.get(machine.location_id) : undefined;
        const lines = (itemsBySale.get(sale.sale_id) ?? []).map((item) => {
          const prod = prodMap.get(item.product_id);
          return {
            ...item,
            product_name: prod?.product_name ?? `Product #${item.product_id}`,
            sku: prod?.sku ?? '',
            line_total: item.quantity * item.unit_price_at_sale,
          };
        });
        const total = lines.reduce((sum, l) => sum + l.line_total, 0);
        return {
          ...sale,
          serial_no: machine?.serial_no ?? `Machine #${sale.machine_id}`,
          site_name: site?.site_name ?? 'Unknown Site',
          lines,
          total,
        };
      });
  }, [data.sales, data.sale_items, paymentFilter, machineMap, locMap, prodMap]);

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Point-of-Sale Recorder */}
        <form
          onSubmit={handleRecordSale}
          className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">Record Vending Sale</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforces BR7 (snapshot price), BR8 (Active machines &amp; loaded slots only), BR9 (auto stock deduction), and BR14 (payment method).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Vending Machine (Active units only)
            </label>
            <select
              value={machineId}
              onChange={(e) => handleMachineSelect(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs bg-white"
            >
              {data.machines.map((m) => {
                const site = locMap.get(m.location_id);
                return (
                  <option key={m.machine_id} value={m.machine_id} disabled={m.machine_status !== 'Active'}>
                    {m.serial_no} — {site?.site_name} ({m.machine_status})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['GCash', 'Cash', 'Coin', 'Card'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`h-9 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    paymentMethod === method
                      ? 'border-[#0F766E] bg-[#ECFDF9] text-[#072E28]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="block text-xs font-medium text-slate-700">Add Loaded Product</label>
            {availableProductsForMachine.length === 0 ? (
              <div className="text-xs text-[#B45309] bg-amber-50 border border-amber-200 rounded-lg p-3">
                No stocked products available in this machine. Dispatch a restock or check machine status.
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={effectiveSelectedProdId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  {availableProductsForMachine.map((entry) => (
                    <option key={entry.product_id} value={entry.product_id}>
                      {entry.product?.product_name} ({formatPhp(entry.product?.unit_price ?? 0)} · {entry.available} left)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={lineQty}
                  onChange={(e) => setLineQty(Number(e.target.value))}
                  className="w-16 h-9 px-2 rounded-lg border border-slate-200 text-xs font-mono text-center tabular-nums"
                />
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-3 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            )}
          </div>

          {cartLines.length > 0 && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {cartLines.map((line) => {
                const prod = prodMap.get(line.product_id);
                const sub = (prod?.unit_price ?? 0) * line.quantity;
                return (
                  <div key={line.product_id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-slate-900">{prod?.product_name}</div>
                      <div className="text-slate-500 font-mono tabular-nums">
                        {line.quantity} × {formatPhp(prod?.unit_price ?? 0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatPhp(sub)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCartLines((prev) => prev.filter((l) => l.product_id !== line.product_id))
                        }
                        aria-label="Remove item"
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="px-3.5 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Sale Total</span>
                <span className="font-mono text-sm text-slate-900 tabular-nums">
                  {formatPhp(cartTotal)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || cartLines.length === 0}
            className="w-full h-10 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            {submitting ? 'Recording Sale...' : 'Commit Sale Transaction'}
          </button>
        </form>

        {/* Right: Sales Ledger */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Transaction Ledger ({detailedSales.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Totals computed dynamically from SALE_ITEM snapshot prices (3NF)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['All', 'GCash', 'Cash', 'Coin', 'Card'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentFilter(pm)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      paymentFilter === pm ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onExportCsv('sales-ledger', 'vendtrack_sales_ledger.csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {detailedSales.map((sale) => (
              <div key={sale.sale_id} className="px-6 py-4 hover:bg-slate-50/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-900">#{sale.sale_id}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-[#0F766E] font-medium">{sale.serial_no}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{sale.site_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">{sale.payment_method}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatPhp(sale.total)}
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                  {sale.sale_datetime.replace('T', ' ')}
                </div>
                <div className="mt-2.5 space-y-1">
                  {sale.lines.map((line) => (
                    <div
                      key={line.product_id}
                      className="flex items-center justify-between text-xs text-slate-700 pl-3 border-l border-slate-200"
                    >
                      <span>
                        {line.product_name} <span className="text-slate-400">× {line.quantity}</span>
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        @{formatPhp(line.unit_price_at_sale)} = {formatPhp(line.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
