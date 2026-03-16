# Code Review

## Findings

### 1. `avgDaysToSell` is calculated with the wrong denominator

```ts
const sold = properties.rows.filter(p => p.status === 'sold');
const avgDaysToSell = sold
  .map(p => (new Date(p.sold_date).getTime() - new Date(p.created_at).getTime()) / 86400000)
  .reduce((a, b) => a + b, 0) / properties.rows.length;
```

This divides by `properties.rows.length`, not by `sold.length`, so the average will be artificially lowered whenever the agent has unsold properties. It also becomes `0 / 0` when there are no properties.

Fix:
- divide by `sold.length`
- return `0` or `null` when there are no sold properties

### 2. The time-to-sell calculation does not match the requirement

The challenge asks for average time from `active -> sold`, but this code uses `created_at -> sold_date`. A property may sit in draft for days or weeks before becoming active, so this overstates time to sell.

Fix:
- use `activated_at` and `sold_date`
- ignore rows where either value is missing

### 3. `recentSales` compares incompatible date types

```ts
p => p.status === 'sold' && p.sold_date > Date.now() - 30 * 86400000
```

`Date.now()` returns a number. `p.sold_date` is usually a database date/timestamp value, often a string or `Date`, depending on the driver. Comparing those directly is unreliable and can silently produce wrong results.

Fix:
- normalize both sides to `Date` or push this filter into SQL

### 4. This is an N+1 query pattern for view counts

```ts
const totalViews = properties.rows.reduce(async (sum, p) => {
  const views = await db.query(
    `SELECT COUNT(*) FROM property_views WHERE property_id = $1`, [p.id]
  );
  return (await sum) + parseInt(views.rows[0].count);
}, Promise.resolve(0));
```

This issues one query to load properties, then one query per property to count views. At scale, that becomes very slow and puts unnecessary load on the database.

Fix:
- compute total views in one aggregate query using `JOIN` + `COUNT`
- or use a pre-aggregated stats table if this is a hot dashboard path

### 5. The async `reduce` makes the N+1 problem even worse by serializing the queries

Because each iteration awaits the previous accumulator, the view-count queries run one after another instead of in parallel. That increases latency linearly with the number of properties.

Fix:
- avoid async `reduce` here entirely
- replace it with a single SQL aggregate query

### 6. `SELECT *` loads much more data than needed

```ts
const properties = await db.query(
  `SELECT * FROM properties WHERE agent_id = $1`, [agentId]
);
```

The function only uses a handful of columns, but it fetches the full property row for every property. That increases transfer cost and memory usage.

Fix:
- only select the columns needed for this calculation
- better: do the aggregation directly in SQL and avoid materializing every property row in application memory

### 7. Missing null/invalid date handling

If a sold property has a missing or invalid `sold_date`, `created_at`, or `activated_at`, `new Date(...).getTime()` can return `NaN`, which then contaminates the whole average.

Fix:
- filter out incomplete rows before computing averages
- preferably let SQL handle `NULL` checks directly

## Why This Matters

The main issues are correctness and scalability:

- the average days to sell is wrong
- recent sales can be wrong depending on the DB driver
- total views becomes very slow as the number of properties grows

For a dashboard endpoint, this is exactly the kind of code that works in development and then becomes a bottleneck in production.

## Recommended Rewrite

I would move the calculation into SQL and return the aggregates directly:

```ts
const dashboardStats = async (_: unknown, __: unknown, { agentId, db }: Context) => {
  const result = await db.query(
    `
      SELECT
        COUNT(pv.id)::int AS total_views,
        COUNT(*) FILTER (
          WHERE p.status = 'sold'
            AND p.sold_date >= NOW() - INTERVAL '30 days'
        )::int AS recent_sales_count,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (p.sold_date - p.activated_at)) / 86400
          ) FILTER (
            WHERE p.status = 'sold'
              AND p.sold_date IS NOT NULL
              AND p.activated_at IS NOT NULL
          ),
          0
        )::float AS avg_days_to_sell
      FROM properties p
      LEFT JOIN property_views pv ON pv.property_id = p.id
      WHERE p.agent_id = $1
    `,
    [agentId]
  );

  const row = result.rows[0];

  return {
    totalViews: row.total_views,
    avgDaysToSell: row.avg_days_to_sell,
    recentSalesCount: row.recent_sales_count
  };
};
```

## Further Improvement

If this dashboard is expected to serve very large agents or high traffic, I would not compute these stats from raw tables on every request. I would pre-aggregate:

- total views by property
- daily agent-level dashboard stats
- sales aggregates for rolling windows

That keeps the request path predictable and avoids repeated scans over large event tables.
