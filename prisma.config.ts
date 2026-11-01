import { defineConfig } from 'prisma/config';

// Prisma 7: datasource URLs live in the config file, not the schema (P1012).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'mysql://fms:fms@127.0.0.1:3306/fms',
  },
});
