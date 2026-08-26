const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });

async function run() {
  const divs = await pool.query("SELECT id, name FROM divisions ORDER BY id");
  console.log("\n=== DIVISIONS ===");
  divs.rows.forEach(r => console.log(r.id, r.name));

  const units = await pool.query("SELECT ou.id, ou.name, ou.division_id, d.name AS division_name FROM operational_units ou JOIN divisions d ON d.id = ou.division_id ORDER BY ou.division_id, ou.id");
  console.log("\n=== OPERATIONAL UNITS ===");
  units.rows.forEach(r => console.log(`  [div ${r.division_id} - ${r.division_name}]  unit ${r.id}: ${r.name}`));

  const locs = await pool.query("SELECT ol.id, ol.name, ol.operational_unit_id, ou.name AS unit_name FROM operational_locations ol JOIN operational_units ou ON ou.id = ol.operational_unit_id ORDER BY ol.operational_unit_id, ol.id");
  console.log("\n=== OPERATIONAL LOCATIONS ===");
  locs.rows.forEach(r => console.log(`    [unit ${r.operational_unit_id} - ${r.unit_name}]  loc ${r.id}: ${r.name}`));

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
