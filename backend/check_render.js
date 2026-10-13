const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://paulscreate:2QuS9MWNMnQI4T6WpbK7RoA1C0P0xeH0@dpg-dam4ssbm8hqs73bk75p0-a.oregon-postgres.render.com/cswatms_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const assignments = await pool.query(`
    SELECT a.id, a.worker_id, w.full_name, a.division_id, d.name as division_name, ou.name as unit_name, ol.name as location_name
    FROM assignments a
    JOIN workers w ON w.id = a.worker_id
    JOIN divisions d ON d.id = a.division_id
    JOIN operational_units ou ON ou.id = a.operational_unit_id
    JOIN operational_locations ol ON ol.id = a.operational_location_id
    WHERE a.effective_to IS NULL
    ORDER BY d.id, ou.name, w.full_name
  `);
  console.log("Assignments on Render (" + assignments.rows.length + "):");
  console.log(JSON.stringify(assignments.rows, null, 2));

  const reports = await pool.query(`
    SELECT rv.*, ol.name as location_name, ou.name as unit_name, d.name as division_name
    FROM report_verifications rv
    JOIN operational_locations ol ON ol.id = rv.operational_location_id
    JOIN operational_units ou ON ou.id = ol.operational_unit_id
    JOIN divisions d ON d.id = ou.division_id
  `);
  console.log("Report Verifications on Render (" + reports.rows.length + "):");
  console.log(JSON.stringify(reports.rows, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
