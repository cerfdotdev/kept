import "server-only";
import { createDb, schema, type Db } from "@kept/db";
import { eq, and, or, desc, asc, sql, like, gte, lt, ne, isNull } from "drizzle-orm";

export const db: Db = createDb();
export { schema, eq, and, or, desc, asc, sql, like, gte, lt, ne, isNull };
