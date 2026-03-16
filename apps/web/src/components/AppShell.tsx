import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../lib/auth';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-pine text-white' : 'text-ink/70 hover:bg-white/60 hover:text-ink'
  ].join(' ');

export const AppShell = () => {
  const { agent, clearSession } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">
              RealAdvisor
            </p>
            <h1 className="text-xl font-semibold text-ink">Agent Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 p-1">
              <NavLink to="/dashboard" className={navLinkClassName}>
                Dashboard
              </NavLink>
              <NavLink to="/properties" className={navLinkClassName}>
                Properties
              </NavLink>
            </nav>
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{agent?.name}</p>
              <button
                className="text-xs uppercase tracking-[0.18em] text-ink/50 transition hover:text-ink"
                type="button"
                onClick={clearSession}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
};
