import assert from "node:assert/strict";
import { mock, test } from "node:test";

process.env.DATABASE_URL ??= "mysql://test:test@localhost:4000/test";
type Cache = { prisma?: unknown; prismaSchema?: string };
const cache = globalThis as unknown as Cache;

test("replaces a cached client from an older generated schema and disconnects it later", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  let disconnected = false;
  const stale = { $disconnect: async () => { disconnected = true; } };
  cache.prisma = stale;
  cache.prismaSchema = "[]";

  const { prisma } = await import("../src/lib/prisma");
  try {
    assert.notEqual(prisma, stale);
    assert.equal(cache.prisma, prisma);
    assert.notEqual(cache.prismaSchema, "[]");
    // Other module graphs may still be using the old client, so it is not closed straight away.
    assert.equal(disconnected, false);
    mock.timers.tick(60_000);
    await Promise.resolve();
    assert.equal(disconnected, true);
  } finally {
    mock.timers.reset();
  }
});

test("reuses the cached client when another module graph loads the same schema", async () => {
  const { prisma } = await import("../src/lib/prisma");
  let disconnected = false;
  const shared = { $disconnect: async () => { disconnected = true; } };
  const schema = cache.prismaSchema;
  cache.prisma = shared;
  try {
    // A query string makes the loader evaluate the module again, like a separate Next.js module graph.
    const again = (await import(`../src/lib/prisma.ts?graph=${2}`)) as typeof import("../src/lib/prisma");
    assert.equal(again.prisma, shared);
    assert.equal(cache.prismaSchema, schema);
    assert.equal(disconnected, false);
  } finally {
    await prisma.$disconnect();
    delete cache.prisma;
    delete cache.prismaSchema;
  }
});
