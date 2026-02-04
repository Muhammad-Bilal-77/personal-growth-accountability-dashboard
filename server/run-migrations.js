import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

const migrationsDir = path.join(__dirname, "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const run = async () => {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`Running ${file}...`);
      await client.query(sql);
    }
    console.log("Migrations completed.");
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
