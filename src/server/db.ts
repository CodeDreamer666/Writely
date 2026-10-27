import "server-only";
import { env } from "~/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * What: How long, in milliseconds, opening a new database connection may
 * take before the request fails.
 *
 * Used in:
 * - src/server/db.ts (createPrismaClient)
 *
 * Effect: A serverless database waking from sleep, or a distant region, can
 * take several seconds to accept a connection. Lowering it makes those
 * requests fail with "Connection terminated due to connection timeout";
 * raising it lets slow connections finish but makes a database that is
 * really down take longer to report.
 */
const CONNECTION_TIMEOUT = 20_000;

const createPrismaClient = () =>
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: env.DATABASE_URL,
            connectionTimeoutMillis: CONNECTION_TIMEOUT,
        }),
        log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
