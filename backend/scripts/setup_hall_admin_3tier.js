const pool = require('../src/config/db');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure 'Hall Administration Unit' exists under division 2
    let hallAdminUnitRes = await client.query(
      "SELECT id FROM operational_units WHERE division_id = 2 AND name = 'Hall Administration Unit'"
    );
    let hallAdminUnitId;
    if (hallAdminUnitRes.rows.length > 0) {
      hallAdminUnitId = hallAdminUnitRes.rows[0].id;
    } else {
      const insertUnit = await client.query(
        `INSERT INTO operational_units (division_id, name, description)
         VALUES (2, 'Hall Administration Unit', 'Sanitation operations across student halls of residence')
         RETURNING id`
      );
      hallAdminUnitId = insertUnit.rows[0].id;
    }
    console.log('Hall Administration Unit ID:', hallAdminUnitId);

    // 2. Define standard hostels and their blocks
    const hostelBlocks = [
      { hostel: 'Ramat Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'] },
      { hostel: 'ICSA Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H'] },
      { hostel: 'Amina Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block I', 'Block J'] },
      { hostel: 'Danfodio Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'] },
      { hostel: 'Suleiman Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'] },
      { hostel: 'Alexander Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D'] },
      { hostel: 'Dangote Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D'] },
      { hostel: 'Shehu Idris Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D'] },
      { hostel: 'Akenzua Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D'] },
      { hostel: 'Sassakawa Hall', blocks: ['Block A', 'Block B', 'Block C', 'Block D'] }
    ];

    const createdLocationMap = {}; // key: "Hostel — Block" -> id

    for (const h of hostelBlocks) {
      for (const b of h.blocks) {
        const locName = `${h.hostel} — ${b}`;
        let locRes = await client.query(
          'SELECT id FROM operational_locations WHERE operational_unit_id = $1 AND name = $2',
          [hallAdminUnitId, locName]
        );
        let locId;
        if (locRes.rows.length > 0) {
          locId = locRes.rows[0].id;
        } else {
          const insertLoc = await client.query(
            `INSERT INTO operational_locations (operational_unit_id, name, description)
             VALUES ($1, $2, $3) RETURNING id`,
            [hallAdminUnitId, locName, `${b} sanitation coverage in ${h.hostel}`]
          );
          locId = insertLoc.rows[0].id;
        }
        createdLocationMap[locName] = locId;
        if (!createdLocationMap[h.hostel]) {
          createdLocationMap[h.hostel] = locId; // fallback for hostel default
        }
      }
    }

    const defaultRamatBlockA = createdLocationMap['Ramat Hall — Block A'];

    // 3. Re-link all assignments under division 2 to point to hallAdminUnitId and a valid compound location
    await client.query(
      `UPDATE assignments 
       SET operational_unit_id = $1, operational_location_id = $2 
       WHERE division_id = 2`,
      [hallAdminUnitId, defaultRamatBlockA]
    );

    // 4. Re-link transfers under division 2
    await client.query(
      `UPDATE transfers 
       SET to_operational_unit_id = $1, to_operational_location_id = $2 
       WHERE to_division_id = 2`,
      [hallAdminUnitId, defaultRamatBlockA]
    );

    // 5. Delete other temporary units under division 2 (leaving only Hall Administration Unit)
    await client.query(
      `DELETE FROM operational_locations 
       WHERE operational_unit_id IN (
         SELECT id FROM operational_units WHERE division_id = 2 AND id != $1
       )`,
      [hallAdminUnitId]
    );

    await client.query(
      `DELETE FROM operational_units WHERE division_id = 2 AND id != $1`,
      [hallAdminUnitId]
    );

    await client.query('COMMIT');
    console.log('SUCCESSFULLY RESTRUCTURED 3-TIER HIERARCHY WITH HALL ADMINISTRATION UNIT!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Restructuring error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
