# RealAdvisor Technical Challenge

Real estate agent dashboard built for the RealAdvisor technical challenge.

The project is a Yarn workspace monorepo with:

- `apps/api`: Node.js, TypeScript, Apollo Server, Prisma, PostgreSQL, JWT auth
- `apps/web`: React, TypeScript, Vite, Apollo Client, Tailwind CSS

## Features

- JWT login for seeded agents
- Protected dashboard and property routes
- Dashboard stats, top viewed properties, and view trends
- Property CRUD with preview and edit flows
- Suspicious listing detection and review workflows
- Flagged listing filtering and review actions
- Property view history tracking
- Seeded demo dataset with suspicious listings and co-listings

## Requirements

- Node.js 20+
- Yarn 1.x
- Docker Desktop or a local PostgreSQL instance

## Local Setup

1. Install dependencies:

```bash
yarn install
```

2. Create the local env file:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Generate the Prisma client:

```bash
yarn workspace @realadvisor/api prisma:generate
```

5. Apply the database schema:

```bash
yarn workspace @realadvisor/api prisma:migrate
```

6. Seed the database:

```bash
yarn workspace @realadvisor/api prisma:seed
```

7. Start the API and web app:

```bash
yarn dev
```

The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4000/graphql`.

## Environment Variables

The default local env file is:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/realadvisor"
JWT_SECRET="change-me"
API_PORT=4000
VITE_API_URL="http://localhost:4000/graphql"
```

## Demo Accounts

The login page is prefilled with seeded local credentials. Available accounts:

- `alice@realadvisor.local / password123`
- `julien@realadvisor.local / password123`
- `sophie@realadvisor.local / password123`

## Useful Commands

Run both apps in development:

```bash
yarn dev
```

Run only the API:

```bash
yarn dev:api
```

Run only the web app:

```bash
yarn dev:web
```

Build the full project:

```bash
yarn build
```

Regenerate Prisma client:

```bash
yarn workspace @realadvisor/api prisma:generate
```

Apply Prisma migrations locally:

```bash
yarn workspace @realadvisor/api prisma:migrate
```

Reseed the local database:

```bash
yarn workspace @realadvisor/api prisma:seed
```

## Project Structure

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   └── src
│   └── web
│       └── src
├── doc
│   └── RealAdvisor_Technical_Challenge.md
├── docker-compose.yml
├── package.json
└── tsconfig.base.json
```

## Notes

- PostgreSQL is exposed locally on port `5434` to avoid collisions with other local projects.
- The web dev server is configured to open automatically in the browser.
- The latest seed expansion requires the database to be running before reseeding.
- There is no test suite in the repo yet; validation so far has been through local execution and `yarn build`.
