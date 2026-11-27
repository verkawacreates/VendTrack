import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DashboardSnapshot } from '../types/vendtrack.ts';
import { apiRequest } from '../lib/api.ts';

interface RestockRoutesTabProps {
  data: DashboardSnapshot;
  token: string;
  preselectMachineId: number | null;
  onRefresh: () => Promise<void>;
}

export function RestockRoutesTab({
  data,
  token,
  preselectMachineId,
  onRefresh,
}: RestockRoutesTabProps) {
  const routeDrivers = useMemo(
    () => data.employees.filter((e) => e.role === 'Route Driver'),
    [data.employees]
  );

  const [machineId, setMachineId] = useState<number>(
    preselectMachineId ?? data.machines[0]?.machine_id ?? 1
  );
  const [employeeId, setEmployeeId] = useState<number>(routeDrivers[0]?.employee_id ?? 4);
  const [restockDate, setRestockDate] = useState('2026-11-26');
  const [items, setItems] = useState<Array<{ product_id: number; quantity_added: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [qtyAdded, setQtyAdded] = useState<number>(4);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locMap = useMemo(() => new Map(data.locations.map((l) => [l.location_id, l])), [data.locations]);
  const machineMap = useMemo(() => new Map(data.machines.map((m) => [m.machine_id, m])), [data.machines]);
  const prodMap = useMemo(() => new Map(data.products.map((p) => [p.product_id, p])), [data.products]);
  const empMap = useMemo(() => new Map(data.employees.map((e) => [e.employee_id, e])), [data.employees]);

  const machineProductsWithRoom = useMemo(() => {
    const map = new Map<number, { qty: number; cap: number }>();
    for (const s of data.machine_slots) {
      if (s.machine_id === machineId) {
        const prev = map.get(s.product_id) ?? { qty: 0, cap: 0 };
        map.set(s.product_id, { qty: prev.qty + s.quantity, cap: prev.cap + s.max_capacity });
      }
    }
    return Array.from(map.entries()).map(([product_id, counts]) => ({
      product_id,
      product: prodMap.get(product_id),
      qty: counts.qty,
      cap: counts.cap,
      room: counts.cap - counts.qty,
    }));
  }, [data.machine_slots, machineId, prodMap]);

  const effectiveProdId = useMemo(() => {
    if (machineProductsWithRoom.some((p) => p.product_id === selectedProductId)) {
      return selectedProductId;
    }
    return machineProductsWithRoom[0]?.product_id ?? 0;
  }, [machineProductsWithRoom, selectedProductId]);

  function handleAddLine() {
    if (!effectiveProdId || qtyAdded <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === effectiveProdId);
      if (existing) {
        return prev.map((i) =>
          i.product_id === effectiveProdId ? { ...i, quantity_added: i.quantity_added + qtyAdded } : i
        );
      }
      return [...prev, { product_id: effectiveProdId, quantity_added: qtyAdded }];
    });
  }

  async function handleSubmitRestock(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (items.length === 0) {
      setFeedback({ type: 'error', text: 'Add at least one product line to restock.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/api/restocks', {
        method: 'POST',
        token,
        body: {
          machine_id: machineId,
          employee_id: employeeId,
          restock_date: restockDate,
          items,
        },
      });
      await onRefresh();
      setItems([]);
      setFeedback({
        type: 'success',
        text: 'Restock visit logged and machine slot inventory replenished (BR10, BR3).',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to record restock.' });
    } finally {
      setSubmitting(false);
    }
  }

  const detailedRestocks = useMemo(() => {
    const itemsMap = new Map<number, typeof data.restock_items>();
    for (const ri of data.restock_items) {
      const arr = itemsMap.get(ri.restock_id) ?? [];
      arr.push(ri);
      itemsMap.set(ri.restock_id, arr);
    }
    return [...data.restocks]
      .sort((a, b) => b.restock_id - a.restock_id)
      .map((r) => {
        const machine = machineMap.get(r.machine_id);
        const site = machine ? locMap.get(machine.location_id) : undefined;
        const driver = empMap.get(r.employee_id);
        const lines = (itemsMap.get(r.restock_id) ?? []).map((item) => ({
          ...item,
          product_name: prodMap.get(item.product_id)?.product_name ?? `Product #${item.product_id}`,
        }));
        const totalUnits = lines.reduce((sum, l) => sum + l.quantity_added, 0);
        return {
          ...r,
          serial_no: machine?.serial_no ?? `Machine #${r.machine_id}`,
          site_name: site?.site_name ?? 'Unknown Site',
          driver_name: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver',
          lines,
          totalUnits,
        };
      });
  }, [data.restocks, data.restock_items, machineMap, locMap, empMap, prodMap]);

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
        <form
          onSubmit={handleSubmitRestock}
          className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">Dispatch Restock Visit</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforces BR10 (Route Driver role only, positive additions) and BR3 (cannot exceed coil max capacity).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Machine</label>
            <select
              value={machineId}
              onChange={(e) => {
                setMachineId(Number(e.target.value));
                setItems([]);
              }}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs bg-white"
            >
              {data.machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.serial_no} — {locMap.get(m.location_id)?.site_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Route Driver</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {routeDrivers.map((d) => (
                  <option key={d.employee_id} value={d.employee_id}>
                    {d.first_name} {d.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Restock Date</label>
              <input
                type="date"
                required
                value={restockDate}
                onChange={(e) => setRestockDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Loaded Coil Products &amp; Capacity Headroom
            </label>
            <div className="flex gap-2">
              <select
                value={effectiveProdId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {machineProductsWithRoom.map((entry) => (
                  <option key={entry.product_id} value={entry.product_id}>
                    {entry.product?.product_name} ({entry.qty}/{entry.cap} · room +{entry.room})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={50}
                value={qtyAdded}
                onChange={(e) => setQtyAdded(Number(e.target.value))}
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
          </div>

          {items.length > 0 && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.product_id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-900">
                    {prodMap.get(item.product_id)?.product_name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[#0F766E] tabular-nums">
                      +{item.quantity_added} units
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((i) => i.product_id !== item.product_id))}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="w-full h-10 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            {submitting ? 'Logging Visit...' : 'Complete Restock Visit'}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Restocking History ({detailedRestocks.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified route driver replenishment visits across fleet machines
            </p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {detailedRestocks.map((visit) => (
              <div key={visit.restock_id} className="px-6 py-4 hover:bg-slate-50/60">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">#{visit.restock_id}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-[#0F766E] font-medium">{visit.serial_no}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-700">{visit.site_name}</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    +{visit.totalUnits} units
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Driver: <span className="font-medium text-slate-700">{visit.driver_name}</span> ·{' '}
                  <span className="font-mono tabular-nums">{visit.restock_date}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {visit.lines.map((l) => (
                    <span key={l.product_id} className="tabular-nums">
                      {l.product_name} (+{l.quantity_added})
                    </span>
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
