# EduFlow Frontend-to-Database Mapping

## Complete Data Inventory by Page

---

## Page: Login (index.html)

**Data Required:**
- User credentials (email, password)
- Role selection (Student/Teacher/Admin)

**Database Tables Needed:**
- `users` - for authentication
- `user_roles` or role column in users table

**Data Flow:**
```
POST /api/auth/login
├─ Email: alex.m@school.edu
├─ Password: [hashed]
└─ Role: Student
  → Returns: User ID, Token, User Profile
```

---

## Page: Dashboard (dashboard.html)

**Display Data:**
```
WELCOME BANNER
├─ Student Name: Alex Morgan
├─ Date: Tuesday, March 3, 2026
└─ Academic Term: Term 4 • 2025/2026

STATS CARDS
├─ CURRENT GPA: 3.85
│  └─ Source: student_details.gpa
├─ ATTENDANCE: 94%
│  └─ Source: COUNT(attendance WHERE status='Present') / Total Days
├─ PENDING FEES: ₦45,000
│  └─ Source: SUM(student_fees.outstanding_balance)
└─ ASSIGNMENTS: 7 Due
   └─ Source: COUNT(assignments WHERE due_date >= TODAY)

QUICK ACCESS LINKS
├─ Class Dashboard
├─ View Marks
├─ Check Fees
└─ Attendance
```

**Database Tables:**
- `users` - student name
- `student_details` - GPA
- `attendance` - for attendance calculation
- `student_fees` - outstanding balance
- `assignments` - due assignments
- `terms` - current term
- `academic_years` - academic year info

---

## Page: Marks & Grades (grades.html)

**Display Data:**
```
PAGE HEADER
├─ Title: Marks & Grades
├─ Term Switcher: Term 1, Term 2, Term 3, Term 4 (active)
└─ Academic Year: 2025/2026

STATS CARDS
├─ CLASS AVERAGE: 89/100
│  └─ SELECT AVG(score) FROM grades WHERE term_id = X
├─ HIGHEST SCORE: 97/100
│  └─ SELECT MAX(score) FROM grades WHERE term_id = X
├─ LOWEST SCORE: 79/100
│  └─ SELECT MIN(score) FROM grades WHERE term_id = X
└─ SUBJECTS: 6
   └─ COUNT(subjects)

RESULTS TABLE (Term 4):
┌─────────────────┬──────────────┬───────┬───────┬──────────┐
│ SUBJECT         │ TEACHER      │ SCORE │ GRADE │ PROGRESS │
├─────────────────┼──────────────┼───────┼───────┼──────────┤
│ Mathematics     │ Mr. Johnson  │ 92    │ A     │ 92%      │
│ Physics         │ Dr. Williams │ 88    │ A     │ 88%      │
│ English         │ Ms. Carter   │ 94    │ A     │ 94%      │
│ Chemistry       │ [Teacher]    │ 85    │ B+    │ 85%      │
│ History         │ [Teacher]    │ 79    │ B     │ 79%      │
│ Computer Science│ [Teacher]    │ 97    │ A+    │ 97%      │
└─────────────────┴──────────────┴───────┴───────┴──────────┘
```

**Database Query Example:**
```sql
SELECT 
    s.subject_name,
    t.first_name, t.last_name,
    g.score,
    g.grade,
    g.progress_percentage
FROM grades g
JOIN subjects s ON g.subject_id = s.id
JOIN teachers t ON s.teacher_id = t.id
WHERE g.user_id = [STUDENT_ID]
AND g.term_id = [TERM_ID]
ORDER BY s.subject_name;
```

**Database Tables:**
- `grades`
- `subjects`
- `teachers`
- `terms`
- `student_details`

---

## Page: Attendance (attendance.html)

**Display Data:**
```
PAGE HEADER
├─ Title: Attendance
└─ Academic Year: 2025/2026

STATS CARDS
├─ OVERALL RATE: 89%
│  └─ (Present Days / Total Days) × 100
├─ DAYS PRESENT: 118
│  └─ COUNT WHERE status = 'Present'
├─ DAYS ABSENT: 10
│  └─ COUNT WHERE status = 'Absent' AND authorized = FALSE
└─ LATE ARRIVALS: 5
   └─ COUNT WHERE status = 'Late'

MONTHLY ATTENDANCE CHART
├─ Sep: 80% Present, 10% Late
├─ Oct: 90% Present, 5% Late
├─ Nov: 75% Present, 15% Absent
├─ Dec: 60% Present, 10% Late
├─ Jan: 85% Present, 10% Late
└─ Feb: 82% Present, 8% Late
```

**Database Query Example:**
```sql
SELECT 
    DATE_FORMAT(attendance_date, '%b') as month,
    COUNT(CASE WHEN status='Present' THEN 1 END) as present,
    COUNT(CASE WHEN status='Late' THEN 1 END) as late,
    COUNT(CASE WHEN status='Absent' THEN 1 END) as absent
FROM attendance
WHERE user_id = [STUDENT_ID]
AND academic_year_id = [YEAR_ID]
GROUP BY MONTH(attendance_date)
ORDER BY attendance_date;
```

**Database Tables:**
- `attendance`
- `academic_years`

---

## Page: Schedule (schedule.html)

**Display Data:**
```
TODAY BANNER (Tuesday)
├─ Day: Tuesday
├─ Classes Today: 4

TODAY'S CLASSES
├─ Chemistry: 8:00 - 9:00 • LAB-02
└─ History: 9:10 - 10:10 • B-101

WEEKLY VIEW
┌──────────────────────┐
│ MONDAY               │
├──────────────────────┤
│ Mathematics          │
│ 🕒 8:00 - 9:00       │
│ 📍 A-101             │
├──────────────────────┤
│ English Literature   │
│ 🕒 9:10 - 10:10      │
│ 📍 B-204             │
└──────────────────────┘
```

**Database Query Example:**
```sql
SELECT 
    subject_id,
    s.subject_name,
    day_of_week,
    start_time,
    end_time,
    room_location
FROM schedule
WHERE teacher_id = [TEACHER_ID]
AND academic_year_id = [YEAR_ID]
ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'),
         start_time;
```

**Database Tables:**
- `schedule`
- `subjects`
- `teachers`
- `academic_years`

---

## Page: Fees & Payments (fees.html)

**Display Data:**
```
PAGE HEADER
├─ Title: Fees & Payments
├─ Subtitle: Academic Year 2025/2026
└─ Download Statement Button

STATS CARDS
├─ TOTAL FEES: ₦188,000
│  └─ SUM(student_fees.amount_due) WHERE user_id = X
├─ AMOUNT PAID: ₦143,000 (76%)
│  └─ SUM(payments.amount) WHERE user_id = X AND status = 'Completed'
└─ OUTSTANDING: ₦45,000
   └─ Total - Paid

PAYMENT OVERVIEW (Donut Chart)
├─ Paid: 76% (₦143,000) - Green
└─ Outstanding: 24% (₦45,000) - Red

QUICK PAYMENT GRID
┌──────────────────────────────────────────┐
│ Laboratory Fee                            │
│ Due: Mar 15, 2026                         │
│ Amount: ₦10,000                           │
│ [Pay Now ↗]                               │
├──────────────────────────────────────────┤
│ Sports Fee                                │
│ Due: Mar 10, 2026 [OVERDUE]               │
│ Amount: ₦5,000                            │
│ [Pay Now ↗]                               │
├──────────────────────────────────────────┤
│ Development Fee                           │
│ Due: Apr 1, 2026                          │
│ Amount: ₦30,000                           │
│ [Pay Now ↗]                               │
└──────────────────────────────────────────┘

PAYMENT HISTORY
┌─────────────────────────────────────────────┬─────────────────────┐
│ Fee Name                                    │ Amount              │
│ Date • Payment Method • Ref                 │ Transaction ID      │
├─────────────────────────────────────────────┼─────────────────────┤
│ ✓ Tuition Fee - Term 4                      │ +₦120,000           │
│   Jan 10, 2026 • Bank Transfer • REF-8742   │ TXN-001             │
├─────────────────────────────────────────────┼─────────────────────┤
│ ✓ Exam Fee - Term 4                         │ +₦15,000            │
│   Feb 1, 2026 • Online Payment • REF-3391   │ TXN-002             │
├─────────────────────────────────────────────┼─────────────────────┤
│ ✓ Library Fee - Annual                      │ +₦5,000             │
│   Sep 1, 2025 • Cash • REF-1102             │ TXN-003             │
├─────────────────────────────────────────────┼─────────────────────┤
│ ✓ Sports Fee - Partial                      │ +₦3,000             │
│   Feb 20, 2026 • Online Payment • REF-6618  │ TXN-004             │
└─────────────────────────────────────────────┴─────────────────────┘
```

**Fee Breakdown:**
- Tuition Fee: ₦120,000
- Exam Fee: ₦15,000
- Laboratory Fee: ₦10,000
- Sports Fee: ₦5,000
- Development Fee: ₦30,000
- Library Fee: ₦5,000
- **Total: ₦188,000**

**Database Query Examples:**
```sql
-- Get all fees for this academic year
SELECT 
    f.id,
    f.fee_name,
    f.amount,
    sf.due_date,
    sf.status
FROM student_fees sf
JOIN fees f ON sf.fee_id = f.id
WHERE sf.user_id = [STUDENT_ID]
AND sf.academic_year_id = [YEAR_ID];

-- Get payment history
SELECT 
    p.transactions_id,
    f.fee_name,
    p.amount,
    p.payment_date,
    p.payment_method,
    p.reference_id,
    p.status
FROM payments p
JOIN student_fees sf ON p.student_fee_id = sf.id
JOIN fees f ON sf.fee_id = f.id
WHERE p.user_id = [STUDENT_ID]
ORDER BY p.payment_date DESC;
```

**Database Tables:**
- `student_fees`
- `fees`
- `payments`
- `academic_years`

---

## Page: Profile (profile.html)

**Display Data:**
```
PROFILE CARD
├─ Cover Image (gradient background)
├─ Profile Photo: https://i.pravatar.cc/200?img=12
├─ Name: Alex Morgan
├─ Grade/Stream: Grade 12 • Science Stream
├─ Student ID Badge: STD-2024-001
├─ Status Badge: Active
└─ Mini Stats
   ├─ GPA: 3.85
   ├─ Attendance: 94%
   ├─ Rank: #3
   └─ Credits: 21/24

PERSONAL INFORMATION CARD
├─ Student ID: STD-2024-001
├─ Date of Birth: March 14, 2008
├─ Gender: Female
├─ Admission Date: September 1, 2022
├─ Email: alex.m@school.edu
├─ Phone: +234-801-234-5678
├─ Address: 12 Victoria Island, Lagos
└─ Guardian: Mrs. Patricia Morgan

CURRENT TERM GRADES (3×2 GRID)
├─ Mathematics: 92 (A)
├─ Physics: 88 (A)
├─ English Lit.: 94 (A+)
├─ Chemistry: 85 (B+)
├─ History: 79 (B)
└─ Computer Science: 97 (A+)

ACHIEVEMENTS & AWARDS
├─ 🏆 Top 10% — Term 3 (Dec 2025)
├─ ⭐ Perfect Attendance — Oct (Oct 2025)
├─ 🧮 Best in Mathematics (Nov 2025)
└─ 🔬 Science Olympiad Finalist (Sep 2025)
```

**Database Query Example:**
```sql
SELECT 
    u.*,
    sd.grade_level,
    sd.stream,
    sd.guardian_name,
    sd.gpa,
    sd.rank,
    sd.credits_earned,
    sd.total_credits
FROM users u
LEFT JOIN student_details sd ON u.id = sd.user_id
WHERE u.id = [STUDENT_ID];
```

**Database Tables:**
- `users`
- `student_details`
- `grades`
- `subjects`
- `awards`

---

## Page: Settings (settings.html)
**Status:** Placeholder (marked for future development)

**Potential Data Needed:**
- Notification preferences
- Privacy settings
- Theme preferences
- Password change
- Account settings

---

## Complete Database Object List

### Core Entities
```
✓ Users (Students)
✓ Teachers
✓ Subjects
✓ Classes
✓ Academic Years
✓ Terms
✓ Student Details
```

### Academic Records
```
✓ Grades/Marks
✓ Attendance
✓ Schedule
✓ Assignments
✓ Awards/Achievements
```

### Financial Records
```
✓ Fees (Fee Types & Amounts)
✓ Student Fees (Student + Fee linking)
✓ Payments (Payment Transactions)
```

### Supporting Tables (Recommended)
```
○ User Roles (for role-based access)
○ Notifications (for fee reminders, grade alerts)
○ Audit Log (for data changes, security)
○ Documents (for certificates, transcripts)
○ Messages (for student-teacher communication)
```

---

## Data Volume Estimates

For a single school with ~500 students:

| Table | Estimated Records |
|-------|-------------------|
| users | 500 |
| teachers | 30-50 |
| subjects | 15-20 |
| grades | 8,000-10,000 (500 × 6 subjects × 4 terms) |
| attendance | 55,000-60,000 (500 × 180 school days/year) |
| schedule | 100-200 |
| fees | 10-15 |
| student_fees | 5,000-7,500 (500 × 10-15 fees) |
| payments | 10,000-15,000 |
| awards | 1,000-2,000 |
| academic_years | 10+ (historical) |
| terms | 40+ (4 per academic year × 10 years) |

---

## Key Statistics Calculations

### GPA Calculation
```
GPA = (Sum of (Score × Credit Hours)) / Total Credit Hours
Example: 3.85 GPA for Grade 12 Science student
```

### Attendance Percentage
```
Attendance % = (Days Present / Total School Days) × 100
Example: 89% = (118 / 133) × 100
```

### Class Average
```
Class Average = Average of all student scores in a subject for a term
Example: 89/100 for Term 4
```

### Rank Calculation
```
Rank = Position of student based on GPA or total score
Example: #3 in Grade 12
```

### Payment Percentage
```
Payment % = (Amount Paid / Total Fees) × 100
Example: 76% = (₦143,000 / ₦188,000) × 100
Outstanding % = 24%
```

---

## Performance Considerations

**Indexes to Create:**
- `users.student_id` (unique lookup)
- `users.email` (authentication)
- `grades.user_id` (student grade queries)
- `grades.term_id` (term filtering)
- `attendance.user_id, attendance.attendance_date` (date range queries)
- `payments.user_id` (payment history)
- `payments.payment_date` (date filtering)
- `student_fees.user_id` (fee lookups)
- `schedule.day_of_week` (weekly view queries)

**Query Optimization:**
- Cache frequently accessed data (GPA, attendance %)
- Use materialized views for dashboard statistics
- Archive old records (academic years > 10 years)
- Batch process bulk updates

---

## Integration Checklist

- [ ] Create all 15 database tables
- [ ] Add indexes to frequently queried columns
- [ ] Implement authentication system
- [ ] Create RESTful API endpoints
- [ ] Add data validation on backend
- [ ] Set up error handling
- [ ] Implement pagination for large result sets
- [ ] Add rate limiting to API
- [ ] Set up database backups
- [ ] Configure user permissions/roles
- [ ] Add API documentation
- [ ] Implement logging and monitoring

