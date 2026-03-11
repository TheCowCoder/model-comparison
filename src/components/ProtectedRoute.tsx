import React, { useState } from 'react';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isChecking, login, loginError } = useAuth();
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await login(password);
    setPassword('');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 shadow-2xl backdrop-blur">
          <Loader2 className="animate-spin text-cyan-300" size={18} />
          Checking admin session...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_30%)]" />
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-neutral-900/85 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Protected Route</p>
            <h1 className="text-2xl font-bold">Admin Access</h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-white/70">
          Enter the shared admin password to access publishing, scraping, and benchmark management.
        </p>

        <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="admin-password">
          Password
        </label>
        <div className="mb-4 flex items-center rounded-2xl border border-white/12 bg-white/5 px-4">
          <Lock className="mr-3 text-white/45" size={18} />
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-white/35"
            placeholder="Enter admin password"
          />
        </div>

        {loginError && <p className="mb-4 text-sm text-red-300">{loginError}</p>}

        <button
          type="submit"
          className="w-full rounded-2xl bg-cyan-300 px-5 py-4 font-semibold text-neutral-950 transition hover:bg-cyan-200"
        >
          Unlock Admin
        </button>
      </form>
    </div>
  );
};