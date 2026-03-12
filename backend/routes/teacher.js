const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("teacher"));

function calculateGrade(score) {
  const n = Number(score);
  if (n >= 80) return "A";
  if (n >= 70) return "B";
  if (n >= 60) return "C";
  if (n >= 50) return "D";
  return "F";
}

async function getTeacherRow(userId) {
  const [rows] = await db.query("SELECT id, teacher_id, first_name, last_name FROM teachers WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] || null;
}

router.get("/me/context", async (req, res, next) => {
  try {
    const teacher = await getTeacherRow(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const [subjectRows] = await db.query(
      `SELECT s.id, s.subject_name, tsa.grade_level
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON s.id = tsa.subject_id
       WHERE tsa.teacher_id = ?`,
      [teacher.id]
    );

    const subjectIds = subjectRows.map((s) => s.id);
    const [studentRows] = subjectIds.length
      ? await db.query(
          `SELECT DISTINCT u.id, u.student_id, CONCAT(u.first_name, ' ', u.last_name) AS name, sd.grade_level AS class_name
           FROM student_subject_enrollments sse
           JOIN users u ON u.id = sse.user_id AND u.role='student'
           LEFT JOIN student_details sd ON sd.user_id = u.id
           WHERE sse.subject_id IN (?)`,
          [subjectIds]
        )
      : [[], []];

    const classSet = {};
    subjectRows.forEach((s) => {
      if (s.grade_level) classSet[s.grade_level] = true;
    });
    if (!Object.keys(classSet).length) {
      studentRows.forEach((s) => {
        if (s.class_name) classSet[s.class_name] = true;
      });
    }

    res.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          teacherId: teacher.teacher_id,
          name: `${teacher.first_name} ${teacher.last_name}`.trim(),
        },
        subjects: subjectRows.map((s) => ({ id: s.id, name: s.subject_name, gradeLevel: s.grade_level || null })),
        classes: Object.keys(classSet),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/eligible-students", async (req, res, next) => {
  try {
    const teacher = await getTeacherRow(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }
    const { className, subjectId } = req.query;

    const params = [teacher.id];
    let sql = `
      SELECT DISTINCT u.id, u.student_id, CONCAT(u.first_name, ' ', u.last_name) AS name,
             sd.grade_level AS class_name, s.id AS subject_id, s.subject_name
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON s.id = tsa.subject_id
      JOIN users u ON u.role='student'
      LEFT JOIN student_subject_enrollments sse ON sse.user_id = u.id AND sse.subject_id = s.id
      LEFT JOIN student_details sd ON sd.user_id = u.id
      WHERE tsa.teacher_id = ?
        AND (tsa.grade_level IS NULL OR sd.grade_level = tsa.grade_level)`;

    if (subjectId) {
      sql += " AND s.id = ?";
      params.push(subjectId);
    }
    if (className) {
      sql += " AND sd.grade_level = ?";
      params.push(className);
    }
    sql += " ORDER BY sd.grade_level, name";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/marks", async (req, res, next) => {
  try {
    const teacher = await getTeacherRow(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const { studentId, subjectId, className, termName, score } = req.body || {};
    if (!studentId || !subjectId || !className || !termName || score === undefined) {
      return res.status(400).json({ success: false, message: "studentId, subjectId, className, termName, score are required" });
    }

    const [authRows] = await db.query(
      `SELECT id FROM teacher_subject_assignments
       WHERE teacher_id = ? AND subject_id = ? AND (grade_level IS NULL OR grade_level = ?)
       LIMIT 1`,
      [teacher.id, subjectId, className]
    );
    if (!authRows.length) {
      return res.status(403).json({ success: false, message: "You are not assigned to this subject/grade" });
    }

    const [studentRows] = await db.query(
      `SELECT u.id
       FROM users u
       JOIN student_details sd ON sd.user_id = u.id
       WHERE u.student_id = ? AND sd.grade_level = ?
       LIMIT 1`,
      [studentId, className]
    );
    if (!studentRows.length) {
      return res.status(403).json({ success: false, message: "Student is not eligible for selected class/subject" });
    }
    const studentUserId = studentRows[0].id;

    // Ensure the student is enrolled in the subject for tracking
    await db.query(
      `INSERT IGNORE INTO student_subject_enrollments (user_id, subject_id, enrolled_at)
       VALUES (?, ?, NOW())`,
      [studentUserId, subjectId]
    );

    const [termRows] = await db.query(
      "SELECT id FROM terms WHERE term_name = ? ORDER BY id DESC LIMIT 1",
      [termName]
    );
    if (!termRows.length) {
      return res.status(400).json({ success: false, message: "Term not found. Create terms first." });
    }
    const termId = termRows[0].id;

    const grade = calculateGrade(score);
    await db.query(
      `INSERT INTO grades (user_id, subject_id, term_id, score, grade, progress_percentage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE score=VALUES(score), grade=VALUES(grade), progress_percentage=VALUES(progress_percentage), updated_at=NOW()`,
      [studentUserId, subjectId, termId, score, grade, score]
    );

    res.status(201).json({ success: true, message: "Mark saved", data: { studentId, subjectId, termName, score, grade } });
  } catch (error) {
    next(error);
  }
});

router.get("/marks", async (req, res, next) => {
  try {
    const teacher = await getTeacherRow(req.user.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const [rows] = await db.query(
      `SELECT sd.grade_level AS class_name, s.subject_name, CONCAT(u.first_name, ' ', u.last_name) AS student_name,
              u.student_id, t.term_name, g.score, g.grade, DATE(g.updated_at) AS updated_date
       FROM grades g
       JOIN users u ON u.id = g.user_id
       JOIN student_details sd ON sd.user_id = u.id
       JOIN subjects s ON s.id = g.subject_id
       JOIN terms t ON t.id = g.term_id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id AND tsa.teacher_id = ? AND (tsa.grade_level IS NULL OR tsa.grade_level = sd.grade_level)
       ORDER BY g.updated_at DESC`,
      [teacher.id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
