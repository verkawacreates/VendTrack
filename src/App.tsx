import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Box,
  Cpu,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Receipt,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { AuthOperator, AuthStatusResponse, DashboardSnapshot } from './types/vendtrack.ts';
import { apiRequest, downloadAuthorizedFile } from './lib/api.ts';
import { LoginView } from './components/LoginView.tsx';
import { OverviewTab, type NavTab } from './components/OverviewTab.tsx';
import { MachinesSlotsTab } from './components/MachinesSlotsTab.tsx';
import { CatalogSupplyTab } from './components/CatalogSupplyTab.tsx';
import { SalesLedgerTab } from './components/SalesLedgerTab.tsx';
import { RestockRoutesTab } from './components/RestockRoutesTab.tsx';
import { MaintenanceTab } from './components/MaintenanceTab.tsx';
import { TeamSitesTab } from './components/TeamSitesTab.tsx';
import { ReportsSchemaTab } from './components/ReportsSchemaTab.tsx';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'machines', label: 'Machines & Slots', icon: Cpu },
  { id: 'catalog', label: 'Catalog & Supply', icon: Box },
  { id: 'sales', label: 'Sales Ledger', icon: Receipt },
  { id: 'restocks', label: 'Restock Routes', icon: PackageCheck },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'team', label: 'Team & Sites', icon: Users },
  { id: 'reports', label: 'Reports & Schema', icon: BarChart3 },
];

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [operator, setOperator] = useState<AuthOperator | null>(null);

  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadAuthStatus = useCallback(async () => {
    try {
      const status = await apiRequest<AuthStatusResponse>('/api/auth/status');
      setAuthStatus(status);
    } catch {
      setAuthStatus({ mode: 'unclaimed', configured: false, authenticated: false, operator: null });
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  const fetchDashboard = useCallback(async (activeToken: string) => {
    setLoadingDash(true);
    setDashError(null);
    try {
      const snap = await apiRequest<DashboardSnapshot>('/api/dashboard', { token: activeToken });
      setDashboard(snap);
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Unable to load fleet telemetry.');
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
    }
  }, [token, fetchDashboard]);

  function handleAuthenticated(newToken: string, op: AuthOperator) {
    setToken(newToken);
    setOperator(op);
    setAuthStatus({
      mode: 'claimed',
      configured: true,
      authenticated: true,
      operator: op,
    });
  }

  function handleSignOut() {
    setToken(null);
    setOperator(null);
    setDashboard(null);
    loadAuthStatus();
  }

  function handleNavigate(tab: NavTab, preselectId?: number) {
    if (preselectId !== undefined) {
      setSelectedMachineId(preselectId);
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }

  async function handleExportCsv(reportType: string, filename: string) {
    if (!token) return;
    try {
      await downloadAuthorizedFile(`/api/export/${reportType}`, filename, token);
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  async function handleResetDemo() {
    if (!token) return;
    const snap = await apiRequest<DashboardSnapshot>('/api/reset', {
      method: 'POST',
      token,
    });
    setDashboard(snap);
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center">
        <div className="text-sm text-slate-600">Loading VendTrack Operations...</div>
      </div>
    );
  }

  if (!token || !operator) {
    return <LoginView authStatus={authStatus} onAuthenticated={handleAuthenticated} />;
  }

  const currentNavLabel = NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-[#F4F7F6] flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Deep Forest-Teal Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 dot-matrix-bg text-white flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0F4D42] border border-[#2DD4BF]/25 flex items-center justify-center text-[#2DD4BF] shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-white leading-tight">
                  VendTrack
                </div>
                <div className="text-[11px] text-[#99F6E4]/80">Fleet Operations</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-300 hover:text-white p-1"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0F766E] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5EEAD4]' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="px-2">
            <div className="text-xs font-semibold text-white truncate">{operator.name}</div>
            <div className="text-[11px] text-slate-400 truncate">
              {operator.email} · {operator.role}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-white/15 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm whitespace-nowrap truncate">
              <span className="text-slate-400 font-medium">VendTrack</span>
              <span className="text-slate-300">/</span>
              <h1 className="font-semibold text-slate-900 truncate">{currentNavLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('sales')}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Record Sale
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {dashError && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-700"
            >
              {dashError}
            </div>
          )}

          {loadingDash && !dashboard ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 p-5 h-28 animate-pulse"
                >
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                  <div className="mt-4 h-6 w-32 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : dashboard ? (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  data={dashboard}
                  onNavigate={handleNavigate}
                  onExportCsv={handleExportCsv}
                />
              )}
              {activeTab === 'machines' && (
                <MachinesSlotsTab
                  data={dashboard}
                  token={token}
                  selectedMachineId={selectedMachineId}
                  onSelectMachine={setSelectedMachineId}
                  onRefresh={() => fetchDashboard(token)}
                />
              )}
              {activeTab === 'catalog' && (
                <CatalogSupplyTab
                  data={dashboard}
                  token={token}
                  onRefresh={() => fetchDashboard(token)}
                />
              )}
              {activeTab === 'sales' && (
                <SalesLedgerTab
                  data={dashboard}
                  token={token}
                  onRefresh={() => fetchDashboard(token)}
                  onExportCsv={handleExportCsv}
                />
              )}
              {activeTab === 'restocks' && (
                <RestockRoutesTab
                  data={dashboard}
                  token={token}
                  preselectMachineId={selectedMachineId}
                  onRefresh={() => fetchDashboard(token)}
                />
              )}
              {activeTab === 'maintenance' && (
                <MaintenanceTab
                  data={dashboard}
                  token={token}
                  onRefresh={() => fetchDashboard(token)}
                  onExportCsv={handleExportCsv}
                />
              )}
              {activeTab === 'team' && (
                <TeamSitesTab
                  data={dashboard}
                  token={token}
                  onRefresh={() => fetchDashboard(token)}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsSchemaTab
                  data={dashboard}
                  token={token}
                  onExportCsv={handleExportCsv}
                  onResetDemo={handleResetDemo}
                />
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
