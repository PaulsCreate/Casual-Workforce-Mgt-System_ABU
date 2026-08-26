const pool = require('../src/config/db');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const oldLocsRes = await client.query('SELECT * FROM operational_locations WHERE operational_unit_id = 2');
    console.log(`Found ${oldLocsRes.rows.length} hostel entries to migrate.`);

    for (const loc of oldLocsRes.rows) {
      let unitRes = await client.query(
        'SELECT id FROM operational_units WHERE division_id = 2 AND name = $1',
        [loc.name]
      );
      let unitId;
      if (unitRes.rows.length > 0) {
        unitId = unitRes.rows[0].id;
      } else {
        const insertUnitRes = await client.query(
          'INSERT INTO operational_units (division_id, name, description) VALUES (2, $1, $2) RETURNING id',
          [loc.name, loc.description || (loc.name + ' - Hall of Residence')]
        );
        unitId = insertUnitRes.rows[0].id;
      }

      let blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
      if (loc.name.toLowerCase().includes('ramat')) {
        blocks = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'];
      } else if (loc.name.toLowerCase().includes('icsa')) {
        blocks = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block I', 'Block J'];
      } else if (loc.name.toLowerCase().includes('amina')) {
        blocks = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block I', 'Block J', 'Block K', 'Block L', 'Block M', 'Block N'];
      } else if (loc.name.toLowerCase().includes('danfodio') || loc.name.toLowerCase().includes('suleiman')) {
        blocks = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'];
      }

      let firstBlockLocId = null;
      for (const blockName of blocks) {
        const blockCheck = await client.query(
          'SELECT id FROM operational_locations WHERE operational_unit_id = $1 AND name = $2',
          [unitId, blockName]
        );
        if (blockCheck.rows.length > 0) {
          if (!firstBlockLocId) firstBlockLocId = blockCheck.rows[0].id;
        } else {
          const insertLocRes = await client.query(
            'INSERT INTO operational_locations (operational_unit_id, name, description) VALUES ($1, $2, $3) RETURNING id',
            [unitId, blockName, `${blockName} in ${loc.name}`]
          );
          if (!firstBlockLocId) firstBlockLocId = insertLocRes.rows[0].id;
        }
      }

      await client.query(
        'UPDATE assignments SET operational_unit_id = $1, operational_location_id = $2 WHERE operational_location_id = $3',
        [unitId, firstBlockLocId, loc.id]
      );

      await client.query(
        'UPDATE transfers SET to_operational_unit_id = $1, to_operational_location_id = $2 WHERE to_operational_location_id = $3',
        [unitId, firstBlockLocId, loc.id]
      );
    }

    await client.query('DELETE FROM operational_locations WHERE operational_unit_id = 2');
    await client.query('DELETE FROM operational_units WHERE id = 2');

    await client.query('COMMIT');
    console.log('SUCCESS: Hostels promoted to Units, Blocks created as Locations!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
