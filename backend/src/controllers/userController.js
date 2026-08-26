const {
  getAllUsers,
  getUsersByDivision,
  findById,
  createUser,
  deactivateUser,
  reactivateUser,
} = require("../models/userModel");
const { hashPassword } = require("../utils/auth");

/**
 * GET /api/users
 * - administrator: sees all users, optionally filtered by ?role=
 * - division_admin: sees only users in their division, optionally filtered by ?role=
 */
async function list(req, res) {
  try {
    const { role } = req.query;
    let users;
    if (req.user.role === "division_admin") {
      users = await getUsersByDivision(req.user.division_id, role || null);
    } else {
      users = await getAllUsers(role || null);
    }
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Something went wrong fetching users" });
  }
}

/**
 * GET /api/users/:id
 */
async function getOne(req, res) {
  try {
    const user = await findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // division_admin can only view users in their own division
    if (
      req.user.role === "division_admin" &&
      user.division_id !== req.user.division_id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Something went wrong fetching user" });
  }
}

/**
 * POST /api/users
 * - administrator: can create any role, any division
 * - division_admin: can only create supervisors in their own division
 */
async function create(req, res) {
  try {
    const { full_name, username, email, password, role, division_id } = req.body;
    if (!full_name || !username || !password) {
      return res
        .status(400)
        .json({ error: "full_name, username, and password are required" });
    }

    let effectiveRole = role;
    let effectiveDivisionId = division_id;

    // division_admin can only create supervisors within their own division
    if (req.user.role === "division_admin") {
      if (role && role !== "supervisor") {
        return res
          .status(403)
          .json({ error: "Division admins can only create supervisor accounts" });
      }
      effectiveRole = "supervisor";
      effectiveDivisionId = req.user.division_id;
    }

    if (!effectiveRole) {
      return res.status(400).json({ error: "role is required" });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      full_name,
      username,
      email,
      password_hash: passwordHash,
      role: effectiveRole,
      division_id: effectiveDivisionId || null,
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "A user with that username or email already exists" });
    }
    console.error("Create user error:", err);
    res.status(500).json({ error: "Something went wrong creating the user" });
  }
}

/**
 * PATCH /api/users/:id/deactivate
 * - administrator: can deactivate any user
 * - division_admin: can only deactivate supervisors in their own division
 */
async function deactivate(req, res) {
  try {
    const target = await findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (req.user.role === "division_admin") {
      if (target.division_id !== req.user.division_id || target.role !== "supervisor") {
        return res
          .status(403)
          .json({ error: "You can only deactivate supervisors in your division" });
      }
    }
    const updated = await deactivateUser(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error("Deactivate user error:", err);
    res.status(500).json({ error: "Something went wrong deactivating the user" });
  }
}

/**
 * PATCH /api/users/:id/reactivate
 * - administrator: can reactivate any user
 * - division_admin: can only reactivate supervisors in their own division
 */
async function reactivate(req, res) {
  try {
    const target = await findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (req.user.role === "division_admin") {
      if (target.division_id !== req.user.division_id || target.role !== "supervisor") {
        return res
          .status(403)
          .json({ error: "You can only reactivate supervisors in your division" });
      }
    }
    const updated = await reactivateUser(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error("Reactivate user error:", err);
    res.status(500).json({ error: "Something went wrong reactivating the user" });
  }
}

module.exports = { list, getOne, create, deactivate, reactivate };
