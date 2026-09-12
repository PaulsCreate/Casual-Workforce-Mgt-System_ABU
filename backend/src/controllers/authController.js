const { findByUsername, findById, updatePassword, updateLastLogin } = require("../models/userModel");
const { comparePassword, hashPassword, generateToken } = require("../utils/auth");
const { logAction } = require("../models/auditLogModel");

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await findByUsername(username);

    if (!user || !user.is_active) {
      // Record failed attempt
      await logAction({
        user_id: user ? user.id : 1,
        action: "login_failed",
        entity_type: "auth",
        entity_id: user ? user.id : null,
        details: { attempted_username: username, ip: req.ip },
      }).catch(() => {});

      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      // Record failed attempt
      await logAction({
        user_id: user.id,
        action: "login_failed",
        entity_type: "auth",
        entity_id: user.id,
        details: { attempted_username: username, ip: req.ip },
      }).catch(() => {});

      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await updateLastLogin(user.id).catch(() => {});

    // Record login success
    await logAction({
      user_id: user.id,
      action: "login_success",
      entity_type: "auth",
      entity_id: user.id,
      details: { ip: req.ip },
    }).catch(() => {});

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        division_id: user.division_id,
        division_name: user.division_name || null,
        must_change_password: Boolean(user.must_change_password),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Something went wrong during login" });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    const user = await findByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }

    const match = await comparePassword(current_password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const newHash = await hashPassword(new_password);
    const updated = await updatePassword(user.id, newHash, false);

    // Audit log
    await logAction({
      user_id: req.user.id,
      action: "change_password",
      entity_type: "user",
      entity_id: user.id,
      details: { username: user.username },
    }).catch(() => {});

    // Generate fresh token with must_change_password: false
    const token = generateToken({
      ...user,
      must_change_password: false,
    });

    res.json({
      message: "Password changed successfully",
      token,
      user: {
        id: updated.id,
        full_name: updated.full_name,
        username: updated.username,
        role: updated.role,
        division_id: updated.division_id,
        division_name: user.division_name || null,
        must_change_password: false,
      },
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
}

module.exports = { login, changePassword };
