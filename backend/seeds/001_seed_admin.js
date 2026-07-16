require("dotenv").config();
const pool = require("../src/config/db");
const { hashPassword } = require("../src/utils/auth");

async function seedAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4];

  if (!username || !password || !fullName) {
    console.error(
      'Usage: node seeds/001_seed_admin.js <username> <password> "<Full Name>"',
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO users (full_name, username, password_hash, role, division_id)
     VALUES ($1, $2, $3, 'administrator', NULL)
     RETURNING id, full_name, username, role, created_at`,
    [fullName, username, passwordHash],
  );

  console.log("Administrator created:");
  console.log(result.rows[0]);
  process.exit();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
