const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { hashPassword, verifyPassword } = require("../utils/auth");

const router = express.Router();

router.post("/bootstrap-admin", async (req, res, next) => {
  try {
    const { fullName, email, adminId } = req.body || {};
    if (!fullName || !email || !adminId) {
      return res.status(400).json({ success: false, message: "fullName, email, adminId are required" });
    }

    const [[existingAdmins]] = await db.query("SELECT COUNT(*) AS count_admins FROM users WHERE role='admin'");
    if (Number(existingAdmins.count_admins || 0) > 0) {
      return res.status(409).json({ success: false, message: "Admin already exists. Bootstrap is disabled." });
    }

    const [emailExists] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (emailExists.length) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const names = String(fullName).trim().split(/\s+/);
    const firstName = names.shift();
    const lastName = names.join(" ") || "Admin";
    const hash = await hashPassword(adminId);
    await db.query(
      `INSERT INTO users
       (student_id, role, password_hash, first_name, last_name, email, status, account_status, approved_at, created_at, updated_at)
       VALUES (NULL, 'admin', ?, ?, ?, ?, 'Active', 'approved', NOW(), NOW(), NOW())`,
      [hash, firstName, lastName, email]
    );

    return res.status(201).json({
      success: true,
      message: "Admin bootstrapped. Login with email and password = adminId.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "email, password and role are required" });
    }

    const [rows] = await db.query(
      `SELECT id, student_id, role, first_name, last_name, email, password_hash, account_status
       FROM users
       WHERE email = ? AND role = ?
       LIMIT 1`,
      [email, role]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = rows[0];
    if (user.account_status && user.account_status !== "approved") {
      return res.status(403).json({ success: false, message: "Account pending admin approval" });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
    );

    await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        student_id: user.student_id,
        role: user.role,
        name: [user.first_name, user.last_name].join(" ").trim(),
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/register-request", async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      role,
      registrationNumber,
      registrationDate,
      gradeLevel,
      subjects,
    } = req.body || {};

    if (!fullName || !email || !role || !registrationNumber) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, role, and registrationNumber are required",
      });
    }

    const normalizedRole = String(role).toLowerCase();
    if (["student", "teacher", "admin"].indexOf(normalizedRole) === -1) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const [dupUser] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (dupUser.length) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const [dupPending] = await db.query(
      "SELECT id FROM registration_requests WHERE email = ? AND status = 'pending' LIMIT 1",
      [email]
    );
    if (dupPending.length) {
      return res.status(409).json({ success: false, message: "Pending request already exists for this email" });
    }

    // Requirement: default password should be student/registration ID
    const passwordHash = await hashPassword(registrationNumber);

    await db.query(
      `INSERT INTO registration_requests
       (full_name, email, role, registration_number, registration_date, grade_level, requested_subjects, password_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        fullName,
        email,
        normalizedRole,
        registrationNumber,
        registrationDate || null,
        gradeLevel || null,
        JSON.stringify(Array.isArray(subjects) ? subjects : []),
        passwordHash,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Registration request submitted. Await admin approval.",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
