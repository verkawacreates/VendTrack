import React, { useState } from 'react';
import { Check, Copy, Download, RotateCcw } from 'lucide-react';
import type { DashboardSnapshot } from '../types/vendtrack.ts';
import { downloadAuthorizedFile, formatPhp } from '../lib/api.ts';
import { VENDTRACK_MYSQL_DDL } from '../server/schemaSql.ts';

interface ReportsSchemaTabProps {
  data: DashboardSnapshot;
  token: string;
  onExportCsv: (reportType: string, filename: string) => void;
  onResetDemo: () => Promise<void>;
}

const ENTITIES_SPEC = [
  { name: 'LOCATION', type: 'Strong', pk: 'location_id', fk: '—', rowsKey: 'locations' as const, note: 'Site where one or more machines are placed (BR1)' },
  { name: 'MACHINE', type: 'Strong', pk: 'machine_id', fk: 'location_id', rowsKey: 'machines' as const, note: 'Unique serial_no; status Active / Under Maintenance / Offline' },
  { name: 'CATEGORY', type: 'Strong', pk: 'category_id', fk: '—', rowsKey: 'categories' as const, note: 'Unique category_name grouping products (BR4, BR15)' },
  { name: 'SUPPLIER', type: 'Strong', pk: 'supplier_id', fk: '—', rowsKey: 'suppliers' as const, note: 'Unique supplier_name supplying products (BR4)' },
  { name: 'PRODUCT', type: 'Strong', pk: 'product_id', fk: 'category_id, supplier_id', rowsKey: 'products' as const, note: 'Unique SKU; unit_price >= unit_cost (BR5)' },
  { name: 'EMPLOYEE', type: 'Strong', pk: 'employee_id', fk: '—', rowsKey: 'employees' as const, note: 'Unique email; Route Driver / Technician / Manager / Admin' },
  { name: 'MACHINE_SLOT', type: 'Weak', pk: '(machine_id, slot_no)', fk: 'machine_id, product_id', rowsKey: 'machine_slots' as const, note: '0 <= quantity <= max_capacity; <=20% triggers low stock (BR3, BR11)' },
  { name: 'RESTOCK', type: 'Strong', pk: 'restock_id', fk: 'machine_id, employee_id', rowsKey: 'restocks' as const, note: 'Restock visit performed by Route Driver (BR10)' },
  { name: 'RESTOCK_ITEM', type: 'Weak', pk: '(restock_id, product_id)', fk: 'restock_id, product_id', rowsKey: 'restock_items' as const, note: 'Resolves M:N RESTOCK-PRODUCT; quantity_added > 0' },
  { name: 'SALE', type: 'Strong', pk: 'sale_id', fk: 'machine_id', rowsKey: 'sales' as const, note: 'Active machine only; Cash / Coin / GCash / Card (BR8, BR14)' },
  { name: 'SALE_ITEM', type: 'Weak', pk: '(sale_id, product_id)', fk: 'sale_id, product_id', rowsKey: 'sale_items' as const, note: 'Stores snapshot unit_price_at_sale (BR7)' },
  { name: 'MAINTENANCE', type: 'Strong', pk: 'maintenance_id', fk: 'machine_id, employee_id', rowsKey: 'maintenance' as const, note: 'Handled by Technician; resolved_date >= reported_date (BR12, BR13)' },
];

const BUSINESS_RULES = [
  { id: 'BR1', text: 'A location can host many machines; each machine is placed at exactly one location.' },
  { id: 'BR2', text: 'A machine has several slots numbered from 1; each slot holds exactly one product at a time.' },
  { id: 'BR3', text: 'The quantity in a slot cannot be negative or exceed the slot maximum capacity.' },
  { id: 'BR4', text: 'Each product belongs to exactly one category and is bought from exactly one supplier.' },
  { id: 'BR5', text: 'A product selling price cannot be lower than its unit cost.' },
  { id: 'BR6', text: 'Each sale is made at exactly one machine and may include one or more products.' },
  { id: 'BR7', text: 'The price charged is copied into SALE_ITEM so later product price changes never alter history.' },
  { id: 'BR8', text: 'Only machines with status Active may record sales, and only for products loaded in that machine.' },
  { id: 'BR9', text: 'Every sale reduces the slot quantity by the quantity sold; a slot with quantity 0 cannot sell.' },
  { id: 'BR10', text: 'Each restocking visit is made at one machine by a Route Driver and adds positive quantities.' },
  { id: 'BR11', text: 'A slot is flagged low stock when its quantity is 20% or less of its maximum capacity.' },
  { id: 'BR12', text: 'A maintenance request is handled by a Technician; the machine stays Under Maintenance until Resolved.' },
  { id: 'BR13', text: 'A repair resolved date cannot be earlier than its reported date.' },
  { id: 'BR14', text: 'Payment method is restricted to Cash, Coin, GCash, or Card.' },
  { id: 'BR15', text: 'Machine serial numbers, product SKUs, category names, supplier names, and employee emails must be unique.' },
];

export function ReportsSchemaTab({
  data,
  token,
  onExportCsv,
  onResetDemo,
}: ReportsSchemaTabProps) {
  const [subTab, setSubTab] = useState<'reports' | 'schema' | 'ddl'>('reports');
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleCopySql() {
    await navigator.clipboard.writeText(VENDTRACK_MYSQL_DDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleReset() {
    setResetting(true);
    try {
      await onResetDemo();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales &amp; Audit Reports
          </button>
          <button
            type="button"
            onClick={() => setSubTab('schema')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'schema' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            12-Entity Schema &amp; Rules
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ddl')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'ddl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            MySQL 8 DDL Script
          </button>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Restoring...' : 'Restore Sample Dataset'}</span>
        </button>
      </div>

      {subTab === 'reports' && (
        <div className="space-y-6">
          {/* Quick CSV Export Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Sales per Machine', desc: 'Revenue & volume by serial', type: 'sales-per-machine', file: 'vendtrack_sales_per_machine.csv' },
              { title: 'Sales per Product', desc: 'SKU revenue & gross margin', type: 'sales-per-product', file: 'vendtrack_sales_per_product.csv' },
              { title: 'Low-Stock Coils', desc: 'Slots at ≤20% capacity', type: 'low-stock', file: 'vendtrack_low_stock_slots.csv' },
              { title: 'Repair Cost Ledger', desc: 'Maintenance spend by machine', type: 'repair-costs', file: 'vendtrack_repair_costs.csv' },
            ].map((card) => (
              <div key={card.type} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onExportCsv(card.type, card.file)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            ))}
          </div>

          {/* Sales per Product Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Sales &amp; Margin per Product</h2>
                <p className="text-xs text-slate-500 mt-0.5">Computed across all recorded SALE_ITEM rows</p>
              </div>
              <button
                type="button"
                onClick={() => onExportCsv('sales-per-product', 'vendtrack_sales_per_product.csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Revenue</th>
                    <th className="py-2.5 px-4 text-right">Est. Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.reports.salesPerProduct.map((row) => (
                    <tr key={row.product_id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{row.sku}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{row.product_name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{row.category_name}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{row.units_sold}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatPhp(row.revenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#15803D] tabular-nums">
                        {formatPhp(row.margin_estimate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'schema' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                Relational Schema Summary (12 Entities in 3NF)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live record counts mapped from the VendTrack ER &amp; Project-Level Models
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                    <th className="py-2.5 px-4">Entity / Table</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Primary Key</th>
                    <th className="py-2.5 px-4">Foreign Keys</th>
                    <th className="py-2.5 px-4 text-right">Records</th>
                    <th className="py-2.5 px-4">Integrity Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ENTITIES_SPEC.map((ent) => (
                    <tr key={ent.name} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{ent.name}</td>
                      <td className="py-2.5 px-4 text-slate-700">{ent.type}</td>
                      <td className="py-2.5 px-4 font-mono text-[#0F766E]">{ent.pk}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{ent.fk}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {data[ent.rowsKey].length}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{ent.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Enforced Business Rules (BR1 – BR15)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All 15 rules are enforced server-side on every mutation and validated in the interface
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUSINESS_RULES.map((br) => (
                <div key={br.id} className="rounded-lg border border-slate-200/80 p-3.5 text-xs">
                  <span className="font-mono font-semibold text-[#0F766E] mr-2">{br.id}</span>
                  <span className="text-slate-700">{br.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'ddl' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Physical Database Design (MySQL 8 InnoDB)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete DDL script with FOREIGN KEY, CHECK, ENUM, and INDEX definitions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadAuthorizedFile('/api/schema.sql', 'vendtrack_schema.sql', token)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>
          <pre className="p-6 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed max-h-[600px]">
            {VENDTRACK_MYSQL_DDL}
          </pre>
        </div>
      )}
    </div>
  );
}
