import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Search, SlidersHorizontal } from 'lucide-react';
import type {
  DashboardSnapshot,
  MachineStatus,
  MachineType,
} from '../types/vendtrack.ts';
import { apiRequest, formatPhp } from '../lib/api.ts';
import { MachineStatusLabel } from './StatusText.tsx';

interface MachinesSlotsTabProps {
  data: DashboardSnapshot;
  token: string;
  selectedMachineId: number | null;
  onSelectMachine: (id: number) => void;
  onRefresh: () => Promise<void>;
}

export function MachinesSlotsTab({
  data,
  token,
  selectedMachineId,
  onSelectMachine,
  onRefresh,
}: MachinesSlotsTabProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | MachineStatus>('All');
  const [search, setSearch] = useState('');
  const [showNewMachine, setShowNewMachine] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // New machine form state
  const [newSerial, setNewSerial] = useState('');
  const [newModel, setNewModel] = useState('Crane Merchant Media 6');
  const [newType, setNewType] = useState<MachineType>('Combo');
  const [newLocId, setNewLocId] = useState<number>(data.locations[0]?.location_id ?? 1);
  const [newInstallDate, setNewInstallDate] = useState('2026-11-26');
  const [savingMachine, setSavingMachine] = useState(false);

  // Slot editor form state
  const [slotNo, setSlotNo] = useState<number>(1);
  const [slotProductId, setSlotProductId] = useState<number>(data.products[0]?.product_id ?? 1);
  const [slotQty, setSlotQty] = useState<number>(8);
  const [slotCap, setSlotCap] = useState<number>(12);
  const [savingSlot, setSavingSlot] = useState(false);

  const locMap = useMemo(
    () => new Map(data.locations.map((l) => [l.location_id, l])),
    [data.locations]
  );
  const prodMap = useMemo(
    () => new Map(data.products.map((p) => [p.product_id, p])),
    [data.products]
  );
  const catMap = useMemo(
    () => new Map(data.categories.map((c) => [c.category_id, c])),
    [data.categories]
  );

  const filteredMachines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.machines.filter((m) => {
      if (statusFilter !== 'All' && m.machine_status !== statusFilter) return false;
      if (!q) return true;
      const site = locMap.get(m.location_id)?.site_name.toLowerCase() ?? '';
      return (
        m.serial_no.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        site.includes(q)
      );
    });
  }, [data.machines, statusFilter, search, locMap]);

  const activeMachine =
    data.machines.find((m) => m.machine_id === selectedMachineId) ??
    filteredMachines[0] ??
    data.machines[0];

  const activeSlots = useMemo(() => {
    if (!activeMachine) return [];
    return data.machine_slots
      .filter((s) => s.machine_id === activeMachine.machine_id)
      .sort((a, b) => a.slot_no - b.slot_no)
      .map((slot) => {
        const prod = prodMap.get(slot.product_id);
        const cat = prod ? catMap.get(prod.category_id) : undefined;
        const fillPct = slot.max_capacity > 0 ? Math.round((slot.quantity / slot.max_capacity) * 100) : 0;
        const lowStock = slot.max_capacity <= 0 || slot.quantity <= slot.max_capacity * 0.2;
        return {
          ...slot,
          product_name: prod?.product_name ?? 'Unknown Product',
          sku: prod?.sku ?? '',
          unit_price: prod?.unit_price ?? 0,
          category_name: cat?.category_name ?? 'General',
          fill_pct: fillPct,
          is_low_stock: lowStock,
        };
      });
  }, [activeMachine, data.machine_slots, prodMap, catMap]);

  async function handleCreateMachine(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSavingMachine(true);
    try {
      const created = await apiRequest<{ machine_id: number; serial_no: string }>('/api/machines', {
        method: 'POST',
        token,
        body: {
          location_id: newLocId,
          serial_no: newSerial,
          model: newModel,
          machine_type: newType,
          install_date: newInstallDate,
          machine_status: 'Active',
        },
      });
      await onRefresh();
      onSelectMachine(created.machine_id);
      setNewSerial('');
      setShowNewMachine(false);
      setFeedback({ type: 'success', text: `Registered machine ${created.serial_no}.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create machine.' });
    } finally {
      setSavingMachine(false);
    }
  }

  async function handleStatusChange(machineId: number, status: MachineStatus) {
    setFeedback(null);
    try {
      await apiRequest(`/api/machines/${machineId}/status`, {
        method: 'PATCH',
        token,
        body: { machine_status: status },
      });
      await onRefresh();
      setFeedback({ type: 'success', text: `Machine status updated to ${status}.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Status update blocked.' });
    }
  }

  async function handleUpsertSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!activeMachine) return;
    setFeedback(null);
    setSavingSlot(true);
    try {
      await apiRequest(`/api/machines/${activeMachine.machine_id}/slots`, {
        method: 'PUT',
        token,
        body: {
          slot_no: slotNo,
          product_id: slotProductId,
          quantity: slotQty,
          max_capacity: slotCap,
        },
      });
      await onRefresh();
      setFeedback({
        type: 'success',
        text: `Updated Slot ${slotNo} on ${activeMachine.serial_no}.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update slot.' });
    } finally {
      setSavingSlot(false);
    }
  }

  function loadSlotIntoForm(slot: (typeof activeSlots)[number]) {
    setSlotNo(slot.slot_no);
    setSlotProductId(slot.product_id);
    setSlotQty(slot.quantity);
    setSlotCap(slot.max_capacity);
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

      {/* Filter & Register Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search serial, model, or site..."
              className="h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] w-60"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Active', 'Under Maintenance', 'Offline'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNewMachine((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showNewMachine ? 'Close Form' : 'Register Machine'}</span>
        </button>
      </div>

      {/* Register Machine Inline Form */}
      {showNewMachine && (
        <form
          onSubmit={handleCreateMachine}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Register New Vending Machine</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforces BR1 (placed at one location) and BR15 (unique manufacturer serial number)
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                required
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                placeholder="VT-SN-2026-011"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
              <input
                type="text"
                required
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Machine Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MachineType)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
              >
                <option value="Combo">Combo</option>
                <option value="Beverage">Beverage</option>
                <option value="Snack">Snack</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Site Location</label>
              <select
                value={newLocId}
                onChange={(e) => setNewLocId(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {data.locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.site_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Install Date</label>
              <input
                type="date"
                required
                value={newInstallDate}
                onChange={(e) => setNewInstallDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewMachine(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingMachine}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
            >
              {savingMachine ? 'Saving...' : 'Save Machine'}
            </button>
          </div>
        </form>
      )}

      {/* Split Fleet Directory & Coil Planogram Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Fleet List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Fleet Units ({filteredMachines.length})
            </h2>
            <span className="text-xs text-slate-500">Click unit to inspect coils</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredMachines.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No vending machines match the current filter.
              </div>
            ) : (
              filteredMachines.map((m) => {
                const site = locMap.get(m.location_id);
                const slots = data.machine_slots.filter((s) => s.machine_id === m.machine_id);
                const lowCount = slots.filter((s) => s.quantity <= s.max_capacity * 0.2).length;
                const isSelected = activeMachine?.machine_id === m.machine_id;
                return (
                  <button
                    key={m.machine_id}
                    type="button"
                    onClick={() => onSelectMachine(m.machine_id)}
                    className={`w-full text-left px-5 py-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#ECFDF9]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {m.serial_no}
                      </span>
                      <MachineStatusLabel status={m.machine_status} />
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800 truncate">
                      {site?.site_name ?? 'Unassigned Site'}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{m.model}</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.machine_type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{slots.length} slots</span>
                      {lowCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#B45309] font-medium tabular-nums">
                            {lowCount} low stock
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Coil Planogram Inspector */}
        <div className="lg:col-span-7 space-y-6">
          {activeMachine ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-900 font-mono">
                        {activeMachine.serial_no}
                      </h2>
                      <MachineStatusLabel status={activeMachine.machine_status} />
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {locMap.get(activeMachine.location_id)?.site_name} · {activeMachine.model} ·{' '}
                      {activeMachine.machine_type} · Installed {activeMachine.install_date}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="machine-status-select" className="text-xs text-slate-500">
                      Operating Status:
                    </label>
                    <select
                      id="machine-status-select"
                      value={activeMachine.machine_status}
                      onChange={(e) =>
                        handleStatusChange(activeMachine.machine_id, e.target.value as MachineStatus)
                      }
                      className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium bg-white text-slate-800"
                    >
                      <option value="Active">Active</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>

                {/* Coil Grid */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-700">
                      Coil Planogram ({activeSlots.length} Configured Slots)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Click any coil card to edit product or capacity
                    </span>
                  </div>

                  {activeSlots.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                      No coils configured for this machine yet. Use the form below to assign Slot 1.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {activeSlots.map((slot) => (
                        <button
                          key={slot.slot_no}
                          type="button"
                          onClick={() => loadSlotIntoForm(slot)}
                          className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                            slot.is_low_stock
                              ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              Slot #{slot.slot_no} · {slot.sku}
                            </span>
                            {slot.is_low_stock ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309]">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Low Stock</span>
                              </span>
                            ) : (
                              <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                                {formatPhp(slot.unit_price)}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 text-sm font-medium text-slate-900 truncate">
                            {slot.product_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {slot.category_name} · {formatPhp(slot.unit_price)}
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
                              <span className="text-slate-600">
                                {slot.quantity} / {slot.max_capacity} units
                              </span>
                              <span
                                className={`font-mono font-semibold ${
                                  slot.is_low_stock ? 'text-[#B45309]' : 'text-[#0F766E]'
                                }`}
                              >
                                {slot.fill_pct}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  slot.is_low_stock ? 'bg-[#D97706]' : 'bg-[#0F766E]'
                                }`}
                                style={{ width: `${slot.fill_pct}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assign / Update Slot Form */}
              <form
                onSubmit={handleUpsertSlot}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#0F766E]" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Assign or Update Machine Slot
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Enforces BR2 (slots numbered from 1, one product per slot) and BR3 (0 ≤ quantity ≤ max capacity).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Slot #</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      required
                      value={slotNo}
                      onChange={(e) => setSlotNo(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Product</label>
                    <select
                      value={slotProductId}
                      onChange={(e) => setSlotProductId(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {data.products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.sku} — {p.product_name} ({formatPhp(p.unit_price)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Qty / Max Cap
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        min={0}
                        required
                        value={slotQty}
                        onChange={(e) => setSlotQty(Number(e.target.value))}
                        aria-label="Slot quantity"
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono tabular-nums"
                      />
                      <input
                        type="number"
                        min={1}
                        required
                        value={slotCap}
                        onChange={(e) => setSlotCap(Number(e.target.value))}
                        aria-label="Slot max capacity"
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSlot}
                    className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
                  >
                    {savingSlot ? 'Updating...' : 'Save Slot Configuration'}
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
