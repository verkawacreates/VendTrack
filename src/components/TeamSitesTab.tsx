import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DashboardSnapshot, EmployeeRole } from '../types/vendtrack.ts';
import { apiRequest } from '../lib/api.ts';

interface TeamSitesTabProps {
  data: DashboardSnapshot;
  token: string;
  onRefresh: () => Promise<void>;
}

export function TeamSitesTab({ data, token, onRefresh }: TeamSitesTabProps) {
  const [roleFilter, setRoleFilter] = useState<'All' | EmployeeRole>('All');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // New location form
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Cagayan de Oro');
  const [siteContact, setSiteContact] = useState('');
  const [sitePhone, setSitePhone] = useState('');

  // New employee form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('Route Driver');
  const [email, setEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [dateHired, setDateHired] = useState('2026-11-26');

  const filteredEmployees = useMemo(() => {
    return data.employees.filter((e) => roleFilter === 'All' || e.role === roleFilter);
  }, [data.employees, roleFilter]);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/locations', {
        method: 'POST',
        token,
        body: {
          site_name: siteName,
          address,
          city,
          contact_person: siteContact,
          contact_no: sitePhone,
        },
      });
      await onRefresh();
      setSiteName('');
      setAddress('');
      setSiteContact('');
      setSitePhone('');
      setFeedback({ type: 'success', text: 'Site location registered.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to add location.' });
    }
  }

  async function handleDeleteLocation(locationId: number) {
    setFeedback(null);
    try {
      await apiRequest(`/api/locations/${locationId}`, {
        method: 'DELETE',
        token,
      });
      await onRefresh();
      setFeedback({ type: 'success', text: 'Unused location removed.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Delete blocked.' });
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/employees', {
        method: 'POST',
        token,
        body: {
          first_name: firstName,
          last_name: lastName,
          role,
          email,
          contact_no: empPhone,
          date_hired: dateHired,
        },
      });
      await onRefresh();
      setFirstName('');
      setLastName('');
      setEmail('');
      setEmpPhone('');
      setFeedback({ type: 'success', text: 'Employee added to roster.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Unable to add employee.' });
    }
  }

  return (
    <div className="space-y-8">
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

      {/* Sites Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Deployment Locations ({data.locations.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each site hosts one or more vending machines (BR1 · ON DELETE RESTRICT)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                  <th className="py-2.5 px-4">Site Name</th>
                  <th className="py-2.5 px-4">Address &amp; City</th>
                  <th className="py-2.5 px-4">Site Contact</th>
                  <th className="py-2.5 px-4 text-right">Machines</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.locations.map((loc) => {
                  const count = data.machines.filter((m) => m.location_id === loc.location_id).length;
                  return (
                    <tr key={loc.location_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900">{loc.site_name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {loc.address}, {loc.city}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{loc.contact_person || '—'}</div>
                        <div className="text-slate-400 font-mono">{loc.contact_no || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {count}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc.location_id)}
                          title="Delete unused location"
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={handleAddLocation}
          className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-3.5 h-fit"
        >
          <h3 className="text-sm font-semibold text-slate-900">Register Deployment Site</h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Site Name</label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Limketkai Luxe Hotel Lobby"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Limketkai Center, Lapasan"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">City / Municipality</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={siteContact}
                onChange={(e) => setSiteContact(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact No.</label>
              <input
                type="text"
                value={sitePhone}
                onChange={(e) => setSitePhone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full h-9 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
          >
            Add Location
          </button>
        </form>
      </section>

      {/* Employees Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Operations Team ({filteredEmployees.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Roles govern restocking (Route Driver) and repairs (Technician) per BR10 &amp; BR12
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['All', 'Route Driver', 'Technician', 'Manager', 'Administrator'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    roleFilter === r ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Work Email</th>
                  <th className="py-2.5 px-4">Mobile</th>
                  <th className="py-2.5 px-4 text-right">Date Hired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{emp.role}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{emp.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{emp.contact_no || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                      {emp.date_hired}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={handleAddEmployee}
          className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-3.5 h-fit"
        >
          <h3 className="text-sm font-semibold text-slate-900">Add Team Member</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Job Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="Route Driver">Route Driver</option>
              <option value="Technician">Technician</option>
              <option value="Manager">Manager</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Work Email (Unique)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@vendtrack.io"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mobile</label>
              <input
                type="text"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date Hired</label>
              <input
                type="date"
                required
                value={dateHired}
                onChange={(e) => setDateHired(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full h-9 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium cursor-pointer"
          >
            Add Employee
          </button>
        </form>
      </section>
    </div>
  );
}
