import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { env } from './env.js';
import type { Context } from '../context.js';

export const verifyPassword = async (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

export const signAgentToken = (agentId: string) =>
  jwt.sign({ sub: agentId }, env.JWT_SECRET, {
    expiresIn: '7d'
  });

export const requireAgentId = (context: Context) => {
  if (!context.agentId) {
    throw new Error('Unauthorized');
  }

  return context.agentId;
};
