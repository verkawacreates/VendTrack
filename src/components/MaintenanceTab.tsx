import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { DashboardSnapshot, Maintenance, MaintenanceStatus } from '../types/vendtrack.ts';
import { apiRequest, formatPhp } from '../lib/api.ts';
import { MaintenanceStatusLabel } from './StatusText.tsx';

interface MaintenanceTabProps {
  data: DashboardSnapshot;
  token: string;
  onRefresh: () => Promise<void>;
  onExportCsv: (reportType: string, filename: string) => void;
}

export function MaintenanceTab({ data, token, onRefresh, onExportCsv }: MaintenanceTabProps) {
  const technicians = useMemo(
    () => data.employees.filter((e) => e.role === 'Technician'),
    [data.employees]
  );

  const [filterStatus, setFilterStatus] = useState<'All' | MaintenanceStatus>('All');
  const [machineId, setMachineId] = useState<number>(data.machines[0]?.machine_id ?? 1);
  const [employeeId, setEmployeeId] = useState<number>(technicians[0]?.employee_id ?? 5);
  const [issueDesc, setIssueDesc] = useState('');
  const [reportedDate, setReportedDate] = useState('2026-11-26');
  const [repairCost, setRepairCost] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Ticket resolution drawer/inline state
  const [editingTicket, setEditingTicket] = useState<Maintenance | null>(null);
  const [editStatus, setEditStatus] = useState<MaintenanceStatus>('In Progress');
  const [editResolvedDate, setEditResolvedDate] = useState('2026-11-26');
  const [editCost, setEditCost] = useState('');

  const machineMap = useMemo(() => new Map(data.machines.map((m) => [m.machine_id, m])), [data.machines]);
  const locMap = useMemo(() => new Map(data.locations.map((l) => [l.location_id, l])), [data.locations]);
  const empMap = useMemo(() => new Map(data.employees.map((e) => [e.employee_id, e])), [data.employees]);

  const filteredTickets = useMemo(() => {
    return [...data.maintenance]
      .filter((t) => filterStatus === 'All' || t.maintenance_status === filterStatus)
      .sort((a, b) => b.maintenance_id - a.maintenance_id);
  }, [data.maintenance, filterStatus]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/maintenance', {
        method: 'POST',
        token,
        body: {
          machine_id: machineId,
          employee_id: employeeId,
          issue_description: issueDesc,
          reported_date: reportedDate,
          repair_cost: repairCost ? Number(repairCost) : null,
        },
      });
      await onRefresh();
      setIssueDesc('');
      setRepairCost('');
      setFeedback({
        type: 'success',
        text: 'Breakdown logged. Machine automatically transitioned to Under Maintenance (BR12).',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to log breakdown.' });
    }
  }

  async function handleUpdateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTicket) return;
    setFeedback(null);
    try {
      await apiRequest(`/api/maintenance/${editingTicket.maintenance_id}`, {
        method: 'PATCH',
        token,
        body: {
          maintenance_status: editStatus,
          resolved_date: editStatus === 'Resolved' ? editResolvedDate : null,
          repair_cost: editCost ? Number(editCost) : null,
        },
      });
      await onRefresh();
      setEditingTicket(null);
      setFeedback({
        type: 'success',
        text: 'Maintenance ticket updated and parent machine status synchronized (BR12, BR13).',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Update failed.' });
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Log Breakdown Form */}
        <form
          onSubmit={handleCreateTicket}
          className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">Log Maintenance Request</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforces BR12 (Technician role only; sets machine Under Maintenance until Resolved).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Machine</label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
            >
              {data.machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.serial_no} — {locMap.get(m.location_id)?.site_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Technician</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
            >
              {technicians.map((t) => (
                <option key={t.employee_id} value={t.employee_id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Issue Description</label>
            <textarea
              required
              rows={3}
              maxLength={150}
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              placeholder="Describe hardware fault, validator jam, or cooling issue..."
              className="w-full p-3 rounded-lg border border-slate-200 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reported Date</label>
              <input
                type="date"
                required
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Est. Cost (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={repairCost}
                onChange={(e) => setRepairCost(e.target.value)}
                placeholder="Optional"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-10 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-semibold cursor-pointer"
          >
            Create Maintenance Ticket
          </button>
        </form>

        {/* Right: Ticket Queue + Edit Drawer */}
        <div className="lg:col-span-8 space-y-6">
          {editingTicket && (
            <form
              onSubmit={handleUpdateTicket}
              className="bg-white rounded-xl border border-[#0F766E]/40 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Update Ticket #{editingTicket.maintenance_id} ·{' '}
                  {machineMap.get(editingTicket.machine_id)?.serial_no}
                </h3>
                <span className="text-xs text-slate-500">
                  Reported {editingTicket.reported_date} (BR13)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as MaintenanceStatus)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Resolved Date</label>
                  <input
                    type="date"
                    disabled={editStatus !== 'Resolved'}
                    value={editResolvedDate}
                    onChange={(e) => setEditResolvedDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Repair Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
                >
                  Save Update
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Service &amp; Repair Queue ({filteredTickets.length})
              </h2>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      filterStatus === status
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTickets.map((t) => {
                const machine = machineMap.get(t.machine_id);
                const site = machine ? locMap.get(machine.location_id) : undefined;
                const tech = empMap.get(t.employee_id);
                return (
                  <div key={t.maintenance_id} className="px-6 py-4 hover:bg-slate-50/60 flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="font-mono font-semibold text-slate-900">#{t.maintenance_id}</span>
                        <span className="font-mono text-[#0F766E] font-medium">{machine?.serial_no}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 truncate">{site?.site_name}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900">{t.issue_description}</div>
                      <div className="text-xs text-slate-500">
                        Technician: {tech ? `${tech.first_name} ${tech.last_name}` : 'Unassigned'} · Reported{' '}
                        <span className="font-mono tabular-nums">{t.reported_date}</span>
                        {t.resolved_date ? ` · Resolved ${t.resolved_date}` : ''}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <MaintenanceStatusLabel status={t.maintenance_status} />
                      <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {t.repair_cost !== null ? formatPhp(t.repair_cost) : 'Cost TBD'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTicket(t);
                          setEditStatus(t.maintenance_status);
                          setEditResolvedDate(t.resolved_date || '2026-11-26');
                          setEditCost(t.repair_cost !== null ? String(t.repair_cost) : '');
                        }}
                        className="text-xs font-medium text-[#0F766E] hover:underline cursor-pointer"
                      >
                        Update Ticket
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Repair Cost Per Machine Report */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Repair Cost per Machine</h3>
              <button
                type="button"
                onClick={() => onExportCsv('repair-costs', 'vendtrack_repair_costs.csv')}
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
                    <th className="py-2.5 px-4">Machine</th>
                    <th className="py-2.5 px-4">Site</th>
                    <th className="py-2.5 px-4 text-right">Open</th>
                    <th className="py-2.5 px-4 text-right">Resolved</th>
                    <th className="py-2.5 px-4 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.reports.repairCostPerMachine.map((r) => (
                    <tr key={r.machine_id}>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{r.serial_no}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.site_name}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{r.open_tickets}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{r.resolved_tickets}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatPhp(r.total_repair_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
