# EduFlow Backend Setup (MySQL Workbench + Node.js)

## 1. Create Database in MySQL Workbench
1. Open MySQL Workbench and connect to your MySQL server.
2. Open a new SQL tab.
3. Run one of these:
   - Fresh setup: run `schema.sql`
   - Existing DB upgrade: run `schema_migration_fullstack.sql`
4. Confirm database objects:
   - schema: `eduflow`
   - tables include: `users`, `registration_requests`, `payment_records`, `student_subject_enrollments`, `teacher_subject_assignments`, `grades`, `terms`.

## 2. Configure Backend
1. Go to `backend/`.
2. Copy `.env.example` to `.env`.
3. Fill values:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `JWT_SECRET`

## 3. Install and Run Backend
```bash
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:5000/api`

Health check:
`GET http://localhost:5000/api/health`

## 4. Bootstrap First Admin (one time)
If no admin exists, call:

`POST /api/auth/bootstrap-admin`
```json
{
  "fullName": "System Admin",
  "email": "admin@eduflow.edu",
  "adminId": "ADMIN-001"
}
```

Login with:
- email: `admin@eduflow.edu`
- password: `ADMIN-001`

## 5. Account Approval Flow
1. User submits create-account form.
2. Request goes to `registration_requests` (`pending`).
3. Admin opens dashboard and approves/rejects.
4. On approval, user record is created in `users`.
5. User logs in with:
   - username/email = email
   - password = registration number (student ID / teacher ID used during registration)

## 6. Core Endpoints
- Auth:
  - `POST /api/auth/bootstrap-admin`
  - `POST /api/auth/login`
  - `POST /api/auth/register-request`
- Admin:
  - `GET /api/admin/overview`
  - `GET /api/admin/registration-requests?status=pending`
  - `POST /api/admin/registration-requests/:id/approve`
  - `POST /api/admin/registration-requests/:id/reject`
  - `GET/POST/DELETE /api/admin/students`
  - `GET/POST/DELETE /api/admin/teachers`
  - `GET/POST /api/admin/payment-records`
- Teacher:
  - `GET /api/teacher/me/context`
  - `GET /api/teacher/eligible-students`
  - `POST /api/teacher/marks`
  - `GET /api/teacher/marks`

## 7. Frontend Notes
- Frontend API base URL defaults to `http://localhost:5000/api`.
- Change it from browser console if needed:
```js
localStorage.setItem("eduflow_api_base", "http://localhost:5000/api");
```
