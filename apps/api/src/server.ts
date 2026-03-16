import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { buildContext } from './context.js';
import { resolvers } from './graphql/resolvers/index.js';
import { typeDefs } from './graphql/schema.js';
import { env } from './lib/env.js';

const server = new ApolloServer({
  typeDefs,
  resolvers
});

const bootstrap = async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: env.API_PORT },
    context: async ({ req }) => buildContext(req.headers.authorization)
  });

  console.log(`API ready at ${url}`);
};

bootstrap().catch((error) => {
  console.error('Failed to start API server', error);
  process.exit(1);
});
