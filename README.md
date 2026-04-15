# Complete Job Portal & AI Proctoring System

Welcome to the Complete Job Portal & AI Proctoring System. This repository contains a recruitment platform that includes an Applicant Tracking System (ATS), job boards, multi-role dashboards, and a live proctoring interface.

---

## Key Features

### Main Job Portal (Candidate & Company)
* **Multi-Role Accounts:** Authentication and role-based access for Admins, Managers, and Candidates using JWT.
* **Job Board & Applications:** Managers can post and handle jobs; Candidates can apply with resume uploads.
* **ATS Integrations:** Uploaded candidate resumes are evaluated and scored by a scoring engine using pdf-parse.
* **Third-Party Test Integrations:** Ability to pull candidate assessment scores via APIs.
* **Automated Workflow Notifications:** Email handling and dashboard notifications for application status changes.
* **Cloud Storage:** Images and resumes are handled via Cloudinary.

### Live Proctoring & Interviews
* **Real-time Monitoring:** Built-in candidate proctoring using TensorFlow.js (coco-ssd) to detect multiple faces, absence of face, or switching tabs during the interview. 
* **Live WebSockets:** Bi-directional communication implemented using Socket.IO that streams live proctoring violations and interview warnings to Admin dashboards.
* **Automated Flagging & Terminations:** System tracks an Integrity Score, decrementing upon violations and terminating if limits are exceeded.
* **Chatbot & Evaluation:** Uses OpenRouter SDK to conduct conversational interviews and evaluate candidate answers based on the job role.

---

## Project Architecture

This monorepo is divided into four main projects:

1. **job-portal-backend**: The core Node.js/Express REST API serving the main Job Portal database, acting as an ATS and handling user operations.
2. **job-portal-frontend-redesigned**: The React & Vite web portal catering to candidates searching jobs, managers managing applications, and platform admins.
3. **AI-Interview-Panel-Backend**: The backend dedicated to handling the chatbot and processing live continuous proctoring updates via Socket.IO.
4. **ai-interview-frontend**: The React-based interview interface for candidates. Handles live webcams, TensorFlow object detection, and provides the answering interface.

---

## Getting Started

### Prerequisites
* Node.js (v16 or higher)
* PostgreSQL Database 
* API Keys for Cloudinary, OpenRouter, and an Email SMTP server.

### 1. Database Setup
A schema.sql dump file is provided in job-portal-backend/backend/database/. Run this script against your PostgreSQL instance to scaffold all the required tables (users, companies, jobs, applications, interview_sessions, etc.).

### 2. Job Portal Backend
```bash
cd job-portal-backend/backend
npm install
# Create a .env file containing your DB credentials, JWT_SECRET, Cloudinary keys, and Mailer keys.
npm run dev
```
*(Runs on port defined in .env, typically 5000 or 8080)*

### 3. Job Portal Frontend
```bash
cd job-portal-frontend-redesigned
npm install
npm run dev
```
*(Starts the Vite React Server for Candidate/Manager platform)*

### 4. AI Interview Backend
```bash
cd AI-Interview-Panel-Backend
npm install
# Create a .env containing OPENROUTER_API_KEY, DB credentials
npm run dev
```

### 5. AI Interview Frontend
```bash
cd ai-interview-frontend
npm install
npm run dev
```
*(Starts the Vite React Server containing TensorFlow.js logic for Candidate proctoring)*

---

## API Reference
A full breakdown of the platform's API endpoints can be found in job-portal-backend/backend/API_DOCUMENTATION.md detailing all RESTful routes and socket events.

## Contributing
Contributions, issues, and feature requests are welcome. Feel free to check the issues page.

## License
This project is licensed under the ISC License.
