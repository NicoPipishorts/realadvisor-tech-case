import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { getStoredToken } from './auth';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql';

const authLink = setContext((_, previousContext) => {
  const token = getStoredToken();

  return {
    headers: {
      ...previousContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  };
});

export const apolloClient = new ApolloClient({
  link: from([
    authLink,
    new HttpLink({
      uri: apiUrl
    })
  ]),
  cache: new InMemoryCache()
});
