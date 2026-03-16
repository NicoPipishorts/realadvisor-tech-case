import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
const navLinkClassName = ({ isActive }) => [
    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-pine text-white' : 'text-ink/70 hover:bg-white/60 hover:text-ink'
].join(' ');
export const AppShell = () => {
    const { agent, clearSession } = useAuth();
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx("header", { className: "border-b border-ink/10 bg-white/70 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.28em] text-gold", children: "RealAdvisor" }), _jsx("h1", { className: "text-xl font-semibold text-ink", children: "Agent Dashboard" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("nav", { className: "flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 p-1", children: [_jsx(NavLink, { to: "/dashboard", className: navLinkClassName, children: "Dashboard" }), _jsx(NavLink, { to: "/properties", className: navLinkClassName, children: "Properties" })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-sm font-medium text-ink", children: agent?.name }), _jsx("button", { className: "text-xs uppercase tracking-[0.18em] text-ink/50 transition hover:text-ink", type: "button", onClick: clearSession, children: "Sign out" })] })] })] }) }), _jsx("main", { className: "mx-auto max-w-6xl px-6 py-10", children: _jsx(Outlet, {}) })] }));
};
