import "dotenv/config";
import {
    defineConfig,
    env,
} from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    // Hosted poolers can use DATABASE_URL at runtime and a direct URL for migrations.
    datasource: { url: process.env.DIRECT_URL || env("DATABASE_URL") },
});
