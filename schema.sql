-- EduFlow database schema generated from DATABASE_SCHEMA.md
-- Run this script in your MySQL (or MariaDB/PostgreSQL with minor syntax tweaks) server

CREATE DATABASE IF NOT EXISTS eduflow;
USE eduflow;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE,
    role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    address VARCHAR(255),
    admission_date DATE,
    registration_date DATE,
    last_login_at DATETIME NULL,
    profile_photo LONGBLOB,
    status ENUM('Active', 'Inactive', 'Graduated') DEFAULT 'Active',
    account_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    approved_by INT NULL,
    approved_at DATETIME NULL,
    CONSTRAINT chk_student_identity
        CHECK (
            (role = 'student' AND student_id IS NOT NULL) OR
            (role IN ('teacher', 'admin'))
        ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Student Details
CREATE TABLE IF NOT EXISTS student_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    grade_level VARCHAR(50),
    stream VARCHAR(100),
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    gpa DECIMAL(3, 2),
    class_rank INT,
    credits_earned INT,
    total_credits INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Teachers
CREATE TABLE IF NOT EXISTS teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    teacher_id VARCHAR(20) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    title VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL UNIQUE,
    subject_code VARCHAR(20) UNIQUE,
    description TEXT,
    teacher_id INT,
    icon VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- 5. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year_label VARCHAR(20) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Terms
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

-- 7. Grades/Marks
CREATE TABLE IF NOT EXISTS grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject_id INT NOT NULL,
    term_id INT NOT NULL,
    score INT,
    grade VARCHAR(5),
    progress_percentage INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grade (user_id, subject_id, term_id)
);

-- 8. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late'),
    academic_year_id INT NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (user_id, attendance_date)
);

-- 9. Schedule
CREATE TABLE IF NOT EXISTS schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    day_of_week VARCHAR(20),
    start_time TIME,
    end_time TIME,
    room_location VARCHAR(100),
    teacher_id INT,
    academic_year_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 10. Fees
CREATE TABLE IF NOT EXISTS fees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fee_name VARCHAR(100) NOT NULL,
    fee_type VARCHAR(50),
    grade_level VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    due_date DATE,
    academic_year_id INT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 11. Student Fees
CREATE TABLE IF NOT EXISTS student_fees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    fee_id INT NOT NULL,
    status ENUM('Paid', 'Pending', 'Partial') DEFAULT 'Pending',
    amount_due DECIMAL(10, 2),
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    outstanding_balance DECIMAL(10, 2),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_fee (user_id, fee_id)
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(30) UNIQUE,
    user_id INT NOT NULL,
    student_fee_id INT NULL,
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    reference_id VARCHAR(50),
    status ENUM('Completed', 'Pending', 'Failed') DEFAULT 'Completed',
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE
);

-- 13. Awards & Achievements
CREATE TABLE IF NOT EXISTS awards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    award_name VARCHAR(100),
    award_icon VARCHAR(20),
    award_date DATE,
    award_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Classes
CREATE TABLE IF NOT EXISTS classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_name VARCHAR(50) UNIQUE,
    form_teacher_id INT,
    academic_year_id INT NOT NULL,
    max_students INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 15. Assignments (optional)
CREATE TABLE IF NOT EXISTS assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    title VARCHAR(200),
    description TEXT,
    due_date DATE,
    created_by INT,
    academic_year_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 16. Teacher Subject Assignments
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    grade_level VARCHAR(50),
    academic_year_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
    UNIQUE KEY unique_teacher_subject_grade_year (teacher_id, subject_id, grade_level, academic_year_id)
);

-- 17. Student Subject Enrollments
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

-- 18. Class Enrollments
CREATE TABLE IF NOT EXISTS class_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    user_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_student (class_id, user_id)
);

-- 19. Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_type ENUM('students', 'teachers', 'payments', 'summary') NOT NULL,
    generated_by INT,
    file_name VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(255),
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 20. System Activity Logs
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

-- 21. Registration Requests (awaiting admin approval)
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

-- 22. Backend Payment Records (admin-entered payment history)
CREATE TABLE IF NOT EXISTS payment_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(40) NOT NULL UNIQUE,
    student_identifier VARCHAR(30) NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('Completed', 'Pending', 'Failed') DEFAULT 'Completed',
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Manual',
    user_id INT NULL,
    student_fee_id INT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE SET NULL
);

-- Authentication and role lookup indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_email_role_status ON users(email, role, account_status);
CREATE INDEX idx_payments_status_date ON payments(status, payment_date);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_student_subject_user_id ON student_subject_enrollments(user_id);
CREATE INDEX idx_teacher_subject_teacher_id ON teacher_subject_assignments(teacher_id);
CREATE INDEX idx_class_enrollment_class_id ON class_enrollments(class_id);
CREATE INDEX idx_activity_logs_actor_created_at ON system_activity_logs(actor_user_id, created_at);
CREATE INDEX idx_registration_requests_status_created ON registration_requests(status, created_at);
CREATE INDEX idx_payment_records_status_date ON payment_records(status, payment_date);

-- Seed minimal academic context for teacher marks workflow
INSERT IGNORE INTO academic_years (year_label, start_date, end_date, is_active, created_at)
VALUES ('2026/2027', '2026-01-01', '2026-12-31', TRUE, NOW());

INSERT INTO terms (academic_year_id, term_number, term_name, start_date, end_date, is_current)
SELECT ay.id, 1, 'Term 1', '2026-01-01', '2026-04-30', TRUE
FROM academic_years ay
WHERE ay.year_label = '2026/2027'
AND NOT EXISTS (
    SELECT 1 FROM terms t WHERE t.academic_year_id = ay.id AND t.term_name = 'Term 1'
);

-- Add indexes or seed data below as needed
