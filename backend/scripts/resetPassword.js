#!/usr/bin/env node
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = require("../src/config/db");
const { hashPassword } = require("../src/utils/auth");
const { logAction } = require("../src/models/auditLogModel");

async function main() {
  const args = process.argv.slice(2);
  const username = args[0];
  const newPassword = args[1];
  const forceNextChange = args[2] === "--must-change" || args[2] === "-m";

  if (!username || !newPassword) {
    console.log(`
======================================================
  ABU Casual Workforce Portal — Password Reset Utility
======================================================
Usage:
  node scripts/resetPassword.js <username> <new_password> [--must-change]

Example:
  node scripts/resetPassword.js test.admin Admin@2026
  node scripts/resetPassword.js nura TempPass@123 --must-change
`);
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("Error: Password must be at least 6 characters long.");
    process.exit(1);
  }

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userRes.rows.length === 0) {
      console.error(`Error: User '${username}' not found in database.`);
      process.exit(1);
    }

    const user = userRes.rows[0];
    const hashedPassword = await hashPassword(newPassword);

    await pool.query(
      "UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3",
      [hashedPassword, forceNextChange, user.id]
    );

    // Record audit log
    await logAction({
      user_id: user.id,
      action: "cli_password_reset",
      entity_type: "user",
      entity_id: user.id,
      details: {
        username: user.username,
        reset_via: "cli",
        must_change_password: forceNextChange,
      },
    }).catch(() => {});

    console.log(`
======================================================
 SUCCESS: Password Reset Completed
======================================================
 User:                 ${user.full_name || user.username} (@${user.username})
 Role:                 ${user.role}
 Must Change on Login: ${forceNextChange ? "YES" : "NO"}
 Status:               Active
======================================================
`);
  } catch (err) {
    console.error("Error resetting password:", err.message);
  } finally {
    await pool.end();
  }
}

main();
