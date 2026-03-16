import type { DashboardStatItem } from './types';

type DashboardStatsGridProps = {
  stats: DashboardStatItem[];
  loading: boolean;
};

export const DashboardStatsGrid = ({ stats, loading }: DashboardStatsGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {stats.map((stat) => (
      <article
        key={stat.label}
        className="rounded-3xl border border-ink/10 bg-white/80 p-5 shadow-sm"
      >
        <p className="text-sm text-ink/60">{stat.label}</p>
        <p className="mt-3 text-3xl font-semibold text-ink">
          {loading ? '...' : stat.value}
          {stat.label === 'Avg. days to sell' && !loading ? 'd' : ''}
        </p>
      </article>
    ))}
  </div>
);
