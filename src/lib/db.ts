import { PrismaClient } from "@prisma/client";
import { resolveDbEnv } from "../../scripts/db-env.mjs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: resolveDbEnv().url });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
