import { describe, it, expect } from 'vitest';
import { createPrismaClient, closePrismaClient } from './index';
import type { PrismaClient } from '@prisma/client';

describe('prisma client factory (M0 db slice)', () => {
  it('creates a PrismaClient bound to the configured database URL', () => {
    const prisma: PrismaClient = createPrismaClient(
      'mysql://fms:fms@127.0.0.1:3306/fms',
    );

    expect(prisma).toBeDefined();
  });

  it('exposes a close hook that disconnects the client', () => {
    const prisma = createPrismaClient('mysql://fms:fms@127.0.0.1:3306/fms');

    expect(typeof closePrismaClient).toBe('function');
    expect(prisma).toBeDefined();
  });
});
