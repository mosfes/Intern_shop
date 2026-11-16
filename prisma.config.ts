import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Placeholder lets `prisma generate` run without a real database (CI, postinstall).
    url:
      process.env.DATABASE_URL ??
      "mysql://user:password@localhost:4000/placeholder",
  },
});
