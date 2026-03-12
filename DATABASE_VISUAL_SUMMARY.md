# EduFlow - Database Tables Visual Summary

## All Data Fields by Table

This document provides a quick reference for all database fields organized by table.

---

## TABLE 1: USERS (Students)
**Purpose**: Store student profile information  
**Records**: 1 per student (500+ in typical school)

```
users
├─ id (INT, PRIMARY KEY)
├─ student_id (VARCHAR, UNIQUE)          [STD-2024-001]
├─ first_name (VARCHAR)                  [Alex]
├─ last_name (VARCHAR)                   [Morgan]
├─ email (VARCHAR, UNIQUE)               [alex.m@school.edu]
├─ phone_number (VARCHAR)                [+234-801-234-5678]
├─ date_of_birth (DATE)                  [2008-03-14]
├─ gender (ENUM)                         [Male/Female/Other]
├─ address (VARCHAR)                     [12 Victoria Island, Lagos]
├─ admission_date (DATE)                 [2022-09-01]
├─ profile_photo (LONGBLOB)
├─ status (ENUM)                         [Active/Inactive/Graduated]
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

---

## TABLE 2: STUDENT_DETAILS
**Purpose**: Extended student information  
**Foreign Key**: links to users.id

```
student_details
├─ id (INT, PRIMARY KEY)
├─ user_id (INT, FOREIGN KEY → users)
├─ grade_level (VARCHAR)                 [Grade 12]
├─ stream (VARCHAR)                      [Science Stream]
├─ guardian_name (VARCHAR)               [Mrs. Patricia Morgan]
├─ guardian_phone (VARCHAR)
├─ gpa (DECIMAL 3,2)                     [3.85]
├─ rank (INT)                            [3]
├─ credits_earned (INT)                  [21]
└─ total_credits (INT)                   [24]
```

---

## TABLE 3: TEACHERS
**Purpose**: Teacher/instructor profiles  
**Records**: 30-50 per school

```
teachers
├─ id (INT, PRIMARY KEY)
├─ teacher_id (VARCHAR, UNIQUE)
├─ first_name (VARCHAR)                  [Mr./Dr./Ms.]
├─ last_name (VARCHAR)                   [Johnson/Williams/Carter]
├─ email (VARCHAR, UNIQUE)
├─ phone_number (VARCHAR)
├─ title (VARCHAR)                       [Mr./Dr./Ms./Mrs.]
└─ created_at (TIMESTAMP)
```

---

## TABLE 4: SUBJECTS
**Purpose**: Course/subject catalog  
**Records**: 6-20 per school

```
subjects
├─ id (INT, PRIMARY KEY)
├─ subject_name (VARCHAR, UNIQUE)        [Mathematics, Physics, English, etc.]
├─ subject_code (VARCHAR, UNIQUE)        [MATH-01, PHYS-01]
├─ description (TEXT)
├─ teacher_id (INT, FOREIGN KEY → teachers)
├─ icon (VARCHAR)                        [📖, 🔬, etc.]
└─ created_at (TIMESTAMP)
```

**6 Subjects in System**:
1. Mathematics (Mr. Johnson)
2. Physics (Dr. Williams)
3. English Literature (Ms. Carter)
4. Chemistry (T.B.D.)
5. History (T.B.D.)
6. Computer Science (T.B.D.)

---

## TABLE 5: ACADEMIC_YEARS
**Purpose**: Track school years  
**Records**: Historical (1 per year)

```
academic_years
├─ id (INT, PRIMARY KEY)
├─ year_label (VARCHAR, UNIQUE)          [2025/2026]
├─ start_date (DATE)                     [2025-09-01]
├─ end_date (DATE)                       [2026-07-31]
├─ is_active (BOOLEAN)                   [TRUE/FALSE]
└─ created_at (TIMESTAMP)
```

---

## TABLE 6: TERMS
**Purpose**: Subdivide academic years  
**Foreign Key**: links to academic_years.id

```
terms
├─ id (INT, PRIMARY KEY)
├─ academic_year_id (INT, FK)
├─ term_number (INT)                     [1, 2, 3, 4]
├─ term_name (VARCHAR)                   [Term 1, Term 2...]
├─ start_date (DATE)
├─ end_date (DATE)
└─ is_current (BOOLEAN)                  [TRUE for Term 4]
```

**4 Terms per Year**:
```
Term 1: Sep-Oct
Term 2: Nov-Dec  
Term 3: Jan-Feb
Term 4: Mar-Jun (CURRENT)
```

---

## TABLE 7: GRADES
**Purpose**: Student marks and grades  
**Records**: 1000s (500 students × 6 subjects × 4 terms)  
**Foreign Keys**: users, subjects, terms

```
grades
├─ id (INT, PRIMARY KEY)
├─ user_id (INT, FK → users)
├─ subject_id (INT, FK → subjects)
├─ term_id (INT, FK → terms)
├─ score (INT 0-100)                     [92]
├─ grade (VARCHAR)                       [A, A+, B+, B, C...]
├─ progress_percentage (INT)             [92]
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
└─ UNIQUE(user_id, subject_id, term_id)
```

**Alex Morgan's Term 4 Grades**:
```
╔═════════════════╦────────╦───────╗
║ Subject         ║ Score  ║ Grade ║
╠═════════════════╬────────╬───────╣
║ Mathematics     ║ 92     ║ A     ║
║ Physics         ║ 88     ║ A     ║
║ English Lit.    ║ 94     ║ A     ║
║ Chemistry       ║ 85     ║ B+    ║
║ History         ║ 79     ║ B     ║
║ Computer Sci.   ║ 97     ║ A+    ║
╚═════════════════╩────────╩───────╝

Class Average: 89/100
Student Average: 89.33/100
Highest: 97
Lowest: 79
```

---

## TABLE 8: ATTENDANCE
**Purpose**: Daily attendance records  
**Records**: 50,000+ (500 students × 180 school days)  
**Foreign Keys**: users, academic_years

```
attendance
├─ id (INT, PRIMARY KEY)
├─ user_id (INT, FK → users)
├─ attendance_date (DATE)
├─ status (ENUM)                         [Present, Absent, Late]
├─ academic_year_id (INT, FK)
├─ notes (VARCHAR)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)
└─ UNIQUE(user_id, attendance_date)
```

**Alex Morgan's Statistics**:
```
Overall Rate: 89%
Days Present: 118
Days Absent: 10 (unauthorized)
Late Arrivals: 5
Total School Days: 133
```

**Monthly Breakdown**:
```
Sep: 19 Present, 1 Absent, 4 Late
Oct: 21 Present, 0 Absent, 2 Late
Nov: 18 Present, 3 Absent, 0 Late
Dec: 14 Present, 2 Absent, 2 Late
Jan: 22 Present, 0 Absent, 2 Late
Feb: 24 Present, 4 Absent, 0 Late
```

---

## TABLE 9: SCHEDULE
**Purpose**: Class timetable  
**Records**: 100-200 per school  
**Foreign Keys**: subjects, teachers, academic_years

```
schedule
├─ id (INT, PRIMARY KEY)
├─ subject_id (INT, FK → subjects)
├─ day_of_week (VARCHAR)                 [Monday-Friday]
├─ start_time (TIME)                     [08:00]
├─ end_time (TIME)                       [09:00]
├─ room_location (VARCHAR)               [A-101, LAB-02]
├─ teacher_id (INT, FK → teachers)
├─ academic_year_id (INT, FK)
└─ created_at (TIMESTAMP)
```

**Week Schedule**:
```
MONDAY
├─ Mathematics: 08:00-09:00 @ A-101
└─ English Lit.: 09:10-10:10 @ B-204

TUESDAY (Today)
├─ Chemistry: 08:00-09:00 @ LAB-02
└─ History: 09:10-10:10 @ B-101

WEDNESDAY
├─ Physics: 08:00-09:00 @ LAB-01
└─ Computer Science: 09:10-10:10 @ C-302

(Continue for Thursday, Friday...)
```

---

## TABLE 10: FEES
**Purpose**: Master fee list  
**Records**: 10-15 per school  
**Foreign Key**: academic_years

```
fees
├─ id (INT, PRIMARY KEY)
├─ fee_name (VARCHAR)                    [Tuition, Lab, Sports...]
├─ fee_type (VARCHAR)                    [Annual, Per-term, Special]
├─ amount (DECIMAL 10,2)
├─ description (TEXT)
├─ due_date (DATE)
├─ academic_year_id (INT, FK)
├─ is_mandatory (BOOLEAN)
└─ created_at (TIMESTAMP)
```

**Fee Catalog**:
```
1. Tuition Fee (Per-term): ₦120,000
2. Exam Fee (Per-term): ₦15,000
3. Laboratory Fee (Annual): ₦10,000
4. Sports Fee (Annual): ₦5,000
5. Development Fee (Annual): ₦30,000
6. Library Fee (Annual): ₦5,000
7. Technology Fee (Annual): ₦3,000

TOTAL: ₦188,000
```

---

## TABLE 11: STUDENT_FEES
**Purpose**: Student-specific fee records  
**Records**: 5,000-7,500 (500 students × 10-15 fees)  
**Foreign Keys**: users, fees

```
student_fees
├─ id (INT, PRIMARY KEY)
├─ user_id (INT, FK → users)
├─ fee_id (INT, FK → fees)
├─ status (ENUM)                         [Paid, Pending, Partial]
├─ amount_due (DECIMAL 10,2)
├─ amount_paid (DECIMAL 10,2)
├─ outstanding_balance (DECIMAL 10,2)
├─ due_date (DATE)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)
└─ UNIQUE(user_id, fee_id)
```

**Alex Morgan's Fees Status**:
```
╔──────────────────┬────────┬──────────┬─────────┬────────════╗
║ Fee Name         ║ Amount ║ Paid     ║ Balance ║ Status     ║
╠══════════════════╬════════╬══════════╬═════════╬════════════╣
║ Tuition Fee      ║ ₦120k  ║ ₦120k    ║ ₦0      ║ ✓ Paid     ║
║ Exam Fee         ║ ₦15k   ║ ₦15k     ║ ₦0      ║ ✓ Paid     ║
║ Library Fee      ║ ₦5k    ║ ₦5k      ║ ₦0      ║ ✓ Paid     ║
║ Sports Fee       ║ ₦5k    ║ ₦3k      ║ ₦2k     ║ ⚠ Partial  ║
║ Laboratory Fee   ║ ₦10k   ║ ₦0       ║ ₦10k    ║ ⏳ Pending  ║
║ Development Fee  ║ ₦30k   ║ ₦0       ║ ₦30k    ║ ⏳ Pending  ║
╠══════════════════╬════════╬══════════╬═════════╬════════════╣
║ TOTALS           ║ ₦188k  ║ ₦143k    ║ ₦45k    ║ 76% Paid   ║
╚══════════════════╩════════╩══════════╩═════════╩════════════╝
```

---

## TABLE 12: PAYMENTS
**Purpose**: Payment transaction history  
**Records**: 10,000-15,000  
**Foreign Keys**: users, student_fees

```
payments
├─ id (INT, PRIMARY KEY)
├─ transaction_id (VARCHAR, UNIQUE)      [TXN-001]
├─ user_id (INT, FK → users)
├─ student_fee_id (INT, FK → student_fees)
├─ amount (DECIMAL 10,2)
├─ payment_method (ENUM)                 [Bank Transfer, Online, Cash]
├─ reference_id (VARCHAR)                [REF-8742]
├─ status (ENUM)                         [Completed, Pending, Failed]
├─ payment_date (DATE)
└─ created_at (TIMESTAMP)
```

**Alex Morgan's Payment History**:
```
╔─────────┬──────────────────┬─────────┬──────────────┬────────════╗
║ Txn ID  ║ Fee Name         ║ Amount  ║ Method       ║ Date       ║
╠═════════╬══════════════════╬═════════╬══════════════╬════════════╣
║ TXN-001 ║ Tuition Fee      ║ ₦120k   ║ Bank Transfer║ 2026-01-10 ║
║ TXN-002 ║ Exam Fee         ║ ₦15k    ║ Online Pay   ║ 2026-02-01 ║
║ TXN-003 ║ Library Fee      ║ ₦5k     ║ Cash         ║ 2025-09-01 ║
║ TXN-004 ║ Sports Fee       ║ ₦3k     ║ Online Pay   ║ 2026-02-20 ║
╚═════════╩══════════════════╩═════════╩══════════════╩════════════╝

Total Paid: ₦143,000
Outstanding: ₦45,000
```

---

## TABLE 13: AWARDS
**Purpose**: Student achievements and recognition  
**Records**: 1,000-2,000  
**Foreign Key**: users

```
awards
├─ id (INT, PRIMARY KEY)
├─ user_id (INT, FK → users)
├─ award_name (VARCHAR)
├─ award_icon (VARCHAR)                  [🏆, ⭐, 🧮, 🔬]
├─ award_date (DATE)
├─ award_type (VARCHAR)                  [Academic, Attendance, Competition]
├─ description (TEXT)
└─ created_at (TIMESTAMP)
```

**Alex Morgan's Awards**:
```
🏆 Top 10% — Term 3
   Achieved top performer status
   Date: December 2025

⭐ Perfect Attendance — October
   100% attendance in October 2025
   Date: October 2025

🧮 Best in Mathematics
   Highest score in class
   Date: November 2025

🔬 Science Olympiad Finalist
   National competition finalist
   Date: September 2025
```

---

## TABLE 14: CLASSES
**Purpose**: Class/form information  
**Records**: 20-30 per year  
**Foreign Keys**: teachers, academic_years

```
classes
├─ id (INT, PRIMARY KEY)
├─ class_name (VARCHAR, UNIQUE)          [Grade 12, Form 6A]
├─ form_teacher_id (INT, FK → teachers)
├─ academic_year_id (INT, FK)
├─ max_students (INT)
└─ created_at (TIMESTAMP)
```

---

## TABLE 15: ASSIGNMENTS (Optional)
**Purpose**: Class assignments  
**Records**: Variable  
**Foreign Keys**: subjects, teachers, academic_years

```
assignments
├─ id (INT, PRIMARY KEY)
├─ subject_id (INT, FK → subjects)
├─ title (VARCHAR)
├─ description (TEXT)
├─ due_date (DATE)
├─ created_by (INT, FK → teachers)
├─ academic_year_id (INT, FK)
└─ created_at (TIMESTAMP)
```

**Dashboard Shows**: 7 Assignments Due (2 due this week)

---

## 📊 Complete Data Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER (STUDENT)                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ users.id = 1                                                │ │
│ │ ├─ Student ID: STD-2024-001                                 │ │
│ │ ├─ Name: Alex Morgan                                        │ │
│ │ ├─ Email: alex.m@school.edu                                 │ │
│ │ ├─ DOB: 2008-03-14                                          │ │
│ │ └─ Created: 2022-09-01                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│        ┌──────────────────┼──────────────────┐                  │
│        ↓                  ↓                  ↓                  │
│   [Details]         [Grades]           [Attendance]           │
│   GPA: 3.85         Math: 92            118 days present       │
│   Rank: #3          Physics: 88         10 days absent         │
│   Credits: 21/24    English: 94         5 late arrivals        │
│                     :                   Avg: 89%               │
│                     CS: 97 (A+)                                │
│                                                                 │
│   ┌──────────────┬──────────────┬──────────────┐               │
│   ↓              ↓              ↓              ↓               │
│ [Fees]      [Schedule]      [Payments]   [Awards]             │
│ ₦188k       Mon-Fri setup   TXN-001      🏆 Top 10%           │
│ 76% paid    9 classes       TXN-002      ⭐ Perfect Attend    │
│ ₦45k due    Per week        TXN-003      🧮 Best Math        │
│             LAB-02          TXN-004      🔬 Science Olympiad  │
│             Room A-101                                        │
│             B-204, etc.                                       │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Relationships

| From | To | Relationship | Use Case |
|------|-----|-------------|----------|
| users | student_details | 1:1 | Additional profile info |
| users | grades | 1:N | Student has many grades |
| users | attendance | 1:N | Student has attendance records |
| users | student_fees | 1:N | Student has many different fees |
| users | payments | 1:N | Student has payment history |
| users | awards | 1:N | Student can have multiple awards |
| subjects | teachers | N:1 | Many subjects taught by teacher |
| subjects | grades | 1:N | Each subject has many grades |
| subjects | schedule | 1:N | Subject appears in multiple time slots |
| terms | grades | 1:N | Each term has many grades |
| academic_years | terms | 1:N | Year contains multiple terms |
| fees | student_fees | 1:N | Fee type applied to many students |
| student_fees | payments | 1:N | One fee can have multiple payments (partial) |

---

## 🎯 Data Summary Statistics

**For Single Student (Alex Morgan)**:
- Subjects: 6
- Grades: 6 (1 per subject × 1 term shown)
- Attendance Records: 133 (1 per school day)
- Fees: 6-10 (multiple fee types)
- Payments: 4 (partial payments over time)
- Awards: 4

**For Entire School (500 students)**:
- Total Users: 500
- Total Teachers: 30-50
- Total Subjects: 15-20
- Total Grades: 48,000-60,000 (500 × 6 × 4 terms)
- Total Attendance: 55,000+ (500 × 180 days/year)
- Total Fees: 5,000-7,500 (500 × 10-15 fees)
- Total Payments: 10,000-15,000
- Total Awards: 1,000-2,000

---

## ✅ Database Creation Summary

To create the database, you need:

1. **Create the database**
   ```sql
   CREATE DATABASE eduflow_db;
   ```

2. **Create 15 tables** (see DATABASE_SCHEMA.md for full SQL)
   - Core: users, teachers, subjects, classes
   - Academic: student_details, academic_years, terms, grades, attendance, schedule
   - Financial: fees, student_fees, payments
   - Extra: awards, assignments

3. **Add relationships** (foreign keys, indexes)

4. **Insert seed data** (academic years, terms, subjects, sample students)

5. **Connect from backend** using your Node.js application

---

This summary provides a complete overview of all data stored in your EduFlow system. Refer to the detailed documentation for SQL schemas and implementation details.

