const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Drop the column from the table
    await client.query("ALTER TABLE assignments DROP COLUMN IF EXISTS supervisor_id");
    
    await client.query("COMMIT");
    console.log("SUCCESS: Dropped supervisor_id from assignments.");
    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERROR:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}
run();
