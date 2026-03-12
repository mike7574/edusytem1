# EduFlow Node.js Backend API Documentation

## API Structure Overview

This document provides the recommended API endpoint structure for your Node.js backend to support the EduFlow frontend.

---

## Base URL
```
http://localhost:5000/api
```

## Authentication
All requests (except login/signup) require JWT token in header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. AUTHENTICATION ENDPOINTS

### POST /auth/login
Login user and receive JWT token

**Request:**
```json
{
  "email": "alex.m@school.edu",
  "password": "12345678",
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "student_id": "STD-2024-001",
    "first_name": "Alex",
    "last_name": "Morgan",
    "email": "alex.m@school.edu",
    "role": "student"
  }
}
```

### POST /auth/logout
Logout and invalidate token

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/register
Create new student account (if enabled)

**Request:**
```json
{
  "first_name": "Alex",
  "last_name": "Morgan",
  "email": "alex.m@school.edu",
  "password": "12345678",
  "student_id": "STD-2024-001",
  "date_of_birth": "2008-03-14"
}
```

### POST /auth/forgot-password
Request password reset

---

## 2. STUDENT PROFILE ENDPOINTS

### GET /students/:id/profile
Get complete student profile

**Response:**
```json
{
  "id": 1,
  "student_id": "STD-2024-001",
  "first_name": "Alex",
  "last_name": "Morgan",
  "email": "alex.m@school.edu",
  "phone_number": "+234-801-234-5678",
  "date_of_birth": "2008-03-14",
  "gender": "Female",
  "address": "12 Victoria Island, Lagos",
  "admission_date": "2022-09-01",
  "profile_photo": "data:image/jpeg;base64,...",
  "status": "Active",
  "student_details": {
    "grade_level": "Grade 12",
    "stream": "Science Stream",
    "guardian_name": "Mrs. Patricia Morgan",
    "gpa": 3.85,
    "rank": 3,
    "credits_earned": 21,
    "total_credits": 24
  }
}
```

### PUT /students/:id/profile
Update student profile

**Request:**
```json
{
  "phone_number": "+234-801-234-5678",
  "address": "12 Victoria Island, Lagos",
  "profile_photo": "data:image/jpeg;base64,..."
}
```

### GET /students/:id/dashboard-stats
Get dashboard statistics (aggregated)

**Response:**
```json
{
  "gpa": 3.85,
  "attendance_percentage": 94,
  "pending_fees": 45000,
  "assignments_due": 7,
  "current_term": "Term 4",
  "academic_year": "2025/2026"
}
```

---

## 3. GRADES/MARKS ENDPOINTS

### GET /grades
Get all grades for authenticated student (with filters)

**Query Parameters:**
- `term_id` (optional) - Filter by term
- `academic_year_id` (optional) - Filter by academic year
- `subject_id` (optional) - Filter by subject

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "subject_id": 1,
      "subject_name": "Mathematics",
      "teacher_id": 5,
      "teacher_name": "Mr. Johnson",
      "term_id": 4,
      "term_name": "Term 4",
      "score": 92,
      "grade": "A",
      "progress_percentage": 92
    },
    {
      "id": 2,
      "subject_id": 2,
      "subject_name": "Physics",
      "teacher_id": 6,
      "teacher_name": "Dr. Williams",
      "term_id": 4,
      "term_name": "Term 4",
      "score": 88,
      "grade": "A",
      "progress_percentage": 88
    }
  ],
  "summary": {
    "class_average": 89,
    "highest_score": 97,
    "lowest_score": 79,
    "subject_count": 6,
    "average_gpa": 3.85
  },
  "total": 6
}
```

### GET /grades/:id
Get single grade details

### GET /grades/by-term/:termId
Get all grades for specific term

### GET /grades/statistics
Get grades statistics (averages, ranges, etc.)

**Response:**
```json
{
  "term_4": {
    "class_average": 89,
    "highest_score": 97,
    "lowest_score": 79,
    "student_average": 89.33,
    "rank": 3
  }
}
```

---

## 4. ATTENDANCE ENDPOINTS

### GET /attendance
Get attendance records for authenticated student

**Query Parameters:**
- `month` (optional) - Filter by month (1-12)
- `year` (optional) - Filter by year
- `start_date` (optional) - From date (YYYY-MM-DD)
- `end_date` (optional) - To date (YYYY-MM-DD)

**Response:**
```json
{
  "data": [
    {
      "date": "2026-02-01",
      "day_of_week": "Monday",
      "status": "Present",
      "academic_year": "2025/2026"
    },
    {
      "date": "2026-02-02",
      "day_of_week": "Tuesday",
      "status": "Late",
      "academic_year": "2025/2026"
    }
  ],
  "summary": {
    "overall_percentage": 89,
    "days_present": 118,
    "days_absent": 10,
    "late_arrivals": 5,
    "total_school_days": 133
  }
}
```

### GET /attendance/monthly
Get attendance by month for chart display

**Response:**
```json
{
  "months": [
    {
      "month": "Sep",
      "present": 19,
      "absent": 1,
      "late": 4,
      "total": 24
    },
    {
      "month": "Oct",
      "present": 21,
      "absent": 0,
      "late": 2,
      "total": 23
    }
  ]
}
```

### GET /attendance/summary
Get attendance summary statistics

**Response:**
```json
{
  "overall_rate": 89,
  "days_present": 118,
  "days_absent": 10,
  "late_arrivals": 5,
  "academic_year": "2025/2026"
}
```

---

## 5. SCHEDULE ENDPOINTS

### GET /schedule
Get complete class schedule for student

**Query Parameters:**
- `day` (optional) - Filter by day (Monday, Tuesday, etc.)
- `academic_year_id` (optional)

**Response:**
```json
{
  "today": {
    "day": "Tuesday",
    "date": "2026-03-03",
    "classes_count": 4,
    "classes": [
      {
        "id": 1,
        "subject_id": 3,
        "subject_name": "Chemistry",
        "teacher_id": 4,
        "teacher_name": "Dr. Chemistry Teacher",
        "start_time": "08:00",
        "end_time": "09:00",
        "room_location": "LAB-02"
      },
      {
        "id": 2,
        "subject_id": 5,
        "subject_name": "History",
        "teacher_id": 7,
        "teacher_name": "Mr. History Teacher",
        "start_time": "09:10",
        "end_time": "10:10",
        "room_location": "B-101"
      }
    ]
  },
  "weekly": [
    {
      "day": "Monday",
      "classes": [
        {
          "subject_name": "Mathematics",
          "start_time": "08:00",
          "end_time": "09:00",
          "room_location": "A-101"
        },
        {
          "subject_name": "English Literature",
          "start_time": "09:10",
          "end_time": "10:10",
          "room_location": "B-204"
        }
      ]
    }
  ]
}
```

### GET /schedule/:dayOfWeek
Get schedule for specific day

### GET /schedule/today
Get today's schedule

---

## 6. FEES ENDPOINTS

### GET /fees
Get all fees for student

**Response:**
```json
{
  "student_fees": [
    {
      "id": 1,
      "fee_name": "Tuition Fee",
      "fee_type": "Per-term",
      "amount_due": 120000,
      "amount_paid": 120000,
      "outstanding_balance": 0,
      "due_date": "2026-01-10",
      "status": "Paid"
    },
    {
      "id": 2,
      "fee_name": "Exam Fee",
      "amount_due": 15000,
      "amount_paid": 15000,
      "outstanding_balance": 0,
      "due_date": "2026-02-01",
      "status": "Paid"
    },
    {
      "id": 3,
      "fee_name": "Laboratory Fee",
      "amount_due": 10000,
      "amount_paid": 0,
      "outstanding_balance": 10000,
      "due_date": "2026-03-15",
      "status": "Pending"
    }
  ],
  "summary": {
    "total_fees": 188000,
    "amount_paid": 143000,
    "outstanding_balance": 45000,
    "percentage_paid": 76,
    "percentage_outstanding": 24
  }
}
```

### GET /fees/summary
Get fees summary for dashboard

**Response:**
```json
{
  "total_fees": 188000,
  "amount_paid": 143000,
  "outstanding_balance": 45000,
  "percentage_paid": 76
}
```

### GET /fees/pending
Get only pending fees

**Query Parameters:**
- `sort` - "due_date" or "amount"
- `limit` - Number of results (default: 10)

---

## 7. PAYMENTS ENDPOINTS

### GET /payments
Get payment history for student

**Query Parameters:**
- `start_date` (optional)
- `end_date` (optional)
- `status` (optional) - "Completed", "Pending", "Failed"
- `sort` - "-payment_date" (default), "amount"
- `page` - Pagination (default: 1)
- `limit` - Results per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "transaction_id": "TXN-001",
      "fee_name": "Tuition Fee - Term 4",
      "amount": 120000,
      "payment_date": "2026-01-10",
      "payment_method": "Bank Transfer",
      "reference_id": "REF-8742",
      "status": "Completed"
    },
    {
      "id": 2,
      "transaction_id": "TXN-002",
      "fee_name": "Exam Fee - Term 4",
      "amount": 15000,
      "payment_date": "2026-02-01",
      "payment_method": "Online Payment",
      "reference_id": "REF-3391",
      "status": "Completed"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_records": 50,
    "records_per_page": 10
  }
}
```

### POST /payments
Create new payment (initiate payment)

**Request:**
```json
{
  "student_fee_id": 3,
  "amount": 10000,
  "payment_method": "Online Payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "payment": {
    "id": 100,
    "transaction_id": "TXN-100",
    "amount": 10000,
    "status": "Pending",
    "reference_id": "REF-9999"
  }
}
```

### GET /payments/:id
Get single payment details

### GET /payments/export/statement
Download payment statement (PDF/Excel)

**Query Parameters:**
- `format` - "pdf" or "xlsx"
- `start_date` (optional)
- `end_date` (optional)

---

## 8. AWARDS/ACHIEVEMENTS ENDPOINTS

### GET /awards
Get all awards for student

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "award_name": "Top 10% — Term 3",
      "award_icon": "🏆",
      "award_type": "Academic",
      "award_date": "2025-12-01",
      "description": "Achieved top 10% in class for Term 3"
    },
    {
      "id": 2,
      "award_name": "Perfect Attendance — Oct",
      "award_icon": "⭐",
      "award_type": "Attendance",
      "award_date": "2025-10-01",
      "description": "100% attendance in October 2025"
    },
    {
      "id": 3,
      "award_name": "Best in Mathematics",
      "award_icon": "🧮",
      "award_type": "Subject",
      "award_date": "2025-11-01",
      "description": "Top scorer in Mathematics class"
    },
    {
      "id": 4,
      "award_name": "Science Olympiad Finalist",
      "award_icon": "🔬",
      "award_type": "Competition",
      "award_date": "2025-09-01",
      "description": "Finalist in National Science Olympiad"
    }
  ],
  "total": 4
}
```

### GET /awards/summary
Get awards summary (counts by type)

---

## 9. SUBJECTS ENDPOINTS (Optional - for reference)

### GET /subjects
Get all subjects offered

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "subject_name": "Mathematics",
      "subject_code": "MATH-01",
      "teacher_id": 5,
      "teacher_name": "Mr. Johnson"
    },
    {
      "id": 2,
      "subject_name": "Physics",
      "subject_code": "PHYS-01",
      "teacher_id": 6,
      "teacher_name": "Dr. Williams"
    }
  ],
  "total": 6
}
```

---

## 10. ACADEMIC YEAR ENDPOINTS (Optional)

### GET /academic-years
Get all academic years

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "year_label": "2025/2026",
      "start_date": "2025-09-01",
      "end_date": "2026-07-31",
      "is_active": true,
      "terms": [
        {
          "id": 1,
          "term_number": 1,
          "term_name": "Term 1",
          "start_date": "2025-09-01",
          "end_date": "2025-10-31"
        }
      ]
    }
  ]
}
```

### GET /academic-years/current
Get current active academic year

---

## ERROR RESPONSES

### Standard Error Format
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Email is required",
  "status_code": 400
}
```

### Common Error Codes
- **400** - Bad Request / Validation Error
- **401** - Unauthorized (Invalid/Missing token)
- **403** - Forbidden (Insufficient permissions)
- **404** - Not Found
- **422** - Unprocessable Entity
- **500** - Internal Server Error

### Authentication Error
```json
{
  "success": false,
  "error": "Authentication Error",
  "message": "Invalid credentials",
  "status_code": 401
}
```

### Not Found Error
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Student with ID 999 not found",
  "status_code": 404
}
```

---

## PAGINATION

Endpoints that return lists support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort` - Sort field (e.g., "date", "-date" for descending)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_records": 50,
    "records_per_page": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## FILTERS & SEARCH

**Common Filter Parameters:**
```
?status=Paid
?academic_year_id=1
?month=3
?sort=-date
?search=Mathematics
```

---

## RATE LIMITING

API endpoints are rate-limited:
- **Authenticated users**: 100 requests per 15 minutes
- **Public endpoints**: 20 requests per 15 minutes

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1614556800
```

---

## API RESPONSE HEADERS

All responses include:
```
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Core APIs
- [ ] Authentication (Login, Logout, Register)
- [ ] Student Profile (Get, Update)
- [ ] Grades (List, Get)
- [ ] Dashboard Stats

### Phase 2: Academic Data
- [ ] Attendance (Get, Summary, Monthly)
- [ ] Schedule (Get, Today)
- [ ] Subjects (List)
- [ ] Academic Years (Get, Current)

### Phase 3: Financial Data
- [ ] Fees (Get, Summary, Pending)
- [ ] Payments (List, Create, Get)
- [ ] Download Statement

### Phase 4: Additional Features
- [ ] Awards (Get, Summary)
- [ ] Search/Filters
- [ ] Export/Download
- [ ] Notifications
- [ ] Admin Dashboard APIs

---

## EXAMPLE NODE.JS IMPLEMENTATION

### Install Dependencies
```bash
npm install express cors dotenv jsonwebtoken bcryptjs mysql2 axios
```

### Basic Server Structure
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/awards', require('./routes/awards'));

// Error handling
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## FRONTEND INTEGRATION

### Fetch Example
```javascript
// Login
const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'alex.m@school.edu',
    password: '12345678',
    role: 'student'
  })
});

const { token, user } = await loginResponse.json();
localStorage.setItem('token', token);

// Get Dashboard Stats
const statsResponse = await fetch('http://localhost:5000/api/students/1/dashboard-stats', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const stats = await statsResponse.json();
```

### Axios Example
```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Add token to all requests
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get Grades
API.get('/grades?term_id=4').then(res => console.log(res.data));
```

