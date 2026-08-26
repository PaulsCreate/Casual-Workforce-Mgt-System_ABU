const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Delete attendance records tied to assignments in unit 3
    const deletedAtt = await client.query(
      "DELETE FROM attendance WHERE assignment_id IN (SELECT id FROM assignments WHERE operational_unit_id = 3) RETURNING id"
    );
    console.log(`Deleted ${deletedAtt.rowCount} attendance record(s)`);

    // 2. Delete report_verifications for locations under unit 3
    const deletedRV = await client.query(
      "DELETE FROM report_verifications WHERE operational_location_id IN (SELECT id FROM operational_locations WHERE operational_unit_id = 3) RETURNING id"
    );
    console.log(`Deleted ${deletedRV.rowCount} report_verification(s)`);

    // 3. Delete transfers that reference unit 3 (either from or to)
    const deletedT = await client.query(
      `DELETE FROM transfers 
       WHERE from_assignment_id IN (SELECT id FROM assignments WHERE operational_unit_id = 3)
          OR to_operational_unit_id = 3
       RETURNING id`
    );
    console.log(`Deleted ${deletedT.rowCount} transfer(s)`);

    // 4. Delete the assignments themselves referencing unit 3
    const deletedAs = await client.query(
      "DELETE FROM assignments WHERE operational_unit_id = 3 RETURNING id"
    );
    console.log(`Deleted ${deletedAs.rowCount} assignment(s)`);

    // 5. Delete location_supervisors for locations in unit 3
    const deletedLS = await client.query(
      "DELETE FROM location_supervisors WHERE location_id IN (SELECT id FROM operational_locations WHERE operational_unit_id = 3) RETURNING location_id"
    );
    console.log(`Deleted ${deletedLS.rowCount} location_supervisor record(s)`);

    // 6. Delete locations under unit 3
    const deletedLocs = await client.query(
      "DELETE FROM operational_locations WHERE operational_unit_id = 3 RETURNING id, name"
    );
    console.log("Deleted locations:", deletedLocs.rows.map(r => `${r.id}:${r.name}`).join(", ") || "none");

    // 7. Delete unit 3
    const deletedUnit = await client.query(
      "DELETE FROM operational_units WHERE id = 3 RETURNING id, name"
    );
    console.log("Deleted unit:", deletedUnit.rows.map(r => `${r.id}:${r.name}`).join(", ") || "none");

    await client.query("COMMIT");
    console.log("\nSUCCESS: Refuse and Waste Management unit fully removed.");
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
