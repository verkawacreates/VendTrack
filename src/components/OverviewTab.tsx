import React from 'react';
import { ArrowRight, Download } from 'lucide-react';
import type { DashboardSnapshot } from '../types/vendtrack.ts';
import { formatPhp } from '../lib/api.ts';
import { MachineStatusLabel } from './StatusText.tsx';

export type NavTab =
  | 'overview'
  | 'machines'
  | 'catalog'
  | 'sales'
  | 'restocks'
  | 'maintenance'
  | 'team'
  | 'reports';

interface OverviewTabProps {
  data: DashboardSnapshot;
  onNavigate: (tab: NavTab, preselectMachineId?: number) => void;
  onExportCsv: (reportType: string, filename: string) => void;
}

export function OverviewTab({ data, onNavigate, onExportCsv }: OverviewTabProps) {
  const { summary, reports } = data;
  const maxMachineRev = Math.max(...reports.salesPerMachine.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6">
      {/* 4-Column Executive KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-medium text-slate-500">Total Sales Revenue</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatPhp(summary.totalRevenue)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary.totalTransactions} recorded transactions
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-medium text-slate-500">Fleet Availability</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summary.activeMachines} / {summary.totalMachines} Active
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary.underMaintenanceMachines} maintenance · {summary.offlineMachines} offline
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-medium text-slate-500">Low-Stock Coils (≤ 20%)</div>
          <div className="mt-2 text-2xl font-bold text-[#B45309] font-mono tabular-nums">
            {summary.lowStockSlotsCount} Slots
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary.fleetFillRatePct}% average fill across {summary.totalSlotsCount} coils
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-medium text-slate-500">Maintenance &amp; Repairs</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summary.openRepairsCount} Open
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {formatPhp(summary.totalRepairCost)} cumulative repair spend
          </div>
        </div>
      </section>

      {/* Main Analytical Split: Revenue by Machine + Payment Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Revenue by Vending Machine</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated from recorded sale items using point-in-sale snapshot pricing
              </p>
            </div>
            <button
              type="button"
              onClick={() => onExportCsv('sales-per-machine', 'vendtrack_sales_per_machine.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {reports.salesPerMachine.map((row) => {
              const pct = Math.max(4, Math.round((row.revenue / maxMachineRev) * 100));
              return (
                <div key={row.machine_id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigate('machines', row.machine_id)}
                        className="font-mono font-medium text-[#0F766E] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {row.serial_no}
                      </button>
                      <span className="text-slate-600 truncate">{row.site_name}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-slate-500 tabular-nums">{row.units_sold} units</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums w-24 text-right">
                        {formatPhp(row.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0F766E] transition-all duration-300"
                      style={{ width: `${row.revenue > 0 ? pct : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900">Payment Method Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tender mix across Cash, Coin, GCash, and Card
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {reports.paymentBreakdown.map((pm) => {
                const share =
                  summary.totalRevenue > 0
                    ? Math.round((pm.revenue / summary.totalRevenue) * 100)
                    : 0;
                return (
                  <div key={pm.payment_method} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{pm.payment_method}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {pm.transactions} transactions · {share}% of revenue
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatPhp(pm.revenue)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Top Product by Site</h2>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Open Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {reports.topProductBySite.slice(0, 5).map((item) => (
                <div key={item.location_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{item.product_name}</div>
                    <div className="text-slate-500 truncate">{item.site_name}</div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-mono font-semibold text-slate-900">{formatPhp(item.revenue)}</div>
                    <div className="text-slate-500">{item.units_sold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Low-Stock Priority Queue (BR11 <= 20%) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Low-Stock Restock Priority Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Machine coils at or below 20% of maximum capacity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExportCsv('low-stock', 'vendtrack_low_stock_slots.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('restocks')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Dispatch Restock</span>
            </button>
          </div>
        </div>

        {reports.lowStockSlots.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            All machine coils are currently stocked above the 20% threshold.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Machine</th>
                  <th className="py-2.5 pr-4">Site</th>
                  <th className="py-2.5 pr-4">Slot</th>
                  <th className="py-2.5 pr-4">Product</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4 text-right">Stock</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reports.lowStockSlots.map((slot) => (
                  <tr key={`${slot.machine_id}-${slot.slot_no}`} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                      {slot.serial_no}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-600 max-w-[220px] truncate">
                      {slot.site_name}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      Slot {slot.slot_no}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-900">
                      <span className="font-medium">{slot.product_name}</span>
                      <span className="text-slate-400"> · {slot.sku}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <MachineStatusLabel status={slot.machine_status} />
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-[#B45309]">
                        {slot.quantity} / {slot.max_capacity}
                      </span>
                      <span className="text-slate-400"> ({slot.fill_pct}%)</span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate('restocks', slot.machine_id)}
                        className="text-xs font-medium text-[#0F766E] hover:underline whitespace-nowrap cursor-pointer"
                      >
                        Refill Unit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
