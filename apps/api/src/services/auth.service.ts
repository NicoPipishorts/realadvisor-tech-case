import type { PrismaClient } from '@prisma/client';

import { signAgentToken, verifyPassword } from '../lib/auth.js';

type AppPrisma = PrismaClient;

export const login = async (prisma: AppPrisma, email: string, password: string) => {
  const agent = await prisma.agent.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!agent) {
    throw new Error('Invalid email or password.');
  }

  const isValid = await verifyPassword(password, agent.passwordHash);

  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  return {
    token: signAgentToken(agent.id),
    agent
  };
};
