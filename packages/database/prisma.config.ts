import path from "path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const rootEnvPath = path.resolve(__dirname, "../../.env");
config({ path: rootEnvPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    `DATABASE_URL is not set. Create ${rootEnvPath} (copy from .env.example) with a valid PostgreSQL connection string.`
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node ../../apps/backend/src/config/seed.js",
  },
  datasource: {
    provider: "postgresql",
    url: databaseUrl,
  },
});
