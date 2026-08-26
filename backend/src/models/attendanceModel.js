const pool = require("../config/db");

async function isSupervisorForAssignment(user_id, assignment_id) {
  const result = await pool.query(
    `SELECT 1 FROM assignments a
     JOIN location_supervisors ls ON ls.location_id = a.operational_location_id
     WHERE a.id = $1 AND ls.user_id = $2`,
    [assignment_id, user_id],
  );
  return result.rows.length > 0;
}

async function markAttendance({
  assignment_id,
  attendance_date,
  marked_by,
  capture_method,
}) {
  const result = await pool.query(
    `INSERT INTO attendance (assignment_id, attendance_date, marked_by, capture_method)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [assignment_id, attendance_date, marked_by, capture_method || "web"],
  );
  return result.rows[0];
}

async function getAttendanceForAssignment(assignment_id, month, year) {
  if (month && year) {
    const result = await pool.query(
      `SELECT * FROM attendance
       WHERE assignment_id = $1
         AND EXTRACT(MONTH FROM attendance_date) = $2
         AND EXTRACT(YEAR FROM attendance_date) = $3
       ORDER BY attendance_date`,
      [assignment_id, month, year],
    );
    return result.rows;
  }
  const result = await pool.query(
    "SELECT * FROM attendance WHERE assignment_id = $1 ORDER BY attendance_date",
    [assignment_id],
  );
  return result.rows;
}

async function countDaysWorked(assignment_id, month, year) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS days_worked FROM attendance
     WHERE assignment_id = $1
       AND EXTRACT(MONTH FROM attendance_date) = $2
       AND EXTRACT(YEAR FROM attendance_date) = $3`,
    [assignment_id, month, year],
  );
  return result.rows[0].days_worked;
}

async function getAttendanceForLocationOnDate(location_id, date) {
  const result = await pool.query(
    `SELECT att.*, w.full_name, w.staff_id
     FROM attendance att
     JOIN assignments a ON a.id = att.assignment_id
     JOIN workers w ON w.id = a.worker_id
     WHERE a.operational_location_id = $1 AND att.attendance_date = $2`,
    [location_id, date],
  );
  return result.rows;
}

async function unmarkAttendance({ assignment_id, attendance_date }) {
  const result = await pool.query(
    `DELETE FROM attendance
     WHERE assignment_id = $1 AND attendance_date = $2
     RETURNING *`,
    [assignment_id, attendance_date]
  );
  return result.rows[0];
}

module.exports = {
  isSupervisorForAssignment,
  markAttendance,
  unmarkAttendance,
  getAttendanceForAssignment,
  countDaysWorked,
  getAttendanceForLocationOnDate,
};
