import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  dbCredentials: {
    url: "./data/marlowee.db",
  },
});
