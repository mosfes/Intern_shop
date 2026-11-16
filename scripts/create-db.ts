import "dotenv/config";
import mariadb from "mariadb";

// Creates the database named in DATABASE_URL if it doesn't exist yet.
// Usage: npm run db:create
async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error(`Unsafe database name: "${database}"`);
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: url.port ? Number(url.port) : 4000,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: isLocal ? undefined : { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectTimeout: 15_000,
  });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`,
    );
    const rows = await conn.query("SHOW DATABASES");
    console.log(`Database "${database}" is ready.`);
    console.log("Databases:", rows.map((r: { Database: string }) => r.Database).join(", "));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
