import "server-only";
import { env } from "~/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const createPrismaClient = () =>
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: env.DATABASE_URL,
            connectionTimeoutMillis: 5_000,
        }),
        log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
