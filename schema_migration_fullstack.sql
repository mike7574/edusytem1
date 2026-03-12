-- EduFlow migration for existing databases
-- Target: MySQL 8+
USE eduflow;

-- 1) Users table upgrades for fullstack authentication and roles
ALTER TABLE users
    MODIFY COLUMN student_id VARCHAR(20) NULL;

SET @has_col_role := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);
SET @sql_role := IF(@has_col_role = 0,
    "ALTER TABLE users ADD COLUMN role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student' AFTER student_id",
    "SELECT 1"
);
PREPARE stmt_role FROM @sql_role; EXECUTE stmt_role; DEALLOCATE PREPARE stmt_role;

SET @has_col_password_hash := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'
);
SET @sql_password_hash := IF(@has_col_password_hash = 0,
    "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER role",
    "SELECT 1"
);
PREPARE stmt_password_hash FROM @sql_password_hash; EXECUTE stmt_password_hash; DEALLOCATE PREPARE stmt_password_hash;

SET @has_col_registration_date := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'registration_date'
);
SET @sql_registration_date := IF(@has_col_registration_date = 0,
    "ALTER TABLE users ADD COLUMN registration_date DATE NULL AFTER admission_date",
    "SELECT 1"
);
PREPARE stmt_registration_date FROM @sql_registration_date; EXECUTE stmt_registration_date; DEALLOCATE PREPARE stmt_registration_date;

SET @has_col_last_login_at := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login_at'
);
SET @sql_last_login_at := IF(@has_col_last_login_at = 0,
    "ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER registration_date",
    "SELECT 1"
);
PREPARE stmt_last_login_at FROM @sql_last_login_at; EXECUTE stmt_last_login_at; DEALLOCATE PREPARE stmt_last_login_at;

SET @has_col_account_status := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'account_status'
);
SET @sql_account_status := IF(@has_col_account_status = 0,
    "ALTER TABLE users ADD COLUMN account_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' AFTER status",
    "SELECT 1"
);
PREPARE stmt_account_status FROM @sql_account_status; EXECUTE stmt_account_status; DEALLOCATE PREPARE stmt_account_status;

SET @has_col_approved_by := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'approved_by'
);
SET @sql_approved_by := IF(@has_col_approved_by = 0,
    "ALTER TABLE users ADD COLUMN approved_by INT NULL AFTER account_status",
    "SELECT 1"
);
PREPARE stmt_approved_by FROM @sql_approved_by; EXECUTE stmt_approved_by; DEALLOCATE PREPARE stmt_approved_by;

SET @has_col_approved_at := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'approved_at'
);
SET @sql_approved_at := IF(@has_col_approved_at = 0,
    "ALTER TABLE users ADD COLUMN approved_at DATETIME NULL AFTER approved_by",
    "SELECT 1"
);
PREPARE stmt_approved_at FROM @sql_approved_at; EXECUTE stmt_approved_at; DEALLOCATE PREPARE stmt_approved_at;

-- Optional: enforce NOT NULL password hashes once all users have passwords
-- UPDATE users SET password_hash = '<bcrypt_hash_here>' WHERE password_hash IS NULL;
-- ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;

-- Add check constraint (MySQL 8.0.16+)
SET @has_chk_student_identity := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND CONSTRAINT_NAME = 'chk_student_identity'
      AND CONSTRAINT_TYPE = 'CHECK'
);
SET @sql_chk_student_identity := IF(@has_chk_student_identity = 0,
    "ALTER TABLE users ADD CONSTRAINT chk_student_identity CHECK ((role = 'student' AND student_id IS NOT NULL) OR (role IN ('teacher', 'admin')))",
    "SELECT 1"
);
PREPARE stmt_chk_student_identity FROM @sql_chk_student_identity;
EXECUTE stmt_chk_student_identity;
DEALLOCATE PREPARE stmt_chk_student_identity;

-- 2) Teachers table linkage to users
SET @has_col_teachers_user_id := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'teachers'
      AND COLUMN_NAME = 'user_id'
);
SET @sql_teachers_user_id := IF(@has_col_teachers_user_id = 0,
    "ALTER TABLE teachers ADD COLUMN user_id INT UNIQUE NULL AFTER id",
    "SELECT 1"
);
PREPARE stmt_teachers_user_id FROM @sql_teachers_user_id;
EXECUTE stmt_teachers_user_id;
DEALLOCATE PREPARE stmt_teachers_user_id;

SET @has_fk_teachers_user := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'teachers'
      AND CONSTRAINT_NAME = 'fk_teachers_user'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql_fk_teachers_user := IF(@has_fk_teachers_user = 0,
    "ALTER TABLE teachers ADD CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL",
    "SELECT 1"
);
PREPARE stmt_fk_teachers_user FROM @sql_fk_teachers_user;
EXECUTE stmt_fk_teachers_user;
DEALLOCATE PREPARE stmt_fk_teachers_user;

SET @has_fk_users_approved_by := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND CONSTRAINT_NAME = 'fk_users_approved_by'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql_fk_users_approved_by := IF(@has_fk_users_approved_by = 0,
    "ALTER TABLE users ADD CONSTRAINT fk_users_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL",
    "SELECT 1"
);
PREPARE stmt_fk_users_approved_by FROM @sql_fk_users_approved_by;
EXECUTE stmt_fk_users_approved_by;
DEALLOCATE PREPARE stmt_fk_users_approved_by;

-- 3) Payments naming consistency (transactions_id -> transaction_id)
SET @has_old_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND COLUMN_NAME = 'transactions_id'
);

SET @has_new_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND COLUMN_NAME = 'transaction_id'
);

SET @rename_sql := IF(@has_old_col = 1 AND @has_new_col = 0,
    'ALTER TABLE payments RENAME COLUMN transactions_id TO transaction_id',
    'SELECT 1'
);
PREPARE stmt_rename FROM @rename_sql;
EXECUTE stmt_rename;
DEALLOCATE PREPARE stmt_rename;

-- 4) New tables for management assignments and reporting
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
    UNIQUE KEY unique_teacher_subject_year (teacher_id, subject_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS student_subject_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year_id INT,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_subject_year (user_id, subject_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS class_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    user_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_student (class_id, user_id)
);

CREATE TABLE IF NOT EXISTS generated_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_type ENUM('students', 'teachers', 'payments', 'summary') NOT NULL,
    generated_by INT,
    file_name VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(255),
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS system_activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_user_id INT,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_identifier VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS registration_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(120) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL,
    registration_number VARCHAR(30) NOT NULL,
    registration_date DATE NULL,
    grade_level VARCHAR(50) NULL,
    requested_subjects JSON NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_pending_email (email, status)
);

CREATE TABLE IF NOT EXISTS payment_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(40) NOT NULL UNIQUE,
    student_identifier VARCHAR(30) NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('Completed', 'Pending', 'Failed') DEFAULT 'Completed',
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Manual',
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5) Performance indexes
SET @has_idx_users_role := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_role'
);
SET @sql_idx_users_role := IF(@has_idx_users_role = 0, "CREATE INDEX idx_users_role ON users(role)", "SELECT 1");
PREPARE stmt_idx_users_role FROM @sql_idx_users_role; EXECUTE stmt_idx_users_role; DEALLOCATE PREPARE stmt_idx_users_role;

SET @has_idx_users_status := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_status'
);
SET @sql_idx_users_status := IF(@has_idx_users_status = 0, "CREATE INDEX idx_users_status ON users(status)", "SELECT 1");
PREPARE stmt_idx_users_status FROM @sql_idx_users_status; EXECUTE stmt_idx_users_status; DEALLOCATE PREPARE stmt_idx_users_status;

SET @has_idx_users_role_status := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_role_status'
);
SET @sql_idx_users_role_status := IF(@has_idx_users_role_status = 0, "CREATE INDEX idx_users_role_status ON users(role, status)", "SELECT 1");
PREPARE stmt_idx_users_role_status FROM @sql_idx_users_role_status; EXECUTE stmt_idx_users_role_status; DEALLOCATE PREPARE stmt_idx_users_role_status;

SET @has_idx_users_email_role_status := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email_role_status'
);
SET @sql_idx_users_email_role_status := IF(@has_idx_users_email_role_status = 0, "CREATE INDEX idx_users_email_role_status ON users(email, role, account_status)", "SELECT 1");
PREPARE stmt_idx_users_email_role_status FROM @sql_idx_users_email_role_status; EXECUTE stmt_idx_users_email_role_status; DEALLOCATE PREPARE stmt_idx_users_email_role_status;

SET @has_idx_payments_status_date := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payments_status_date'
);
SET @sql_idx_payments_status_date := IF(@has_idx_payments_status_date = 0, "CREATE INDEX idx_payments_status_date ON payments(status, payment_date)", "SELECT 1");
PREPARE stmt_idx_payments_status_date FROM @sql_idx_payments_status_date; EXECUTE stmt_idx_payments_status_date; DEALLOCATE PREPARE stmt_idx_payments_status_date;

SET @has_idx_payments_user_id := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payments_user_id'
);
SET @sql_idx_payments_user_id := IF(@has_idx_payments_user_id = 0, "CREATE INDEX idx_payments_user_id ON payments(user_id)", "SELECT 1");
PREPARE stmt_idx_payments_user_id FROM @sql_idx_payments_user_id; EXECUTE stmt_idx_payments_user_id; DEALLOCATE PREPARE stmt_idx_payments_user_id;

SET @has_idx_student_subject_user_id := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_subject_enrollments' AND INDEX_NAME = 'idx_student_subject_user_id'
);
SET @sql_idx_student_subject_user_id := IF(@has_idx_student_subject_user_id = 0, "CREATE INDEX idx_student_subject_user_id ON student_subject_enrollments(user_id)", "SELECT 1");
PREPARE stmt_idx_student_subject_user_id FROM @sql_idx_student_subject_user_id; EXECUTE stmt_idx_student_subject_user_id; DEALLOCATE PREPARE stmt_idx_student_subject_user_id;

SET @has_idx_teacher_subject_teacher_id := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teacher_subject_assignments' AND INDEX_NAME = 'idx_teacher_subject_teacher_id'
);
SET @sql_idx_teacher_subject_teacher_id := IF(@has_idx_teacher_subject_teacher_id = 0, "CREATE INDEX idx_teacher_subject_teacher_id ON teacher_subject_assignments(teacher_id)", "SELECT 1");
PREPARE stmt_idx_teacher_subject_teacher_id FROM @sql_idx_teacher_subject_teacher_id; EXECUTE stmt_idx_teacher_subject_teacher_id; DEALLOCATE PREPARE stmt_idx_teacher_subject_teacher_id;

SET @has_idx_class_enrollment_class_id := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_enrollments' AND INDEX_NAME = 'idx_class_enrollment_class_id'
);
SET @sql_idx_class_enrollment_class_id := IF(@has_idx_class_enrollment_class_id = 0, "CREATE INDEX idx_class_enrollment_class_id ON class_enrollments(class_id)", "SELECT 1");
PREPARE stmt_idx_class_enrollment_class_id FROM @sql_idx_class_enrollment_class_id; EXECUTE stmt_idx_class_enrollment_class_id; DEALLOCATE PREPARE stmt_idx_class_enrollment_class_id;

SET @has_idx_activity_logs_actor_created_at := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_activity_logs' AND INDEX_NAME = 'idx_activity_logs_actor_created_at'
);
SET @sql_idx_activity_logs_actor_created_at := IF(@has_idx_activity_logs_actor_created_at = 0, "CREATE INDEX idx_activity_logs_actor_created_at ON system_activity_logs(actor_user_id, created_at)", "SELECT 1");
PREPARE stmt_idx_activity_logs_actor_created_at FROM @sql_idx_activity_logs_actor_created_at; EXECUTE stmt_idx_activity_logs_actor_created_at; DEALLOCATE PREPARE stmt_idx_activity_logs_actor_created_at;

SET @has_idx_registration_requests_status_created := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registration_requests' AND INDEX_NAME = 'idx_registration_requests_status_created'
);
SET @sql_idx_registration_requests_status_created := IF(@has_idx_registration_requests_status_created = 0, "CREATE INDEX idx_registration_requests_status_created ON registration_requests(status, created_at)", "SELECT 1");
PREPARE stmt_idx_registration_requests_status_created FROM @sql_idx_registration_requests_status_created; EXECUTE stmt_idx_registration_requests_status_created; DEALLOCATE PREPARE stmt_idx_registration_requests_status_created;

SET @has_idx_payment_records_status_date := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_records' AND INDEX_NAME = 'idx_payment_records_status_date'
);
SET @has_tbl_payment_records := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_records'
);
SET @sql_idx_payment_records_status_date := IF(@has_tbl_payment_records = 1 AND @has_idx_payment_records_status_date = 0, "CREATE INDEX idx_payment_records_status_date ON payment_records(status, payment_date)", "SELECT 1");
PREPARE stmt_idx_payment_records_status_date FROM @sql_idx_payment_records_status_date; EXECUTE stmt_idx_payment_records_status_date; DEALLOCATE PREPARE stmt_idx_payment_records_status_date;

CREATE TABLE IF NOT EXISTS academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year_label VARCHAR(20) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS terms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year_id INT NOT NULL,
    term_number INT,
    term_name VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

SET @has_tbl_academic_years := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_years'
);
SET @sql_seed_academic_year := IF(@has_tbl_academic_years = 1,
    "INSERT IGNORE INTO academic_years (year_label, start_date, end_date, is_active, created_at) VALUES ('2026/2027', '2026-01-01', '2026-12-31', TRUE, NOW())",
    "SELECT 1"
);
PREPARE stmt_seed_academic_year FROM @sql_seed_academic_year;
EXECUTE stmt_seed_academic_year;
DEALLOCATE PREPARE stmt_seed_academic_year;

SET @has_tbl_terms := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'terms'
);
SET @sql_seed_term1 := IF(@has_tbl_academic_years = 1 AND @has_tbl_terms = 1,
    "INSERT INTO terms (academic_year_id, term_number, term_name, start_date, end_date, is_current) SELECT ay.id, 1, 'Term 1', '2026-01-01', '2026-04-30', TRUE FROM academic_years ay WHERE ay.year_label = '2026/2027' AND NOT EXISTS (SELECT 1 FROM terms t WHERE t.academic_year_id = ay.id AND t.term_name = 'Term 1')",
    "SELECT 1"
);
PREPARE stmt_seed_term1 FROM @sql_seed_term1;
EXECUTE stmt_seed_term1;
DEALLOCATE PREPARE stmt_seed_term1;
