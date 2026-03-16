import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { gql, useQuery } from '@apollo/client';
import { useState } from 'react';
const columns = ['Title', 'Price', 'Status', 'Views', 'Created'];
const statuses = [
    { label: 'All', value: null },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Sold', value: 'SOLD' },
    { label: 'Archived', value: 'ARCHIVED' },
    { label: 'Draft', value: 'DRAFT' }
];
const PROPERTIES_QUERY = gql `
  query PropertiesPage($status: PropertyStatus, $page: Int!, $pageSize: Int!) {
    properties(status: $status, page: $page, pageSize: $pageSize) {
      totalCount
      nodes {
        id
        title
        price
        status
        createdAt
        viewCount
        isFlagged
        flag {
          confidenceScore
          primaryReason
        }
      }
    }
  }
`;
const formatCurrency = (value) => new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0
}).format(value);
const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
});
export const PropertiesPage = () => {
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const { data, loading, error } = useQuery(PROPERTIES_QUERY, {
        variables: {
            status: selectedStatus,
            page,
            pageSize
        }
    });
    const totalCount = data?.properties.totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.28em] text-gold", children: "Properties" }), _jsx("h2", { className: "mt-2 text-3xl font-semibold tracking-tight text-ink", children: "Manage portfolio inventory." })] }), _jsx("button", { className: "rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine", children: "Add property" })] }), _jsxs("div", { className: "rounded-[2rem] border border-ink/10 bg-white/80 p-4 shadow-sm", children: [_jsx("div", { className: "flex flex-col gap-3 border-b border-ink/10 px-2 pb-4 sm:flex-row", children: statuses.map((status) => {
                            const isActive = selectedStatus === status.value;
                            return (_jsx("button", { className: [
                                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                                    isActive ? 'bg-pine text-white' : 'text-ink/70 hover:bg-sand'
                                ].join(' '), type: "button", onClick: () => {
                                    setSelectedStatus(status.value);
                                    setPage(1);
                                }, children: status.label }, status.label));
                        }) }), error ? (_jsx("div", { className: "px-4 pt-4 text-sm text-red-700", children: error.message })) : null, _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-separate border-spacing-y-3 px-2", children: [_jsx("thead", { children: _jsx("tr", { children: columns.map((column) => (_jsx("th", { className: "px-4 pt-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-ink/45", children: column }, column))) }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "rounded-2xl border border-dashed border-ink/15 px-4 py-16 text-center text-sm text-ink/50", children: "Loading properties..." }) })) : data?.properties.nodes.length ? (data.properties.nodes.map((property) => (_jsxs("tr", { className: "bg-sand/35", children: [_jsxs("td", { className: "rounded-l-2xl px-4 py-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-medium text-ink", children: property.title }), property.isFlagged ? (_jsx("span", { className: "rounded-full bg-gold/15 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold", children: "Flagged" })) : null] }), property.flag ? (_jsx("p", { className: "mt-1 text-xs text-ink/50", children: property.flag.primaryReason })) : null] }), _jsx("td", { className: "px-4 py-4 text-sm text-ink/70", children: formatCurrency(property.price) }), _jsx("td", { className: "px-4 py-4 text-sm text-ink/70", children: property.status.toLowerCase() }), _jsx("td", { className: "px-4 py-4 text-sm font-semibold text-ink", children: property.viewCount }), _jsx("td", { className: "rounded-r-2xl px-4 py-4 text-sm text-ink/60", children: formatDate(property.createdAt) })] }, property.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "rounded-2xl border border-dashed border-ink/15 px-4 py-16 text-center text-sm text-ink/50", children: "No properties match the current filter." }) })) })] }) }), _jsxs("div", { className: "flex items-center justify-between px-2 pb-2 pt-4 text-sm text-ink/55", children: [_jsxs("span", { children: ["Showing ", Math.min((page - 1) * pageSize + 1, totalCount), "-", Math.min(page * pageSize, totalCount), " of ", totalCount] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { className: "rounded-full border border-ink/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50", type: "button", onClick: () => setPage((current) => Math.max(1, current - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { children: [page, " / ", totalPages] }), _jsx("button", { className: "rounded-full border border-ink/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50", type: "button", onClick: () => setPage((current) => Math.min(totalPages, current + 1)), disabled: page >= totalPages, children: "Next" })] })] })] })] }));
};
