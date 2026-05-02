import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  const migrationSql = readFileSync(
    join(process.cwd(), "db", "migrations", "001_initial.sql"),
    "utf-8"
  );

  try {
    await pool.query(migrationSql);
    console.log("Migrations applied successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
