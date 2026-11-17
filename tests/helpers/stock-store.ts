import { mock } from "node:test";
import { prisma } from "../../src/lib/prisma";
import type { Order } from "../../src/lib/types";

const restorers: (() => void)[] = [];
export function stubStockMethod(target: object, method: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, method);
  restorers.push(() => { if (descriptor) Object.defineProperty(target, method, descriptor); else Reflect.deleteProperty(target, method); });
  Object.defineProperty(target, method, { value, configurable: true, writable: true });
}
export function restoreStockStores() { while (restorers.length) restorers.pop()!(); }

type Reservation = { checkoutId: string; productId: string; quantity: number; state: string };
type Movement = Reservation & { id: bigint; sequence: bigint; operationId: string; direction: string; attempts: number; lastError: string | null };
type Payment = { id: string; chargeId: string | null; userId: string; amount: number; status: string; order: Order; updatedAt: Date; createdAt: Date };
type Where = Record<string, unknown>;
function matches(row: Record<string, unknown>, where: Where = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Where[]).some((condition) => matches(row, condition));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const filter = value as Record<string, unknown>;
      if ("path" in filter) {
        const field = String(filter.path).replace("$.", "");
        return typeof (row[key] as Record<string, unknown>)[field] === "string";
      }
      if ("not" in filter) return row[key] !== filter.not;
      if ("gte" in filter) return Number(row[key]) >= Number(filter.gte);
      if ("in" in filter) return (filter.in as unknown[]).includes(row[key]);
      if ("lt" in filter) return (row[key] as Date).getTime() < (filter.lt as Date).getTime();
    }
    return value instanceof Date ? (row[key] as Date).getTime() === value.getTime() : row[key] === value;
  });
}

/** Serial transactions with rollback; the production lock SQL is also recorded for assertions. No network/DB. */
export function stockStore(initial: Record<string, number> = {}) {
  let reservations: Reservation[] = [];
  let movements: Movement[] = [];
  let payments: Payment[] = [];
  const database = new Map(Object.entries(initial).filter(([id]) => id.startsWith("tidb_")));
  const remote = new Map(Object.entries(initial).filter(([id]) => !id.startsWith("tidb_")).map(([id, stock]) => [id, { id, stock, stockOperationId: "", name: id }]));
  const calls: { method: string; id: string; body?: Record<string, unknown> }[] = [];
  const locks: string[] = [];
  let failing = false;
  let losePutResponse = false;
  let omitReceipt = false;
  let delayPut = false;
  let delayedPut: (() => void) | undefined;
  let failCommit = false;
  let ledger = 0;
  let sequence = BigInt(0);
  let tail = Promise.resolve();
  const sum = (rows: { quantity: number }[]) => ({ _sum: { quantity: rows.reduce((sum, row) => sum + row.quantity, 0) } });
  const tx = {
    $executeRaw: async () => 1,
    $queryRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => { locks.push(`${sql.join("?")} ${values.join(",")}`); return []; },
    stockLock: { createMany: async () => ({ count: 1 }), update: async () => ({ nextSequence: ++sequence }) },
    stockReservation: {
      findMany: async ({ where }: { where: Where }) => structuredClone(reservations.filter((row) => matches(row, where))),
      aggregate: async ({ where }: { where: Where }) => sum(reservations.filter((row) => matches(row, where))),
      createMany: async ({ data }: { data: Omit<Reservation, "state">[] }) => {
        reservations.push(...data.map((row) => ({ ...row, state: "held" }))); return { count: data.length };
      },
      updateMany: async ({ where, data }: { where: Where; data: Partial<Reservation> }) => {
        const rows = reservations.filter((row) => matches(row, where)); rows.forEach((row) => Object.assign(row, data)); return { count: rows.length };
      },
    },
    stockMovement: {
      findFirst: async ({ where }: { where: Where }) => structuredClone([...movements].sort((a, b) => Number(a.sequence - b.sequence)).find((row) => matches(row, where)) ?? null),
      findMany: async ({ where, take }: { where: Where; take: number }) => structuredClone(movements.filter((row) => matches(row, where)).slice(0, take)),
      count: async ({ where }: { where: Where }) => movements.filter((row) => matches(row, where)).length,
      aggregate: async ({ where }: { where: Where }) => sum(movements.filter((row) => matches(row, where))),
      createMany: async ({ data }: { data: Omit<Movement, "id" | "state" | "attempts" | "lastError">[] }) => {
        let count = 0;
        for (const row of data) if (!movements.some((job) => job.checkoutId === row.checkoutId && job.productId === row.productId && job.direction === row.direction)) {
          movements.push({ ...row, id: ++sequence, state: "pending", attempts: 0, lastError: null }); count++;
        }
        return { count };
      },
      update: async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
        const row = movements.find((row) => matches(row, where))!;
        const { attempts, ...fields } = data;
        Object.assign(row, fields);
        if (attempts) row.attempts += (attempts as { increment: number }).increment;
        return row;
      },
    },
    product: {
      findUnique: async ({ where }: { where: { id: string } }) => database.has(where.id) ? { id: where.id, stock: database.get(where.id) } : null,
      updateMany: async ({ where, data }: { where: { id: string; stock?: unknown }; data: { stock: number | { decrement?: number; increment?: number } } }) => {
        if (!database.has(where.id) || !matches({ id: where.id, stock: database.get(where.id) }, where)) return { count: 0 };
        database.set(where.id, typeof data.stock === "number" ? data.stock : database.get(where.id)! - (data.stock.decrement ?? 0) + (data.stock.increment ?? 0));
        return { count: 1 };
      },
    },
    checkoutPayment: {
      findMany: async ({ where, take }: { where: Where; take: number }) => structuredClone(payments.filter((row) => matches(row, where)).slice(0, take)),
      count: async ({ where }: { where: Where }) => payments.filter((row) => matches(row, where)).length,
      create: async ({ data }: { data: Omit<Payment, "chargeId" | "status" | "updatedAt" | "createdAt"> }) => {
        const row = { ...structuredClone(data), chargeId: null, status: "pending", updatedAt: new Date(), createdAt: new Date() }; payments.push(row); return structuredClone(row);
      },
      findFirst: async ({ where }: { where: Where }) => structuredClone(payments.find((row) => matches(row, where)) ?? null),
      findUnique: async ({ where }: { where: Where }) => structuredClone(payments.find((row) => matches(row, where)) ?? null),
      updateMany: async ({ where, data }: { where: Where; data: Partial<Payment> }) => {
        const rows = payments.filter((row) => matches(row, where));
        rows.forEach((row) => Object.assign(row, structuredClone(data), { updatedAt: new Date(row.updatedAt.getTime() + 1) }));
        return { count: rows.length };
      },
    },
    paymentCharge: { createMany: async () => ({ count: ++ledger }) },
    discountCode: { updateMany: async () => ({ count: 1 }) },
    cartItem: { deleteMany: async () => ({ count: 1 }) },
  };
  const run = async (work: (client: typeof tx) => Promise<unknown>) => {
    const previous = tail;
    let unlock!: () => void;
    tail = new Promise<void>((resolve) => { unlock = resolve; });
    await previous;
    const snapshot = structuredClone({ reservations, movements, payments, database, ledger });
    try {
      const result = await work(tx);
      if (failCommit && movements.some((row) => row.state === "applied" && snapshot.movements.find((old) => old.id === row.id)?.state !== "applied")) { failCommit = false; throw new Error("Commit response lost"); }
      return result;
    } catch (error) {
      ({ reservations, movements, payments, ledger } = snapshot);
      database.clear(); for (const [id, stock] of snapshot.database) database.set(id, stock);
      throw error;
    } finally { unlock(); }
  };
  stubStockMethod(prisma, "$transaction", run);
  for (const [name, delegate] of Object.entries(tx)) {
    if (name.startsWith("$")) continue;
    const target = prisma[name as keyof typeof prisma];
    for (const [method, implementation] of Object.entries(delegate)) stubStockMethod(target as object, method, implementation);
  }
  mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    if (!url.startsWith("https://mock.test/products/")) throw new Error("Unexpected network request");
    const id = decodeURIComponent(url.split("/products/")[1]);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, id, body });
    if (failing) return Response.json({}, { status: 503 });
    const row = remote.get(id);
    if (!row) return Response.json({}, { status: 404 });
    if (method === "PUT") {
      if (delayPut) { delayPut = false; delayedPut = () => Object.assign(row, body); throw new Error("PUT is still in flight after timeout"); }
      Object.assign(row, body);
      if (omitReceipt) row.stockOperationId = "";
      if (losePutResponse) { losePutResponse = false; throw new Error("Response lost after successful PUT"); }
    }
    return Response.json(row);
  });
  return {
    tx, database, remote, calls, locks,
    get reservations() { return reservations; }, get movements() { return movements; }, get payments() { return payments; },
    set failing(value: boolean) { failing = value; }, set losePutResponse(value: boolean) { losePutResponse = value; },
    set delayPut(value: boolean) { delayPut = value; }, completeDelayedPut() { delayedPut?.(); delayedPut = undefined; },
    set omitReceipt(value: boolean) { omitReceipt = value; }, set failCommit(value: boolean) { failCommit = value; },
  };
}
