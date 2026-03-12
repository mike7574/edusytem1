const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { hashPassword, splitName } = require("../utils/auth");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

async function getActiveAcademicYearId(conn = db) {
  const [[row]] = await conn.query(
    "SELECT id FROM academic_years WHERE is_active = TRUE ORDER BY id DESC LIMIT 1"
  );
  return row ? row.id : null;
}

function normalizeSubjects(input) {
  const list = Array.isArray(input) ? input : [];
  const parsed = [];

  list.forEach((item) => {
    if (!item) return;
    if (typeof item === "object") {
      const name = String(item.name || item.subject || item.subjectName || "").trim();
      const gradeLevel = item.gradeLevel || item.grade || item.className || null;
      if (name) parsed.push({ name, gradeLevel: gradeLevel ? String(gradeLevel).trim() : null });
      return;
    }

    const text = String(item || "").trim();
    if (!text) return;

    let name = text;
    let gradeLevel = null;

    if (text.includes("|")) {
      const parts = text.split("|");
      name = parts[0];
      gradeLevel = parts.slice(1).join("|");
    } else if (text.includes(":")) {
      const parts = text.split(":");
      name = parts[0];
      gradeLevel = parts.slice(1).join(":");
    } else {
      const match = text.match(/^(.*)\((.*)\)$/);
      if (match) {
        name = match[1];
        gradeLevel = match[2];
      }
    }

    name = String(name || "").trim();
    gradeLevel = gradeLevel ? String(gradeLevel).trim() : null;
    if (name) parsed.push({ name, gradeLevel });
  });

  return parsed;
}

async function ensureSubject(conn, subjectName, teacherPk) {
  let [subjectRows] = await conn.query("SELECT id FROM subjects WHERE subject_name = ? LIMIT 1", [subjectName]);
  let subjectId = subjectRows.length ? subjectRows[0].id : null;
  if (!subjectId) {
    const [subjectInsert] = await conn.query(
      "INSERT INTO subjects (subject_name, subject_code, teacher_id, created_at) VALUES (?, ?, ?, NOW())",
      [subjectName, "SUBJ-" + Date.now(), teacherPk || null]
    );
    subjectId = subjectInsert.insertId;
  }
  return subjectId;
}

async function applyPaymentToStudentFee(conn, studentFeeId, amount) {
  if (!studentFeeId || !amount) return;
  await conn.query(
    `UPDATE student_fees
     SET amount_paid = amount_paid + ?,
         outstanding_balance = GREATEST(0, amount_due - (amount_paid + ?)),
         status = CASE WHEN amount_due <= amount_paid + ? THEN 'Paid' ELSE 'Partial' END
     WHERE id = ?`,
    [amount, amount, amount, studentFeeId]
  );
}

async function attachFeesForGrade(conn, userId, gradeLevel, academicYearId) {
  if (!gradeLevel) return;
  const params = [gradeLevel];
  let yearClause = "";
  if (academicYearId) {
    yearClause = " AND academic_year_id = ?";
    params.push(academicYearId);
  }
  const [fees] = await conn.query(
    `SELECT id, amount, due_date FROM fees WHERE grade_level = ?${yearClause}`,
    params
  );

  for (let i = 0; i < fees.length; i += 1) {
    const fee = fees[i];
    await conn.query(
      `INSERT INTO student_fees (user_id, fee_id, status, amount_due, amount_paid, outstanding_balance, due_date)
       VALUES (?, ?, 'Pending', ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE amount_due=VALUES(amount_due), due_date=VALUES(due_date),
                               outstanding_balance=GREATEST(0, VALUES(amount_due) - amount_paid)`,
      [userId, fee.id, fee.amount, fee.amount, fee.due_date]
    );
  }
}

async function syncStudentsForFee(conn, feeId, gradeLevel, amount, dueDate) {
  if (!feeId || !gradeLevel) return;
  const [students] = await conn.query(
    `SELECT u.id
     FROM users u
     JOIN student_details sd ON sd.user_id = u.id
     WHERE u.role='student' AND sd.grade_level = ?`,
    [gradeLevel]
  );

  for (let i = 0; i < students.length; i += 1) {
    const userId = students[i].id;
    await conn.query(
      `INSERT INTO student_fees (user_id, fee_id, status, amount_due, amount_paid, outstanding_balance, due_date)
       VALUES (?, ?, 'Pending', ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE amount_due=VALUES(amount_due), due_date=VALUES(due_date),
                               outstanding_balance=GREATEST(0, VALUES(amount_due) - amount_paid)`,
      [userId, feeId, amount, amount, dueDate]
    );
  }
}

router.get("/registration-requests", async (req, res, next) => {
  try {
    const status = req.query.status || "pending";
    const [rows] = await db.query(
      `SELECT id, full_name, email, role, registration_number, registration_date, grade_level, requested_subjects, status, created_at
       FROM registration_requests
       WHERE status = ?
       ORDER BY created_at DESC`,
      [status]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/registration-requests/:id/approve", async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const requestId = Number(req.params.id);
    if (!requestId) {
      return res.status(400).json({ success: false, message: "Invalid request id" });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM registration_requests WHERE id = ? AND status = 'pending' LIMIT 1`,
      [requestId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Pending request not found" });
    }
    const request = rows[0];

    const [emailExists] = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [request.email]);
    if (emailExists.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: "Email already exists in users" });
    }

    const parts = splitName(request.full_name);
    const isStudent = request.role === "student";

    const [userInsert] = await conn.query(
      `INSERT INTO users
       (student_id, role, password_hash, first_name, last_name, email, admission_date, registration_date, status, account_status, approved_by, approved_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'approved', ?, NOW(), NOW(), NOW())`,
      [
        isStudent ? request.registration_number : null,
        request.role,
        request.password_hash,
        parts.firstName || request.full_name,
        parts.lastName || "-",
        request.email,
        request.registration_date || null,
        request.registration_date || null,
        req.user.id,
      ]
    );
    const newUserId = userInsert.insertId;
    let teacherPk = null;

    if (request.role === "student") {
      await conn.query(
        `INSERT INTO student_details (user_id, grade_level)
         VALUES (?, ?)`,
        [newUserId, request.grade_level || null]
      );
      const activeYearId = await getActiveAcademicYearId(conn);
      await attachFeesForGrade(conn, newUserId, request.grade_level || null, activeYearId);
    }

    if (request.role === "teacher") {
      const [teacherInsert] = await conn.query(
        `INSERT INTO teachers (user_id, teacher_id, first_name, last_name, email, title, created_at)
         VALUES (?, ?, ?, ?, ?, 'Teacher', NOW())`,
        [newUserId, request.registration_number, parts.firstName || request.full_name, parts.lastName || "-", request.email]
      );
      teacherPk = teacherInsert.insertId;

      let requestedSubjects = [];
      try {
        requestedSubjects = JSON.parse(request.requested_subjects || "[]");
      } catch (_) {
        requestedSubjects = [];
      }
      const parsedSubjects = normalizeSubjects(requestedSubjects);
      if (parsedSubjects.length) {
        const activeYearId = await getActiveAcademicYearId(conn);
        for (let i = 0; i < parsedSubjects.length; i += 1) {
          const item = parsedSubjects[i];
          const subjectId = await ensureSubject(conn, item.name, teacherPk);
          await conn.query(
            `INSERT INTO teacher_subject_assignments (teacher_id, subject_id, grade_level, academic_year_id, assigned_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE grade_level=VALUES(grade_level), academic_year_id=VALUES(academic_year_id), assigned_at=NOW()`,
            [teacherPk, subjectId, item.gradeLevel || null, activeYearId]
          );
        }
      }
    }

    await conn.query(
      `UPDATE registration_requests
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [req.user.id, requestId]
    );

    await conn.commit();
    return res.json({ success: true, message: "Registration approved" });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post("/registration-requests/:id/reject", async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const notes = (req.body && req.body.notes) || null;
    await db.query(
      `UPDATE registration_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), notes = ?
       WHERE id = ? AND status = 'pending'`,
      [req.user.id, notes, requestId]
    );
    res.json({ success: true, message: "Registration rejected" });
  } catch (error) {
    next(error);
  }
});

router.get("/students", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.student_id, CONCAT(u.first_name, ' ', u.last_name) AS name, u.email, u.status,
              sd.grade_level,
              COALESCE(JSON_ARRAYAGG(s.subject_name), JSON_ARRAY()) AS subjects
       FROM users u
       LEFT JOIN student_details sd ON sd.user_id = u.id
       LEFT JOIN student_subject_enrollments sse ON sse.user_id = u.id
       LEFT JOIN subjects s ON s.id = sse.subject_id
       WHERE u.role = 'student'
       GROUP BY u.id, u.student_id, name, u.email, u.status, sd.grade_level
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/students", async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { studentId, name, email, grade, subjects } = req.body || {};
    if (!studentId || !name || !email) {
      return res.status(400).json({ success: false, message: "studentId, name and email are required" });
    }

    const parts = splitName(name);
    const passwordHash = await hashPassword(studentId);
    const activeYearId = await getActiveAcademicYearId(conn);

    await conn.beginTransaction();
    const [insertUser] = await conn.query(
      `INSERT INTO users
       (student_id, role, password_hash, first_name, last_name, email, status, account_status, created_at, updated_at)
       VALUES (?, 'student', ?, ?, ?, ?, 'Active', 'approved', NOW(), NOW())`,
      [studentId, passwordHash, parts.firstName || name, parts.lastName || "-", email]
    );
    const userId = insertUser.insertId;

    await conn.query(
      `INSERT INTO student_details (user_id, grade_level)
       VALUES (?, ?)`,
      [userId, grade || null]
    );

    await attachFeesForGrade(conn, userId, grade || null, activeYearId);

    const list = Array.isArray(subjects) ? subjects : [];
    for (let i = 0; i < list.length; i += 1) {
      const subjectName = String(list[i] || "").trim();
      if (!subjectName) continue;
      let [subjectRows] = await conn.query("SELECT id FROM subjects WHERE subject_name = ? LIMIT 1", [subjectName]);
      let subjectId = subjectRows.length ? subjectRows[0].id : null;
      if (!subjectId) {
        const [subjectInsert] = await conn.query(
          "INSERT INTO subjects (subject_name, subject_code, created_at) VALUES (?, ?, NOW())",
          [subjectName, "SUBJ-" + Date.now() + "-" + i]
        );
        subjectId = subjectInsert.insertId;
      }
      await conn.query(
        `INSERT IGNORE INTO student_subject_enrollments (user_id, subject_id, enrolled_at)
         VALUES (?, ?, NOW())`,
        [userId, subjectId]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: "Student created" });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.delete("/students/:studentId", async (req, res, next) => {
  try {
    await db.query("DELETE FROM users WHERE student_id = ? AND role = 'student'", [req.params.studentId]);
    res.json({ success: true, message: "Student removed" });
  } catch (error) {
    next(error);
  }
});

router.get("/teachers", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.teacher_id, CONCAT(t.first_name, ' ', t.last_name) AS name, t.email,
              COALESCE(JSON_ARRAYAGG(CASE WHEN s.id IS NULL THEN NULL ELSE JSON_OBJECT('name', s.subject_name, 'gradeLevel', tsa.grade_level) END), JSON_ARRAY()) AS subjects,
              COUNT(DISTINCT COALESCE(tsa.grade_level, CONCAT('subject-', tsa.subject_id))) AS classesCount
       FROM teachers t
       LEFT JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.id
       LEFT JOIN subjects s ON s.id = tsa.subject_id
       GROUP BY t.id, t.teacher_id, name, t.email
       ORDER BY t.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/subjects", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, subject_name
       FROM subjects
       ORDER BY subject_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/teachers", async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { teacherId, name, email, subjects } = req.body || {};
    if (!teacherId || !name || !email) {
      return res.status(400).json({ success: false, message: "teacherId, name and email are required" });
    }

    const parts = splitName(name);
    const passwordHash = await hashPassword(teacherId);
    const subjectList = normalizeSubjects(subjects);
    const activeYearId = await getActiveAcademicYearId(conn);
    await conn.beginTransaction();

    const [userInsert] = await conn.query(
      `INSERT INTO users
       (student_id, role, password_hash, first_name, last_name, email, status, account_status, created_at, updated_at)
       VALUES (NULL, 'teacher', ?, ?, ?, ?, 'Active', 'approved', NOW(), NOW())`,
      [passwordHash, parts.firstName || name, parts.lastName || "-", email]
    );
    const userId = userInsert.insertId;

    const [teacherInsert] = await conn.query(
      `INSERT INTO teachers (user_id, teacher_id, first_name, last_name, email, title, created_at)
       VALUES (?, ?, ?, ?, ?, 'Teacher', NOW())`,
       [userId, teacherId, parts.firstName || name, parts.lastName || "-", email]
    );
    const teacherPk = teacherInsert.insertId;

    for (let i = 0; i < subjectList.length; i += 1) {
      const item = subjectList[i];
      const subjectId = await ensureSubject(conn, item.name, teacherPk);
      await conn.query(
        `INSERT INTO teacher_subject_assignments (teacher_id, subject_id, grade_level, academic_year_id, assigned_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE grade_level=VALUES(grade_level), academic_year_id=VALUES(academic_year_id), assigned_at=NOW()`,
        [teacherPk, subjectId, item.gradeLevel || null, activeYearId]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: "Teacher created" });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.delete("/teachers/:teacherId", async (req, res, next) => {
  try {
    await db.query("DELETE FROM teachers WHERE teacher_id = ?", [req.params.teacherId]);
    res.json({ success: true, message: "Teacher removed" });
  } catch (error) {
    next(error);
  }
});

router.post("/teachers/:teacherId/subjects", async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const teacherCode = req.params.teacherId;
    const subjects = normalizeSubjects(req.body && req.body.subjects);
    if (!teacherCode) {
      return res.status(400).json({ success: false, message: "teacherId is required" });
    }
    if (!subjects.length) {
      return res.status(400).json({ success: false, message: "subjects array is required" });
    }

    const [teacherRows] = await conn.query(
      `SELECT id FROM teachers WHERE teacher_id = ? LIMIT 1`,
      [teacherCode]
    );
    if (!teacherRows.length) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    const teacherPk = teacherRows[0].id;
    const activeYearId = await getActiveAcademicYearId(conn);

    await conn.beginTransaction();
    await conn.query(`DELETE FROM teacher_subject_assignments WHERE teacher_id = ?`, [teacherPk]);

    for (let i = 0; i < subjects.length; i += 1) {
      const item = subjects[i];
      const subjectId = await ensureSubject(conn, item.name, teacherPk);
      await conn.query(
        `INSERT INTO teacher_subject_assignments (teacher_id, subject_id, grade_level, academic_year_id, assigned_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [teacherPk, subjectId, item.gradeLevel || null, activeYearId]
      );
    }

    await conn.commit();
    res.json({ success: true, message: "Teacher subject assignments updated" });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.get("/grade-fees", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, fee_name, grade_level, amount, fee_type, due_date, academic_year_id
       FROM fees
       WHERE grade_level IS NOT NULL
       ORDER BY grade_level, fee_name`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/grade-fees", async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { gradeLevel, feeName, amount, dueDate, academicYearId } = req.body || {};
    if (!gradeLevel || !feeName || amount === undefined) {
      return res.status(400).json({ success: false, message: "gradeLevel, feeName and amount are required" });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    const activeYearId = academicYearId || (await getActiveAcademicYearId(conn));
    if (!activeYearId) {
      return res.status(400).json({ success: false, message: "No active academic year found" });
    }

    await conn.beginTransaction();
    const [existing] = await conn.query(
      `SELECT id FROM fees WHERE fee_name = ? AND grade_level = ? AND academic_year_id = ? LIMIT 1`,
      [feeName, gradeLevel, activeYearId]
    );

    let feeId = null;
    if (existing.length) {
      feeId = existing[0].id;
      await conn.query(
        `UPDATE fees
         SET amount = ?, due_date = ?, fee_type = 'Grade', is_mandatory = TRUE
         WHERE id = ?`,
        [numericAmount, dueDate || null, feeId]
      );
    } else {
      const [insertFee] = await conn.query(
        `INSERT INTO fees (fee_name, fee_type, amount, description, due_date, academic_year_id, is_mandatory, grade_level, created_at)
         VALUES (?, 'Grade', ?, 'Grade-level fee', ?, ?, TRUE, ?, NOW())`,
        [feeName, numericAmount, dueDate || null, activeYearId, gradeLevel]
      );
      feeId = insertFee.insertId;
    }

    await syncStudentsForFee(conn, feeId, gradeLevel, numericAmount, dueDate || null);
    await conn.commit();

    res.status(201).json({ success: true, message: "Grade fee saved", data: { feeId } });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.get("/payment-records", async (req, res, next) => {
  try {
    const status = req.query.status;
    const params = [];
    let sql = `
      SELECT p.id, p.transaction_id, u.student_id AS student_identifier,
             CONCAT(u.first_name, ' ', u.last_name) AS student_name,
             p.amount, p.status, p.payment_date, p.payment_method,
             p.student_fee_id, f.fee_name, sd.grade_level
      FROM payments p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN student_fees sf ON sf.id = p.student_fee_id
      LEFT JOIN fees f ON f.id = sf.fee_id
      LEFT JOIN student_details sd ON sd.user_id = u.id
      WHERE 1=1`;
    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }
    sql += " ORDER BY p.payment_date DESC, p.id DESC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/payment-records", async (req, res, next) => {
  try {
    const { studentId, studentName, amount, status, paymentDate, paymentMethod, studentFeeId, referenceId } = req.body || {};
    if (!studentId || !studentName || !amount) {
      return res.status(400).json({ success: false, message: "studentId, studentName and amount are required" });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    const [[user]] = await db.query(
      `SELECT id FROM users WHERE student_id = ? AND role = 'student' LIMIT 1`,
      [studentId]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    let studentFeePk = null;
    if (studentFeeId) {
      const [[feeRow]] = await db.query(
        "SELECT id FROM student_fees WHERE id = ? AND user_id = ? LIMIT 1",
        [studentFeeId, user.id]
      );
      if (feeRow) studentFeePk = feeRow.id;
    } else {
      const [[feeRow]] = await db.query(
        "SELECT id FROM student_fees WHERE user_id = ? ORDER BY outstanding_balance DESC, due_date ASC LIMIT 1",
        [user.id]
      );
      if (feeRow) studentFeePk = feeRow.id;
    }

    const transactionId = "TXN-" + Date.now();
    const paymentStatus = status || "Completed";
    const paymentDt = paymentDate || new Date();

    const [insert] = await db.query(
      `INSERT INTO payments
       (transaction_id, user_id, student_fee_id, amount, status, payment_date, payment_method, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        transactionId,
        user.id,
        studentFeePk,
        numericAmount,
        paymentStatus,
        paymentDt,
        paymentMethod || "Manual",
        referenceId || null,
      ]
    );

    if (paymentStatus === "Completed" && studentFeePk) {
      await applyPaymentToStudentFee(db, studentFeePk, numericAmount);
    }

    res.status(201).json({ success: true, message: "Payment record created", data: { id: insert.insertId } });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/:id/approve", async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const paymentId = Number(req.params.id);
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM payments WHERE id = ? FOR UPDATE", [paymentId]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    const payment = rows[0];
    if (payment.status === "Completed") {
      await conn.rollback();
      return res.json({ success: true, message: "Payment already approved" });
    }

    await conn.query(
      "UPDATE payments SET status = 'Completed', payment_date = COALESCE(payment_date, CURDATE()) WHERE id = ?",
      [paymentId]
    );

    if (payment.student_fee_id) {
      await applyPaymentToStudentFee(conn, payment.student_fee_id, payment.amount);
    }

    await conn.commit();
    res.json({ success: true, message: "Payment approved" });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post("/payments/:id/reject", async (req, res, next) => {
  try {
    const paymentId = Number(req.params.id);
    await db.query("UPDATE payments SET status = 'Failed' WHERE id = ?", [paymentId]);
    res.json({ success: true, message: "Payment rejected" });
  } catch (error) {
    next(error);
  }
});

router.get("/overview", async (req, res, next) => {
  try {
    const [[students]] = await db.query("SELECT COUNT(*) AS total_students FROM users WHERE role='student'");
    const [[teachers]] = await db.query("SELECT COUNT(*) AS total_teachers FROM users WHERE role='teacher'");
    const [[pending]] = await db.query("SELECT COUNT(*) AS pending_requests FROM registration_requests WHERE status='pending'");
    const [[paid]] = await db.query("SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE status='Completed'");
    res.json({
      success: true,
      data: {
        totalStudents: Number(students.total_students || 0),
        totalTeachers: Number(teachers.total_teachers || 0),
        pendingRequests: Number(pending.pending_requests || 0),
        totalPaid: Number(paid.total_paid || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
