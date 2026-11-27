import React, { useState } from 'react';
import { Eye, EyeOff, FileSpreadsheet, Lock, ShieldCheck } from 'lucide-react';
import type { AuthOperator, AuthStatusResponse } from '../types/vendtrack.ts';
import { apiRequest } from '../lib/api.ts';

interface LoginViewProps {
  authStatus: AuthStatusResponse;
  onAuthenticated: (token: string, operator: AuthOperator) => void;
}

export function LoginView({ authStatus, onAuthenticated }: LoginViewProps) {
  const isUnclaimed = authStatus.mode === 'unclaimed';

  const [identifier, setIdentifier] = useState('admin@vendtrack.io');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isUnclaimed) {
      if (password.length < 8) {
        setError('Please choose an operator password of at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await apiRequest<{ token: string; operator: AuthOperator }>('/api/auth/setup', {
          method: 'POST',
          body: { email: identifier, password },
        });
        onAuthenticated(res.token, res.operator);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to configure operator access.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; operator: AuthOperator }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password, remember },
      });
      onAuthenticated(res.token, res.operator);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Brand & Fleet Telemetry Hero Panel */}
      <aside className="dot-matrix-bg text-white px-8 py-10 sm:px-14 sm:py-12 flex flex-col justify-between min-h-[380px] lg:min-h-screen">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0F4D42] border border-[#2DD4BF]/25 flex items-center justify-center text-[#2DD4BF] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white leading-tight">VendTrack</div>
              <div className="text-xs text-[#99F6E4]/80 font-medium">Enterprise Fleet Telemetry</div>
            </div>
          </div>
        </div>

        <div className="my-12 lg:my-0 max-w-xl">
          <div className="inline-block px-3.5 py-1.5 rounded-full bg-[#0F4D42]/90 border border-[#2DD4BF]/25 text-[#5EEAD4] text-xs font-medium mb-6">
            Node.js + Relational Operations Hub
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-bold tracking-tight leading-[1.12] text-white [text-wrap:balance]">
            Real-time visibility across every vending machine.
          </h1>
          <p className="mt-5 text-base text-slate-300 leading-relaxed max-w-lg">
            Monitor live coil planograms, reconcile GCash &amp; cash ledgers, dispatch restock routes,
            and resolve hardware tickets from a single dashboard.
          </p>
        </div>

        <div className="border-t border-white/10 pt-7 grid grid-cols-3 gap-6 max-w-lg">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#2DD4BF] tabular-nums">99.4%</div>
            <div className="mt-1 text-xs text-slate-300">Fleet Uptime</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#2DD4BF]">Live</div>
            <div className="mt-1 text-xs text-slate-300">Coil Telemetry</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#2DD4BF]">CSV / Audit</div>
            <div className="mt-1 text-xs text-slate-300">Instant Export</div>
          </div>
        </div>
      </aside>

      {/* Right Authentication Card */}
      <main className="bg-[#F4F7F6] flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 sm:p-9">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isUnclaimed ? 'Set up VendTrack Access' : 'Sign in to VendTrack'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {isUnclaimed
              ? 'First-run setup: create an operator password to protect fleet records.'
              : 'Use your work email or operator username.'}
          </p>

          <div className="mt-5 rounded-xl bg-[#ECFDF9] border border-[#99F6E4] px-4 py-3.5 text-xs text-[#0F4D42]">
            <div className="flex items-center gap-2 font-semibold text-[#072E28]">
              {isUnclaimed ? <Lock className="w-3.5 h-3.5 text-[#0F766E]" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />}
              <span>
                {isUnclaimed
                  ? 'Initial Operator Registration'
                  : authStatus.mode === 'env'
                    ? 'Environment-Managed Operator Access'
                    : 'Operator Credentials Active'}
              </span>
            </div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              {isUnclaimed
                ? 'Choose a password (8+ characters) for admin@vendtrack.io. For Vercel production, set ADMIN_PASSCODE in Environment Variables.'
                : 'Sign in with admin@vendtrack.io (or admin) and your configured operator password.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-700 leading-relaxed"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="vt-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email or Username
              </label>
              <input
                id="vt-email"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@vendtrack.io"
                className="w-full h-11 px-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="vt-password" className="block text-xs font-semibold text-slate-700">
                  {isUnclaimed ? 'Create Password' : 'Password'}
                </label>
              </div>
              <div className="relative">
                <input
                  id="vt-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isUnclaimed ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter operator password"
                  className="w-full h-11 pl-3.5 pr-20 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded focus-visible:outline-2 focus-visible:outline-[#0F766E]"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>

            {isUnclaimed && (
              <div>
                <label htmlFor="vt-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="vt-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition-colors"
                />
              </div>
            )}

            {!isUnclaimed && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span>Keep session active for 8 hours</span>
                </label>
                <span className="text-xs text-slate-400">{showPassword ? 'Password visible' : 'Password hidden'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 mt-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            >
              {submitting
                ? 'Verifying...'
                : isUnclaimed
                  ? 'Save Password & Enter Operations'
                  : 'Sign In to Operations'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
