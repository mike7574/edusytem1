# EduFlow Database Schema

## Overview
Complete relational database design for the EduFlow Student Management System. This schema maps all data displayed in the frontend to database tables.

---

## Tables

### 1. **Users (Students)**
Stores student profile information

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,           -- STD-2024-001
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    address VARCHAR(255),
    admission_date DATE,
    profile_photo LONGBLOB,
    status ENUM('Active', 'Inactive', 'Graduated') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Fields: Alex Morgan, STD-2024-001, alex.m@school.edu, +234-801-234-5678, March 14 2008, Female, 12 Victoria Island Lagos, Sept 1 2022

---

### 2. **Student Details**
Extended student information linked to Users

```sql
CREATE TABLE student_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    grade_level VARCHAR(50),                         -- Grade 12
    stream VARCHAR(100),                            -- Science Stream
    guardian_name VARCHAR(100),                      -- Mrs. Patricia Morgan
    guardian_phone VARCHAR(20),
    gpa DECIMAL(3, 2),                              -- 3.85
    rank INT,                                        -- #3
    credits_earned INT,                             -- 21/24
    total_credits INT,                              -- 24
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 3. **Teachers**
Instructor information

```sql
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id VARCHAR(20) UNIQUE,                  -- TEACH-001
    first_name VARCHAR(100) NOT NULL,               -- Mr., Dr., Ms.
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    title VARCHAR(50),                              -- Mr., Dr., Ms., Mrs.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Teachers Needed:
- Mr. Johnson (Mathematics)
- Dr. Williams (Physics)
- Ms. Carter (English)
- Others for Chemistry, History, Computer Science

---

### 4. **Subjects**
Academic subjects offered

```sql
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL UNIQUE,      -- Mathematics, Physics, etc.
    subject_code VARCHAR(20) UNIQUE,                -- MATH-01, PHYS-01
    description TEXT,
    teacher_id INT,
    icon VARCHAR(20),                               -- Emoji/icon
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);
```

Subjects: Mathematics, Physics, English Literature, Chemistry, History, Computer Science

---

### 5. **Academic Years**
Term and year information

```sql
CREATE TABLE academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year_label VARCHAR(20) UNIQUE NOT NULL,         -- 2025/2026
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 6. **Terms**
Subdivision of academic years

```sql
CREATE TABLE terms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year_id INT NOT NULL,
    term_number INT,                                -- 1, 2, 3, 4
    term_name VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);
```

---

### 7. **Grades/Marks**
Student scores and grades

```sql
CREATE TABLE grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject_id INT NOT NULL,
    term_id INT NOT NULL,
    score INT,                                      -- 0-100
    grade VARCHAR(5),                               -- A, A+, B+, B, etc.
    progress_percentage INT,                        -- For progress bars
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grade (user_id, subject_id, term_id)
);
```

Example Data:
- Alex Morgan: Math 92 (A), Physics 88 (A), English 94 (A), Chemistry 85 (B+), History 79 (B), CS 97 (A+)
- Term 4 Averages: Class Average 89/100, Highest 97/100, Lowest 79/100

---

### 8. **Attendance**
Daily attendance records

```sql
CREATE TABLE attendance (
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
```

Example Data:
- Overall Rate: 89%
- Days Present: 118
- Days Absent: 10 (unauthorized)
- Late Arrivals: 5
- Monthly breakdown for Sep-Feb shown in charts

---

### 9. **Schedule**
Class timetable

```sql
CREATE TABLE schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    day_of_week VARCHAR(20),                        -- Monday, Tuesday, etc.
    start_time TIME,                                -- 08:00
    end_time TIME,                                  -- 09:00
    room_location VARCHAR(100),                     -- A-101, LAB-02, B-204
    teacher_id INT,
    academic_year_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);
```

Example Data:
- Monday: Mathematics 08:00-09:00 (A-101), English 09:10-10:10 (B-204)
- Tuesday: Chemistry 08:00-09:00 (LAB-02), History 09:10-10:10 (B-101)

---

### 10. **Fees**
Fee structure and requirements

```sql
CREATE TABLE fees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fee_name VARCHAR(100) NOT NULL,                 -- Tuition, Lab, Sports, etc.
    fee_type VARCHAR(50),                           -- Annual, Per-term, Special
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    due_date DATE,
    academic_year_id INT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);
```

Example Fees:
- Tuition Fee: ₦120,000
- Exam Fee: ₦15,000
- Laboratory Fee: ₦10,000
- Sports Fee: ₦5,000
- Development Fee: ₦30,000
- Library Fee: ₦5,000
- **Total: ₦188,000**

---

### 11. **Student Fees**
Student-specific fee records

```sql
CREATE TABLE student_fees (
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
```

Example Data for Alex Morgan:
- Total Fees: ₦188,000
- Amount Paid: ₦143,000 (76%)
- Outstanding: ₦45,000 (24%)

---

### 12. **Payments**
Payment transaction history

```sql
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transactions_id VARCHAR(30) UNIQUE,             -- TXN-001, TXN-002, etc.
    user_id INT NOT NULL,
    student_fee_id INT NOT NULL,
    amount DECIMAL(10, 2),
    payment_method ENUM('Bank Transfer', 'Online Payment', 'Cash', 'Check'),
    reference_id VARCHAR(50),                       -- REF-8742
    status ENUM('Completed', 'Pending', 'Failed') DEFAULT 'Completed',
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE
);
```

Example Payment History:
1. TXN-001: Tuition Fee - Jan 10, 2026 - Bank Transfer - ₦120,000 - REF-8742
2. TXN-002: Exam Fee - Feb 1, 2026 - Online Payment - ₦15,000 - REF-3391
3. TXN-003: Library Fee - Sep 1, 2025 - Cash - ₦5,000 - REF-1102
4. TXN-004: Sports Fee (Partial) - Feb 20, 2026 - Online - ₦3,000 - REF-6618

---

### 13. **Awards & Achievements**
Student honors and recognition

```sql
CREATE TABLE awards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    award_name VARCHAR(100),
    award_icon VARCHAR(20),                         -- Emoji
    award_date DATE,
    award_type VARCHAR(50),                         -- Academic, Sports, Attendance
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Example Awards for Alex Morgan:
- 🏆 Top 10% — Term 3 (Dec 2025)
- ⭐ Perfect Attendance — Oct (Oct 2025)
- 🧮 Best in Mathematics (Nov 2025)
- 🔬 Science Olympiad Finalist (Sep 2025)

---

### 14. **Classes**
Class/Form information

```sql
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_name VARCHAR(50) UNIQUE,                  -- Grade 12, Form 6A, etc.
    form_teacher_id INT,
    academic_year_id INT NOT NULL,
    max_students INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);
```

---

### 15. **Assignments** (Optional - for future enhancement)
Class assignments and submissions

```sql
CREATE TABLE assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    title VARCHAR(200),
    description TEXT,
    due_date DATE,
    created_by INT,                                 -- Teacher ID
    academic_year_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);
```

---

## Relationships Summary

```
Users (Students)
├── Student_Details
├── Grades
│   └── Subjects
│       └── Teachers
├── Attendance
│   └── Academic_Years
├── Schedule
│   └── Subjects & Teachers
├── Student_Fees
│   ├── Fees
│   │   └── Academic_Years
│   └── Payments
└── Awards

Classes
├── Teachers
└── Users
```

---

## Key Statistics Data Points

### Dashboard Stats
- **CURRENT GPA**: 3.85 (from student_details.gpa)
- **ATTENDANCE**: 94% (calculated from attendance table)
- **PENDING FEES**: ₦45,000 (from student_fees.outstanding_balance)
- **ASSIGNMENTS DUE**: 7 total (query assignments)

### Grades Page Stats
- **CLASS AVERAGE**: 89/100 (AVG from grades table)
- **HIGHEST SCORE**: 97/100 (MAX from grades table)
- **LOWEST SCORE**: 79/100 (MIN from grades table)
- **SUBJECTS**: 6 (COUNT from subjects table)

### Attendance Page Stats
- **OVERALL RATE**: 89% (COUNT Present / Total)
- **DAYS PRESENT**: 118 (COUNT attendance WHERE status='Present')
- **DAYS ABSENT**: 10 (COUNT attendance WHERE status='Absent')
- **LATE ARRIVALS**: 5 (COUNT attendance WHERE status='Late')

### Fees Page Stats
- **TOTAL FEES**: ₦188,000 (SUM fees)
- **AMOUNT PAID**: ₦143,000 (SUM payments)
- **OUTSTANDING**: ₦45,000 (Total - Paid)
- **PERCENTAGE PAID**: 76% (Paid/Total * 100)

---

## Indexes for Performance
```sql
CREATE INDEX idx_user_id ON users(id);
CREATE INDEX idx_student_id ON users(student_id);
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_grades_student ON grades(user_id);
CREATE INDEX idx_grades_term ON grades(term_id);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, attendance_date);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_student_fees_user ON student_fees(user_id);
CREATE INDEX idx_schedule_day ON schedule(day_of_week);
```

---

## Sample Data Initialization

### Academic Year 2025/2026
```sql
INSERT INTO academic_years (year_label, start_date, end_date, is_active) 
VALUES ('2025/2026', '2025-09-01', '2026-07-31', TRUE);
```

### Terms
```sql
-- Term 1: Sep-Oct 2025
-- Term 2: Nov-Dec 2025
-- Term 3: Jan-Feb 2026
-- Term 4: Mar-Jun 2026 (CURRENT)
```

---

## Node.js Backend API Endpoints (Suggested)

```
Authentication:
POST   /api/auth/login
POST   /api/auth/logout

Students:
GET    /api/students/:id
PUT    /api/students/:id
GET    /api/students/:id/profile

Grades:
GET    /api/students/:id/grades
GET    /api/students/:id/grades/:term

Attendance:
GET    /api/students/:id/attendance
GET    /api/students/:id/attendance/:month

Fees:
GET    /api/students/:id/fees
GET    /api/students/:id/payments
POST   /api/students/:id/payments

Schedule:
GET    /api/schedule
GET    /api/students/:id/schedule

Awards:
GET    /api/students/:id/awards
```

---

## Notes for Implementation

1. **Data Validation**: Ensure scores are 0-100, percentages calculated correctly
2. **Timezone**: Store dates consistently (UTC recommended)
3. **Soft Deletes**: Consider soft delete for financial records (fees/payments)
4. **Audit Trail**: Add audit_log table for grade changes, payment corrections
5. **Notifications**: Add notifications table for fee reminders, grade releases
6. **Photo Storage**: Consider external storage (S3, Azure) for profile photos
7. **Security**: Hash passwords for user authentication
8. **Rate Limiting**: Implement on API endpoints
9. **Caching**: Cache frequently accessed data (grades, schedule)
10. **Backup**: Regular automated backups of database

