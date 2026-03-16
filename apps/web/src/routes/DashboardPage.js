import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { gql, useQuery } from '@apollo/client';
const DASHBOARD_QUERY = gql `
  query DashboardPage {
    dashboardStats {
      totalActiveProperties
      totalViewsThisMonth
      propertiesSoldThisMonth
      averageDaysToSell
    }
    dashboardViewsOverTime(rangeDays: 30) {
      date
      views
    }
    topViewedProperties(limit: 5) {
      id
      title
      status
      viewCount
    }
    flaggedProperties(limit: 5) {
      id
      confidenceScore
      primaryReason
      triggeredRule
      property {
        id
        title
        viewCount
      }
    }
  }
`;
const formatShortDate = (value) => new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
});
export const DashboardPage = () => {
    const { data, loading, error } = useQuery(DASHBOARD_QUERY);
    const stats = [
        { label: 'Active properties', value: data?.dashboardStats.totalActiveProperties ?? 0 },
        { label: 'Views this month', value: data?.dashboardStats.totalViewsThisMonth ?? 0 },
        { label: 'Sold this month', value: data?.dashboardStats.propertiesSoldThisMonth ?? 0 },
        { label: 'Avg. days to sell', value: data?.dashboardStats.averageDaysToSell ?? 0 }
    ];
    const trend = data?.dashboardViewsOverTime ?? [];
    const topViews = Math.max(...trend.map((point) => point.views), 1);
    return (_jsxs("section", { className: "space-y-8", children: [_jsxs("div", { className: "max-w-3xl space-y-3", children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.28em] text-gold", children: "Overview" }), _jsx("h2", { className: "text-4xl font-semibold tracking-tight text-ink", children: "Portfolio performance and listing trust in one place." }), _jsx("p", { className: "text-base leading-7 text-ink/70", children: "This scaffold wires the dashboard routes and presentation shell first. Data-backed cards, charts, and flagged listing actions will be connected in the next build steps." })] }), error ? (_jsx("div", { className: "rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700", children: error.message })) : null, _jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: stats.map((stat) => (_jsxs("article", { className: "rounded-3xl border border-ink/10 bg-white/80 p-5 shadow-sm", children: [_jsx("p", { className: "text-sm text-ink/60", children: stat.label }), _jsxs("p", { className: "mt-3 text-3xl font-semibold text-ink", children: [loading ? '...' : stat.value, stat.label === 'Avg. days to sell' && !loading ? 'd' : ''] })] }, stat.label))) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.5fr_1fr]", children: [_jsxs("section", { className: "rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm", children: [_jsx("h3", { className: "text-lg font-semibold text-ink", children: "Views over time" }), _jsx("div", { className: "mt-6 space-y-3 rounded-[1.5rem] border border-ink/10 bg-sand/40 p-4", children: loading ? (_jsx("div", { className: "flex h-72 items-center justify-center text-sm text-ink/50", children: "Loading trend..." })) : trend.length === 0 ? (_jsx("div", { className: "flex h-72 items-center justify-center text-sm text-ink/50", children: "No view data yet." })) : (trend.map((point) => (_jsxs("div", { className: "grid grid-cols-[4rem_1fr_2rem] items-center gap-3", children: [_jsx("span", { className: "text-xs font-medium text-ink/55", children: formatShortDate(point.date) }), _jsx("div", { className: "h-3 overflow-hidden rounded-full bg-white", children: _jsx("div", { className: "h-full rounded-full bg-pine", style: { width: `${Math.max((point.views / topViews) * 100, point.views ? 8 : 0)}%` } }) }), _jsx("span", { className: "text-right text-xs font-semibold text-ink/60", children: point.views })] }, point.date)))) })] }), _jsxs("section", { className: "rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm", children: [_jsx("h3", { className: "text-lg font-semibold text-ink", children: "Flagged listings" }), _jsx("div", { className: "mt-6 space-y-3", children: loading ? (_jsx("div", { className: "flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50", children: "Loading review queue..." })) : data?.flaggedProperties.length ? (data.flaggedProperties.map((flag) => (_jsxs("article", { className: "rounded-[1.5rem] border border-ink/10 bg-sand/40 p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-ink", children: flag.property.title }), _jsx("p", { className: "mt-1 text-sm text-ink/65", children: flag.primaryReason })] }), _jsx("span", { className: "rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white", children: flag.confidenceScore })] }), _jsxs("div", { className: "mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-ink/45", children: [_jsx("span", { children: flag.triggeredRule.replaceAll('_', ' ') }), _jsxs("span", { children: [flag.property.viewCount, " views"] })] })] }, flag.id)))) : (_jsx("div", { className: "flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50", children: "No open flags." })) })] })] }), _jsxs("section", { className: "rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("h3", { className: "text-lg font-semibold text-ink", children: "Top viewed properties" }), _jsx("p", { className: "text-sm text-ink/50", children: "Last known ranking from all recorded views" })] }), _jsx("div", { className: "mt-6 overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-separate border-spacing-y-3", children: [_jsx("thead", { children: _jsx("tr", { children: ['Property', 'Status', 'Views'].map((column) => (_jsx("th", { className: "px-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-ink/45", children: column }, column))) }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "rounded-2xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50", children: "Loading top properties..." }) })) : data?.topViewedProperties.length ? (data.topViewedProperties.map((property) => (_jsxs("tr", { className: "bg-sand/35", children: [_jsx("td", { className: "rounded-l-2xl px-4 py-4 font-medium text-ink", children: property.title }), _jsx("td", { className: "px-4 py-4 text-sm text-ink/60", children: property.status.toLowerCase() }), _jsx("td", { className: "rounded-r-2xl px-4 py-4 text-sm font-semibold text-ink", children: property.viewCount })] }, property.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "rounded-2xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50", children: "No property views recorded yet." }) })) })] }) })] })] }));
};
