import jwt from 'jsonwebtoken';

import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';

type JwtClaims = {
  sub?: string;
};

export type Context = {
  agentId: string | null;
  prisma: typeof prisma;
};

const getAgentIdFromAuthHeader = (authorization?: string): string | null => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtClaims;
    return decoded.sub ?? null;
  } catch {
    return null;
  }
};

export const buildContext = (authorization?: string): Context => ({
  agentId: getAgentIdFromAuthHeader(authorization),
  prisma
});
