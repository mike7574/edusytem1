const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("student"));

async function getStudentIdentity(userId) {
  const [rows] = await db.query(
    `SELECT u.id, u.student_id, u.first_name, u.last_name, u.email, u.status,
            sd.grade_level, sd.stream, sd.gpa, sd.class_rank
     FROM users u
     LEFT JOIN student_details sd ON sd.user_id = u.id
     WHERE u.id = ? AND u.role='student'
     LIMIT 1`,
    [userId]
  );
  return rows.length ? rows[0] : null;
}

router.get("/me/summary", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await getStudentIdentity(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const fullName = [profile.first_name, profile.last_name].join(" ").trim();

    const [[attendanceAgg]] = await db.query(
      `SELECT COUNT(*) AS total_days,
              SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present_days
       FROM attendance WHERE user_id = ?`,
      [userId]
    );

    const [[feesAgg]] = await db.query(
      `SELECT COALESCE(SUM(outstanding_balance), 0) AS pending_fees
       FROM student_fees WHERE user_id = ?`,
      [userId]
    );

    const [[assignmentsAgg]] = await db.query(
      `SELECT COUNT(*) AS assignments_due
       FROM assignments
       WHERE due_date >= CURDATE()`
    );

    const [[termAgg]] = await db.query(
      `SELECT t.term_name, ay.year_label
       FROM terms t
       JOIN academic_years ay ON ay.id = t.academic_year_id
       WHERE t.is_current = TRUE
       ORDER BY t.id DESC
       LIMIT 1`
    );

    const totalDays = Number(attendanceAgg.total_days || 0);
    const presentDays = Number(attendanceAgg.present_days || 0);
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return res.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          studentId: profile.student_id,
          name: fullName,
          email: profile.email,
          status: profile.status,
          gradeLevel: profile.grade_level || "N/A",
          stream: profile.stream || "",
          gpa: profile.gpa !== null ? Number(profile.gpa) : null,
          classRank: profile.class_rank || null,
        },
        stats: {
          gpa: profile.gpa !== null ? Number(profile.gpa) : 0,
          attendancePercentage: attendancePct,
          pendingFees: Number(feesAgg.pending_fees || 0),
          assignmentsDue: Number(assignmentsAgg.assignments_due || 0),
        },
        currentTerm: {
          termName: termAgg ? termAgg.term_name : "Term 1",
          yearLabel: termAgg ? termAgg.year_label : "2026/2027",
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me/grades", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT s.subject_name,
              COALESCE(CONCAT(tch.first_name, ' ', tch.last_name), 'TBA') AS teacher_name,
              g.score,
              g.grade,
              g.progress_percentage,
              tm.term_name
       FROM grades g
       JOIN subjects s ON s.id = g.subject_id
       LEFT JOIN teachers tch ON tch.id = s.teacher_id
       JOIN terms tm ON tm.id = g.term_id
       WHERE g.user_id = ?
       ORDER BY tm.term_number DESC, s.subject_name ASC`,
      [userId]
    );

    const scores = rows.map((r) => Number(r.score || 0));
    const summary = {
      classAverage: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
      subjects: scores.length,
    };

    res.json({ success: true, data: rows, summary });
  } catch (error) {
    next(error);
  }
});

router.get("/me/attendance", async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(attendance_date, '%b') AS month_label,
              SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present_count,
              SUM(CASE WHEN status='Absent' THEN 1 ELSE 0 END) AS absent_count,
              SUM(CASE WHEN status='Late' THEN 1 ELSE 0 END) AS late_count
       FROM attendance
       WHERE user_id = ?
       GROUP BY YEAR(attendance_date), MONTH(attendance_date), DATE_FORMAT(attendance_date, '%b')
       ORDER BY YEAR(attendance_date), MONTH(attendance_date)`,
      [userId]
    );

    const [[totals]] = await db.query(
      `SELECT COUNT(*) AS total_days,
              SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present_days,
              SUM(CASE WHEN status='Absent' THEN 1 ELSE 0 END) AS absent_days,
              SUM(CASE WHEN status='Late' THEN 1 ELSE 0 END) AS late_days
       FROM attendance WHERE user_id = ?`,
      [userId]
    );

    const totalDays = Number(totals.total_days || 0);
    const presentDays = Number(totals.present_days || 0);
    const overallRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      success: true,
      summary: {
        overallRate,
        presentDays,
        absentDays: Number(totals.absent_days || 0),
        lateDays: Number(totals.late_days || 0),
      },
      monthly,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me/schedule", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT DISTINCT sch.day_of_week,
              sch.start_time,
              sch.end_time,
              sch.room_location,
              s.subject_name,
              COALESCE(CONCAT(tch.first_name, ' ', tch.last_name), 'TBA') AS teacher_name
       FROM schedule sch
       JOIN subjects s ON s.id = sch.subject_id
       JOIN student_subject_enrollments sse ON sse.subject_id = s.id
       JOIN student_details sd ON sd.user_id = sse.user_id
       JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id AND (tsa.grade_level IS NULL OR tsa.grade_level = sd.grade_level)
       LEFT JOIN teachers tch ON tch.id = tsa.teacher_id
       WHERE sse.user_id = ?
       ORDER BY FIELD(sch.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
                sch.start_time`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/me/fees", async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [feesRows] = await db.query(
      `SELECT sf.id, f.fee_name, sf.amount_due, sf.amount_paid, sf.outstanding_balance, sf.status, sf.due_date
       FROM student_fees sf
       JOIN fees f ON f.id = sf.fee_id
       WHERE sf.user_id = ?
       ORDER BY sf.due_date ASC`,
      [userId]
    );

    const [paymentRows] = await db.query(
      `SELECT p.id, p.transaction_id, p.amount, p.status, p.payment_date, p.payment_method, p.reference_id,
              f.fee_name, sf.id AS student_fee_id
       FROM payments p
       JOIN student_fees sf ON sf.id = p.student_fee_id
       JOIN fees f ON f.id = sf.fee_id
       WHERE p.user_id = ?
       ORDER BY p.payment_date DESC, p.id DESC`,
      [userId]
    );

    const totalFees = feesRows.reduce((acc, row) => acc + Number(row.amount_due || 0), 0);
    const paid = feesRows.reduce((acc, row) => acc + Number(row.amount_paid || 0), 0);
    const outstanding = feesRows.reduce((acc, row) => acc + Number(row.outstanding_balance || 0), 0);
    const paidPct = totalFees > 0 ? Math.round((paid / totalFees) * 100) : 0;

    res.json({
      success: true,
      summary: { totalFees, paid, outstanding, paidPct },
      fees: feesRows,
      payments: paymentRows,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/me/payments", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { studentFeeId, amount, paymentMethod, referenceId, paymentDate } = req.body || {};
    if (!studentFeeId || amount === undefined) {
      return res.status(400).json({ success: false, message: "studentFeeId and amount are required" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "amount must be a positive number" });
    }

    const [feeRows] = await db.query(
      `SELECT sf.id, sf.outstanding_balance
       FROM student_fees sf
       WHERE sf.id = ? AND sf.user_id = ?
       LIMIT 1`,
      [studentFeeId, userId]
    );
    if (!feeRows.length) {
      return res.status(404).json({ success: false, message: "Fee item not found" });
    }

    const transactionId = "PAY-" + Date.now();
    await db.query(
      `INSERT INTO payments
       (transaction_id, user_id, student_fee_id, amount, payment_method, reference_id, status, payment_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, NOW())`,
      [
        transactionId,
        userId,
        studentFeeId,
        numericAmount,
        paymentMethod || "Online",
        referenceId || null,
        paymentDate || new Date(),
      ]
    );

    res.status(201).json({ success: true, message: "Payment submitted for verification", data: { transactionId } });
  } catch (error) {
    next(error);
  }
});

router.get("/me/profile", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await getStudentIdentity(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const [detailsRows] = await db.query(
      `SELECT guardian_name, guardian_phone, credits_earned, total_credits
       FROM student_details
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const [awardsRows] = await db.query(
      `SELECT award_name, award_type, award_date
       FROM awards
       WHERE user_id = ?
       ORDER BY award_date DESC`,
      [userId]
    );

    const [gradeRows] = await db.query(
      `SELECT s.subject_name, g.score, g.grade
       FROM grades g
       JOIN subjects s ON s.id = g.subject_id
       WHERE g.user_id = ?
       ORDER BY g.updated_at DESC
       LIMIT 6`,
      [userId]
    );

    const details = detailsRows[0] || {};

    res.json({
      success: true,
      data: {
        user: {
          studentId: profile.student_id,
          name: [profile.first_name, profile.last_name].join(" ").trim(),
          email: profile.email,
          status: profile.status,
          gradeLevel: profile.grade_level || "N/A",
          stream: profile.stream || "",
          gpa: profile.gpa !== null ? Number(profile.gpa) : 0,
          classRank: profile.class_rank || null,
          creditsEarned: Number(details.credits_earned || 0),
          totalCredits: Number(details.total_credits || 0),
          guardianName: details.guardian_name || "N/A",
          guardianPhone: details.guardian_phone || "N/A",
        },
        grades: gradeRows,
        awards: awardsRows,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
