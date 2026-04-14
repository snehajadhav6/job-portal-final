# Comprehensive Backend API Endpoints Documentation

This document contains the complete specifications for all API endpoints in the backend. These endpoints cover Authentication, User/Candidate operations, Company/Manager operations, Job Postings, Applications, ATS Evaluation, Proctoring, and Administration.

## Table of Contents
1. [Authentication API](#1-authentication-api-auth)
2. [Candidate / User API](#2-candidate--user-api-users)
3. [Manager / Company API](#3-manager--company-api-company)
4. [Jobs API](#4-jobs-api-jobs)
5. [Applications & ATS API](#5-applications--ats-api-applications)
6. [Live Proctoring API](#6-live-proctoring-api-apiproctoring)
7. [Admin API](#7-admin-api-admin)
8. [Resume API](#8-resume-api-apiresume)

---

## 1. Authentication API (`/auth`)

### Register
**Endpoint:** `POST /auth/register`
**Content-Type:** `application/json`
**Body:** `{ "name", "email", "password", "role" }` (Roles can be `client`, `manager`, `admin`)
**Response:** `201 Created`

### Login
**Endpoint:** `POST /auth/login`
**Content-Type:** `application/json`
**Body:** `{ "email", "password" }`
**Response (Success 200):** JWT Token and user details.

### Reset Password
**Endpoint:** `POST /auth/reset-password`
**Content-Type:** `application/json`
**Body:** `{ "email", "newPassword" }`
**Response:** `200 OK`

### Get Current User
**Endpoint:** `GET /auth/me`
**Headers:** `Authorization: Bearer <JWT>`
**Response:** `200 OK` User profile data.

### Get Notifications
**Endpoint:** `GET /auth/notifications`
**Headers:** `Authorization: Bearer <JWT>`
**Response:** `200 OK` Array of user notifications.

---

## 2. Candidate / User API (`/users`)
*Requires `client` role and Authentication.*

### Get Profile
**Endpoint:** `GET /users/profile`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Response:** `200 OK` Returns complete user profile.

### Update Profile
**Endpoint:** `PUT /users/profile`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Content-Type:** `multipart/form-data`
**Body:** Profile fields + optional `resume` file.
**Response:** `200 OK` Updated profile.

### Get Dashboard Stats
**Endpoint:** `GET /users/dashboard-stats`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Response:** `200 OK` Counts for total applications, pending, shortlisted, etc.

---

## 3. Manager / Company API (`/company`)
*Requires `manager` role and Authentication (some endpoints also accessible by `admin`).*

### Send Interview Link
**Endpoint:** `POST /company/send-interview-link/:user_id` (Manager/Admin)
**Headers:** `Authorization: Bearer <JWT>`
**Response:** `200 OK` Email notification triggered.

### Get Interview Results
**Endpoint:** `GET /company/interview-results/:user_id` (Manager/Admin)
**Headers:** `Authorization: Bearer <JWT>`
**Response:** `200 OK` Returns candidate interview feedback.

### Get Company Profile
**Endpoint:** `GET /company/profile` or `GET /company/my-company`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK` Returns the company profile.

### Update Company Profile
**Endpoint:** `PUT /company/profile`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Content-Type:** `multipart/form-data`
**Body:** Company fields + optional `logo` file.
**Response:** `200 OK` Updated company profile.

### Get My Jobs
**Endpoint:** `GET /company/jobs`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK` Jobs fully posted by the authenticated company.

### Dashboard Stats
**Endpoint:** `GET /company/dashboard-stats`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK` Provides aggregated metrics for manager dashboard.

### Schedule Interview
**Endpoint:** `PATCH /company/schedule-interview/:id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK`

### Reject Candidate
**Endpoint:** `PATCH /company/reject-candidate/:id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK`

---

## 4. Jobs API (`/jobs`)

### Get All Jobs
**Endpoint:** `GET /jobs`
**Response:** `200 OK` Array of all listed active jobs (Public).

### Get Job Details
**Endpoint:** `GET /jobs/:id`
**Response:** `200 OK` Detail object of a single job (Public).

### Create Job
**Endpoint:** `POST /jobs`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Content-Type:** `application/json`
**Body:** Job posting details (title, description, requirements, etc.)
**Response:** `201 Created`

### Update Job
**Endpoint:** `PUT /jobs/:id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK`

### Update Job Status
**Endpoint:** `PATCH /jobs/:id/status`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK`

### Delete Job
**Endpoint:** `DELETE /jobs/:id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK`

---

## 5. Applications & ATS API (`/applications`)

### Get My Applications (Candidate)
**Endpoint:** `GET /applications/my`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Response:** `200 OK` Retrieves the candidate's applications list.

### Get Applications For Job (Manager)
**Endpoint:** `GET /applications/job/:id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Response:** `200 OK` List of received applications for the specified job.

### Update Application Status (Manager)
**Endpoint:** `PUT /applications/:id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Content-Type:** `application/json`
**Body:** `{ "status": "new_status" }`
**Response:** `200 OK`

---

### Apply For Job (Triggers Mistral ATS Evaluation)
Used by candidates to submit their application. The backend halts until Mistral-7B scores the PDF before responding.

**Endpoint:** `POST /applications` or `POST /applications/apply-job`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Content-Type:** `multipart/form-data`

**Request Format:**
```javascript
// Form-Data
job_id: 1                       // (Required) Integer
resume: File                    // (Required) Valid PDF, JPG, or PNG string (Max: 5MB)
cover_letter: "string"          // (Optional) Text
college_name: "string"          // (Optional) Text
cgpa: 3.8                       // (Optional) Decimal
willing_to_relocate: true       // (Optional) Boolean
experience_years: 2             // (Optional) Integer
```

**Response (Success 201):**
```json
{
  "message": "Application submitted successfully",
  "applicationId": 5,
  "ats_score": 75,
  "status": "shortlisted",      // Will be 'shortlisted' (>=70) or 'rejected' (<70)
  "candidate_name": "Sneha",
  "job_role": "Backend Developer"
}
```

---

### Update Assessment Score 
Used securely by the third-party coding platform (`assessment.shnoor.com`) to instantly push candidate scores right back into your backend. This auto-switches the application status to `test_completed`.

**Endpoint:** `POST /applications/update-test-score`
**Content-Type:** `application/json`

**Request Format:**
```json
{
  "application_id": 5,          // The ID of the application
  "test_score": 92.5            // Any Integer or Decimal score
}
```

**Response (Success 200):**
```json
{
  "candidate_name": "Sneha",
  "job_role": "Backend Developer",
  "ats_score": 75.00,
  "test_score": 92.5,
  "status": "test_completed"
}
```

---

### Manager Approve For Interview
Used by your Manager frontend Dashboard to manually bump a tested candidate into the final interview stage. It shoots off the "Interview Shortlist" confirmation email instantly.

**Endpoint:** `PATCH /applications/manager-approve/:application_id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Content-Type:** `application/json`

*(No Body required. Just pass the `application_id` directly in the URL!)*

**Response (Success 200):**
```json
{
  "candidate_name": "Sneha",
  "job_role": "Backend Developer",
  "ats_score": 75.00,
  "test_score": 92.5,
  "status": "interview_ready",
  "message": "Candidate approved for interview successfully"
}
```

---

## 6. Live Proctoring API (`/api/proctoring`)

### Live Proctoring: Start Session
Used by the frontend to initialize a candidate's live proctoring session, set the integrity score to 100, and ensure readiness for monitoring.

**Endpoint:** `POST /api/proctoring/start-session`
**Content-Type:** `application/json`

**Request Format:**
```json
{
  "candidateId": 1
}
```

**Response (Success 200):**
```json
{
  "message": "Session started successfully",
  "sessionId": 5
}
```

---

### Live Proctoring: Report Violation
Hit by the client-side AI/monitoring scripts to report negative behaviors (e.g., leaving the tab, no face detected, etc.) during an active interview. This dynamically reduces the session's integrity score and saves an audit log.

**Endpoint:** `POST /api/proctoring/report-violation`
**Content-Type:** `application/json`

**Request Format:**
```json
{
  "candidateId": 1,
  "sessionId": 5,
  "violationType": "TAB_SWITCH" // Options: 'TAB_SWITCH', 'FACE_NOT_DETECTED', 'CAMERA_OFF', 'MULTIPLE_FACES'
}
```

**Response (Success 200):**
```json
{
  "message": "Violation reported",
  "integrityScore": 90
}
```
*(If violations trigger more than 3 warnings, this endpoint will automatically terminate the interview).*

---

### Admin/Manager: Send Warning
Used by Admin/Proctor via the Live Dashboard to explicitly send a warning notification to a candidate's screen. If the warning cap (3) is exceeded, the interview is forcefully terminated.

**Endpoint:** `POST /api/proctoring/send-warning`
**Headers:** `Authorization: Bearer <Admin_Manager_JWT>`
**Content-Type:** `application/json`

**Request Format:**
```json
{
  "candidateId": 1,
  "sessionId": 5
}
```

**Response (Success 200):**
```json
{
  "message": "Warning sent",
  "warningNumber": 1
}
```

---

### Admin/Manager: Terminate Interview
Used by Admin/Proctor to explicitly and instantaneously terminate a candidate's live interview session due to extreme violations.

**Endpoint:** `POST /api/proctoring/terminate-interview`
**Headers:** `Authorization: Bearer <Admin_Manager_JWT>`
**Content-Type:** `application/json`

**Request Format:**
```json
{
  "candidateId": 1,
  "sessionId": 5
}
```

**Response (Success 200):**
```json
{
  "message": "Interview terminated",
  "reason": "ADMIN_TERMINATED"
}
```

---

### Admin/Manager: Get Live Candidates
Fetches an aggregated list of all currently active proctoring sessions for the Admin/Manager dashboard, complete with violation metrics.

**Endpoint:** `GET /api/proctoring/live-candidates`
**Headers:** `Authorization: Bearer <Admin_Manager_JWT>`

**Response (Success 200):**
```json
[
  {
    "session_id": 5,
    "candidate_id": 1,
    "candidate_name": "Sneha",
    "email": "sneha@example.com",
    "status": "ACTIVE",
    "integrity_score": 90,
    "start_time": "2023-10-15T10:00:00.000Z",
    "violation_count": 1,
    "warnings_count": 0
  }
]
```

---

### Admin/Manager: Get Session Summary
Provides a comprehensive overview of a candidate's concluded session—detailing final scores, AI recommendations, all registered warnings, and a breakdown of categorized violations.

**Endpoint:** `GET /api/proctoring/session-summary/:candidateId`
**Headers:** `Authorization: Bearer <Admin_Manager_JWT>`

*(No Body required. Pass `candidateId` as URL parameter).*

**Response (Success 200):**
```json
{
  "candidateName": "Sneha",
  "status": "TERMINATED",
  "integrityScore": 65,
  "totalViolations": 3,
  "violationBreakdown": [
    {
      "violation_type": "TAB_SWITCH",
      "count": 2
    },
    {
      "violation_type": "FACE_NOT_DETECTED",
      "count": 1
    }
  ],
  "warningsCount": 2,
  "terminationReason": "MAX_WARNINGS_EXCEEDED",
  "startTime": "2023-10-15T10:00:00.000Z",
  "endTime": "2023-10-15T10:45:00.000Z",
  "duration": 2700,
  "questionsAsked": 5,
  "questionsAnswered": 5,
  "averageScore": 8.5,
  "overallScore": 85,
  "aiRecommendation": "HIRE",
  "summary": "Candidate demonstrated strong backend skills..."
}
```

---

## 7. Admin API (`/admin`)
*Requires `admin` role and Authentication.*

### Get System Stats
**Endpoint:** `GET /admin/stats`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK` Aggregated system-wide statistics for the admin dashboard.

### Get All Users
**Endpoint:** `GET /admin/users`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK` List of all registered users.

### Get All Companies
**Endpoint:** `GET /admin/companies`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK` Array of registered companies.

### Get All Jobs
**Endpoint:** `GET /admin/jobs`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK` Unfiltered list of all jobs across the platform.

### Approve Company
**Endpoint:** `PUT /admin/companies/:id/approve`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK` Sets company approval status to active.

### Update User Status
**Endpoint:** `PUT /admin/users/:id/status`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK` Enables admin to toggle candidate's active/banned status.

### Update Company Status
**Endpoint:** `PUT /admin/companies/:id/status`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK`

### Update Job Status
**Endpoint:** `PUT /admin/jobs/:id/status`
**Headers:** `Authorization: Bearer <Admin_JWT>`
**Response:** `200 OK`

---

## 8. Resume API (`/api/resume`)
*Requires `client` role and Authentication.*

### Upload Resume
**Endpoint:** `POST /api/resume/upload`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Content-Type:** `multipart/form-data`
**Body:** File payload mimicking an application upload.
**Response:** Routes back to the ATS evaluation flow internally.
