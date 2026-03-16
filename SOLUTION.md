# Solution

## Stack and Project Structure

I built the challenge as a small Yarn workspace monorepo:

- `apps/api`: Node.js, TypeScript, Apollo Server, Prisma, PostgreSQL, JWT auth, Zod validation
- `apps/web`: React, TypeScript, Apollo Client, React Router, Vite, Tailwind CSS

I chose this split to keep backend and frontend isolated while still sharing one repo, one install, and one local dev workflow. `Vite` is only used for the web app. The API stays on a plain Node runtime with `tsx` in development and compiled TypeScript for builds.

Apollo Server and Apollo Client were a pragmatic fit because the challenge explicitly asks for GraphQL and the app is query-heavy. Prisma was the fastest way to get a typed schema, migrations, and query layer on PostgreSQL without building a custom SQL access layer from scratch.

## Architecture Decisions

The backend is intentionally thin:

- GraphQL schema + resolvers define the API boundary
- Prisma owns persistence and relational loading
- small library modules handle auth, env validation, fake-listing detection, and analytics aggregation

The frontend follows a route-container plus shared-component pattern:

- routes own queries, mutations, state, and navigation
- reusable components render tables, review cards, modals, property sections, and dashboard panels

That refactor mattered because the first pass of pages like `DashboardPage` and `PropertyFormPage` grew too large. Breaking those into presentational components made the code easier to reason about and gives a path to reuse later.

## Database Schema and Reasoning

The schema is normalized around the core workflow: agents manage listings, listings receive views, and suspicious listings go through review.

### Main Models

- `Agency`
  - parent entity for agents
- `Agent`
  - belongs to an agency
  - owns primary listings
  - can co-list properties
  - can review suspicious flags
- `Property`
  - primary listing entity
  - stores lifecycle fields: `status`, `activatedAt`, `soldAt`, `archivedAt`
  - belongs to one primary agent
- `PropertyCoListing`
  - join table for optional co-listing
  - lets one property be shared with other agents without denormalizing agent ids into the property row
- `PropertyView`
  - append-only event table for tracking listing traffic
  - supports anonymous and authenticated viewers
  - stores `ownerAgentId` so analytics queries can scope by agent without joining back through `Property`
- `AgentDashboardStats`
  - pre-aggregated lifetime metrics for one agent
- `AgentDailyStat`
  - per-agent daily aggregates for views, sales count, and revenue
- `PropertyAnalytics`
  - per-property lifetime view totals and last-viewed timestamp
- `PropertyViewDaily`
  - per-property per-day view counters used for chart drilldown
- `SuspiciousFlag`
  - stores one detection/review event with source, confidence, reason, rule, details, and review status
- `FlagReviewAction`
  - audit trail for dismiss and confirm decisions

### Why the Relationships Are Structured This Way

- A property has one primary owner because the dashboard is agent-centric and most queries are scoped to the logged-in agent.
- Co-listing is modeled separately because it is optional and many-to-many.
- Views are stored as events instead of counters because the dashboard needs time-series analytics and per-day drilldown.
- I added aggregate tables next to the raw event table because the challenge explicitly calls out large-scale dashboard performance. That keeps raw events available for audit/backfill, while day-to-day reads stay cheap.
- Suspicious flags are separate records instead of a boolean on `Property` because a listing can be flagged multiple times over time, by different rules, with different review outcomes.
- Review actions are also separate records so the decision history is not lost when a flag status changes.

### Index Strategy

The important indexes are:

- `Property(primaryAgentId, status, createdAt desc)`
  - supports the main property listing page with status filters and recent-first ordering
- `Property(primaryAgentId, soldAt desc)`
  - supports recent sales queries
- `Property(status, city, propertyType)`
  - supports comparables used by the low-price detection rule
- `PropertyView(propertyId, viewedAt desc)`
  - supports property detail view history
- `PropertyView(ownerAgentId, viewedAt desc)`
  - supports agent-scoped analytics without an extra join
- `PropertyView(viewedAt desc)`
  - supports backfills and raw event access
- `AgentDailyStat(agentId, date desc)`
  - supports fast dashboard time windows
- `PropertyAnalytics(agentId, lifetimeViewCount desc, lastViewedAt desc)`
  - supports top viewed properties ranking
- `PropertyViewDaily(agentId, propertyId, date)` unique
  - supports per-day drilldown by property
- `SuspiciousFlag(propertyId, status)`
  - supports fast open-flag lookups for a property
- `SuspiciousFlag(status, createdAt desc)`
  - supports flagged listing review queries
- `PropertyCoListing(propertyId, agentId)` unique
  - prevents duplicate co-list rows
- `Agent.email` unique
  - supports login

For the current implementation, I went one step beyond basic indexes and added summary tables so dashboard reads no longer depend on scanning the raw `PropertyView` table for every request.

## Dashboard Stats and Query Strategy

The dashboard now reads primarily from pre-aggregated analytics tables instead of live event scans. The raw view event table is still kept as the source of truth, but dashboard queries use summaries so the common read path stays fast as data volume grows.

### `dashboardStats`

This query returns:

- status counts from `AgentDashboardStats`
- total views all time from `AgentDashboardStats`
- total views this month from `AgentDailyStat`
- sold count and revenue for the last 30 days from `AgentDailyStat`
- average days to sell from cumulative counters in `AgentDashboardStats`

Property create, update, delete, confirm-scam, restore, and view-recording flows all keep those aggregates in sync. That moves the work to write time so the dashboard stays cheap to read.

### `dashboardViewsOverTime`

This reads from `AgentDailyStat` for the requested window. The API accepts a date window and offset so the frontend can paginate 14-day blocks without fetching the full history every time.

### `dashboardViewedPropertiesByDate`

This reads from `PropertyViewDaily` for one selected day. It exists so the chart can drill into a day and show which properties were viewed, instead of only returning a single chart total.

### `topViewedProperties`

This reads from `PropertyAnalytics`, ordered by lifetime view count and last activity.

### Why This Scales Better

At `100k+` properties per agent, repeated live aggregation over raw events becomes the wrong default. The aggregate design changes the cost profile:

- writes become slightly heavier
- dashboard reads become predictable and cheap
- raw event history stays available for backfills and audits

That is the tradeoff I would choose for an agent dashboard, because dashboards are read frequently and need consistent latency.

## Scam Detection Rules

Detection runs synchronously on property create and update. I chose synchronous execution for the challenge because:

- the rules are simple enough for the challenge scope
- the result is immediately visible in the UI
- it avoids adding queue infrastructure just to satisfy a relatively small workload

### Rule 1: Low Price per Square Meter

Trigger:

- compare the listing against similar properties in the same city and property type
- only use comparables with a surface area in a reasonable band around the target listing
- require at least 3 comparables
- flag if the listing is below `65%` of the baseline average price per square meter

Why:

- it maps directly to the challenge prompt
- it produces an explainable score
- it is easy to expose in the UI with concrete numbers

Guardrails:

- draft listings are ignored
- zero or invalid surface area is ignored
- too-small sample sizes do not produce a flag

### Rule 2: Cross-Agent Duplicate Listing

Trigger:

- look for listings from other agents with the same address or the same normalized title and description
- normalize text before comparison to reduce punctuation/casing noise

Why:

- duplicate or near-duplicate listings across agents are a credible fake-listing signal
- it complements the pricing rule with a very different failure mode

### Scoring

Confidence scores are heuristic and intentionally simple:

- low-price rule produces a confidence band based on how far below the baseline the listing sits
- duplicate detection gives a higher score for same-address matches than for same-content matches

The score is not a probabilistic model. It is a review aid for sorting, not a guarantee that a listing is fraudulent.

## False Positives, False Negatives, and Extension Path

I biased slightly toward reducing false positives because this is an agent-facing workflow. A noisy flagging system becomes untrustworthy very quickly.

Trade-offs in the current version:

- requiring 3 comparables avoids weak baselines, but it misses suspicious listings in sparse markets
- exact duplicate matching is safer, but it misses more subtle copy variants
- synchronous detection is simple, but it is not the right long-term approach for very heavy write volume

If I were extending this:

- add fuzzy duplicate matching with trigram similarity or embeddings
- add agent-level behavior rules, for example many high-value listings posted in a short time
- add regional or postal-code baselines when city-level comparables are too sparse
- separate automatic detection into an async pipeline for large-scale ingestion
- cluster related suspicious listings so reviewers see one investigation unit instead of isolated flags

For millions of listings, I would move detection into background jobs, maintain materialized or precomputed market baselines, and push duplicate search into dedicated indexed search structures rather than synchronous relational scans.

## High-Traffic View Tracking

The current implementation already denormalizes `ownerAgentId` onto `PropertyView` and keeps aggregate counters up to date on write. That is a good intermediate step, but the next production step would be queue-based ingestion.

### Queue-Based Ingestion Path

In a higher-traffic system, `recordPropertyView` would change from:

- write raw event
- update aggregate tables in the same request

to:

- accept the view event quickly
- publish a compact message to a queue
- have a worker batch-update `AgentDashboardStats`, `AgentDailyStat`, `PropertyAnalytics`, and `PropertyViewDaily`

Why:

- it keeps public view tracking latency low
- it prevents traffic spikes from competing with property CRUD or review mutations
- it allows batched aggregate updates instead of one-row-at-a-time churn

I would still keep the same aggregate tables. The queue changes the ingestion path, not the read model.

## Frontend Decisions

The UI is optimized around two workflows:

- portfolio management
- review of suspicious listings

Important choices:

- protected routes after login
- dashboard quick actions for flag review
- property preview page separate from edit mode
- visible flagged state in the properties list, details page, and edit page
- reusable review modals and review cards so review UX stays consistent

The dashboard view chart is implemented as a lightweight custom panel instead of bringing in a charting dependency. For this scope, that kept the bundle smaller and gave enough control over interaction and styling.

## What I Would Improve With More Time

- stronger automated tests around lifecycle transitions and detection rules
- generated GraphQL types on the frontend instead of hand-maintained query result shapes
- queue-based view ingestion and async detection jobs for larger write volume
- more explicit co-listing visibility in the UI
- richer empty states and success toasts

## If I Had 2 More Hours

I would add a dedicated suspicious listing review timeline.

### Why

The current UI lets an agent dismiss or confirm a flag, but the investigation context is still fairly shallow. A timeline would make the review system more credible by showing how and why a listing changed over time.

### Data Model Changes

- extend `FlagReviewAction` with optional structured metadata such as `previousStatus` and `nextStatus`
- optionally add `PropertyActivity` for non-flag events such as status changes and edits, if I wanted one unified audit feed

### API Additions

- `propertyReviewTimeline(propertyId: ID!)`
  - returns flag creation, auto-detection reruns, dismiss/confirm actions, and status transitions
- optionally expose `flagReviewActions(flagId: ID!)` if I wanted smaller focused queries

### UI Additions

- add a timeline section to the property details page
- add timeline snippets in the dashboard flagged listing cards for the latest review event
- add reviewer identity and timestamp badges so decisions are easier to audit

This is a realistic 2-hour extension because the core data is already present in the schema. It mostly needs a composed query and a well-structured UI surface.
