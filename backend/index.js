const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./db");

dotenv.config();

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const teacherRoutes = require("./routes/teacher");
const studentRoutes = require("./routes/student");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "EduFlow backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

async function applySchemaPatches() {
  const patches = [
    "ALTER TABLE teacher_subject_assignments ADD COLUMN grade_level VARCHAR(50) NULL AFTER subject_id",
    "ALTER TABLE teacher_subject_assignments DROP INDEX unique_teacher_subject_year",
    "ALTER TABLE teacher_subject_assignments ADD UNIQUE KEY unique_teacher_subject_grade_year (teacher_id, subject_id, grade_level, academic_year_id)",
    "ALTER TABLE fees ADD COLUMN grade_level VARCHAR(50) NULL AFTER fee_type",
    "ALTER TABLE payment_records ADD COLUMN user_id INT NULL AFTER student_identifier",
    "ALTER TABLE payment_records ADD COLUMN student_fee_id INT NULL AFTER user_id",
    "ALTER TABLE payment_records ADD CONSTRAINT fk_payment_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE payment_records ADD CONSTRAINT fk_payment_records_student_fee FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE SET NULL",
    "ALTER TABLE payments MODIFY student_fee_id INT NULL",
    "ALTER TABLE payments MODIFY payment_method VARCHAR(50)",
    "ALTER TABLE payment_records MODIFY payment_method VARCHAR(50)"
  ];

  for (const sql of patches) {
    try {
      // Some patches may already exist; swallow duplicate errors to keep startup idempotent
      await db.query(sql);
    } catch (error) {
      const duplicateCodes = ["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_CANT_DROP_FIELD_OR_KEY", "ER_ROW_IS_REFERENCED_2"];
      if (!duplicateCodes.includes(error.code)) {
        console.warn("Schema patch skipped:", error.message);
      }
    }
  }
}

async function start() {
  await applySchemaPatches().catch((err) => console.error("Schema patch failed:", err));

  const PORT = Number(process.env.PORT || 5000);
  app.listen(PORT, () => {
    console.log("EduFlow API listening on port " + PORT);
  });
}

start();
