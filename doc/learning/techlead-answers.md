# Tech Lead Answers

These are slightly deeper but still interview-friendly explanations of the main tools used in this project.

## Apollo Server

Apollo Server is the backend layer that exposes the GraphQL API. In this project, it takes the schema you define, receives GraphQL requests from the frontend, figures out which resolver functions to run, and returns the response in the right shape.

A good way to describe it is: "Apollo Server is the bridge between the client's GraphQL queries and my backend business logic."

## Prisma

Prisma is the data-access layer between the backend and PostgreSQL. Instead of writing raw SQL for every query, I define the database models in `schema.prisma`, Prisma generates a typed client, and then I can query the database in TypeScript with autocomplete and type safety.

The reason it was useful here is that it sped up schema design, relationships, migrations, and query writing, while keeping the code easier to maintain than lots of hand-written SQL.

## Zod

Zod is used for runtime validation of input data. TypeScript only helps while writing code, but once real data comes in from the frontend, the backend still needs to check that the values are valid.

So in this app, Zod makes sure things like title length, positive price, valid surface area, and allowed status values are correct before the backend tries to save anything.

## GraphQL

GraphQL is the API style used by the app. Instead of having many REST endpoints like `/properties`, `/dashboard`, or `/flags`, the frontend sends queries that describe exactly what fields it wants, and the backend returns that exact structure.

That works especially well here because the dashboard, property list, and property detail page all need different combinations of related data, and GraphQL keeps that flexible without creating lots of custom endpoints.

## Apollo Client

Apollo Client is the frontend library that talks to the GraphQL API. It sends queries and mutations, tracks loading and error states, and caches responses so the UI can feel faster and stay in sync after updates.

In this project, it is what makes things like fetching dashboard stats, updating a property, dismissing a flag, and refreshing related screens much easier to manage in React.

## Prisma Migrations

Prisma Migrations are how database schema changes are tracked and applied over time. When the data model changes, Prisma creates a migration file that describes how the database should be updated, so the schema evolves in a controlled and repeatable way.

That matters because it means the database structure is versioned alongside the code, which makes setup, collaboration, and future changes much safer.

## Next Versions

If useful, this file can be extended with:

- a more technical version for a senior tech lead
- a simpler say-it-out-loud version for interview answers

## More Technical Version

These are stronger, more technical explanations you can use if the interviewer wants deeper reasoning.

### Apollo Server

Apollo Server is the GraphQL execution layer on the backend. It takes the schema definition, parses incoming GraphQL operations, validates them against the schema, builds the resolver execution chain, and returns a response that matches the requested field structure.

In this project, Apollo Server is useful because it cleanly separates the API contract from the implementation. The schema defines what the frontend is allowed to ask for, and the resolvers delegate to services that contain the actual business logic.

### Prisma

Prisma is both an ORM and a schema-driven database toolkit. The Prisma schema defines the relational model, indexes, enums, and relationships, and Prisma generates a strongly typed client that the backend can use for database access.

The practical value is that it reduces accidental query mistakes, makes relation loading easier, and keeps the codebase aligned with the database model. It also speeds up iteration because schema changes, migrations, and query code all come from the same source of truth.

### Zod

Zod provides runtime schema validation, which complements TypeScript rather than replacing it. TypeScript can tell me whether my own code is type-correct during development, but it cannot guarantee that external input from a request is valid at runtime.

In this project, Zod acts as a guard at the API boundary. It ensures that invalid property input does not make it into the service layer or database, which reduces the risk of bad data and makes validation rules explicit and centralized.

### GraphQL

GraphQL is an API query language and schema system that lets clients request exactly the fields they need. Instead of exposing many fixed REST endpoints with predetermined payloads, the backend exposes a typed graph of queries, mutations, and object relationships.

That is especially useful in this app because the UI is composed of several read patterns with overlapping but different needs. The dashboard, property table, and property detail page all consume related data in different shapes, and GraphQL handles that without forcing the backend to create lots of narrowly tailored endpoints.

### Apollo Client

Apollo Client is a stateful GraphQL client for the frontend. It handles query execution, mutation execution, loading and error states, normalized caching, and refetch behavior between the React app and the GraphQL API.

Its main value in this project is that it simplifies server-state management. Instead of manually wiring fetch calls and cache invalidation, I can keep related screens in sync after mutations like property updates, deletions, or flag reviews with a much cleaner data flow.

### Prisma Migrations

Prisma Migrations are the schema evolution mechanism for the database. When the data model changes, Prisma generates a migration that records how to move the database from one version of the schema to the next in a consistent way.

This matters because the database structure becomes part of the codebase history. It improves reproducibility, keeps environments aligned, and makes it safer to evolve the schema over time without undocumented manual database changes.

## Simpler Say-It-Out-Loud Version

These are shorter, more conversational answers you can use if you want to sound clear without getting too deep.

### Apollo Server

Apollo Server is what lets my backend expose a GraphQL API. It receives GraphQL requests from the frontend, checks them against the schema, and runs the resolver code that returns the data.

### Prisma

Prisma is the tool I used to talk to the PostgreSQL database in a type-safe way. I define my models once, and Prisma gives me a generated client so I can query the database more safely and cleanly than writing everything by hand.

### Zod

Zod is for validating incoming data at runtime. I used it so that when the frontend sends property data, the backend checks things like required fields and valid values before saving anything.

### GraphQL

GraphQL is the API layer between the frontend and backend. Instead of building lots of separate endpoints, I define queries and mutations, and the frontend can ask for exactly the data it needs.

### Apollo Client

Apollo Client is the frontend tool that sends GraphQL queries and mutations. It also helps with loading states, errors, and keeping the UI data updated after changes.

### Prisma Migrations

Prisma Migrations are how I version and apply database schema changes. They make sure the database structure changes in a controlled, repeatable way instead of relying on manual updates.
