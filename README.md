# 🚀 Complete Job Portal & AI Proctoring System

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-%23FF6F00.svg?style=for-the-badge&logo=TensorFlow&logoColor=white)

Welcome to the **Complete Job Portal & AI Proctoring System**! This repository is a comprehensive, end-to-end recruitment platform designed to modernize the hiring process. Built with cutting-edge technologies, it brings together an intelligent Applicant Tracking System (ATS), job boards, multi-role dashboards, and a robust real-time Live AI Proctoring interface.

---

## 🌟 Key Features

### 💼 Main Job Portal (Candidate & Company)
* **Multi-Role Accounts:** Secure authentication and role-based access for Admins, Managers, and Candidates using JWT.
* **Job Board & Applications:** Managers can post and handle jobs; Candidates can apply with one-click resume uploads.
* **Mistral-7B ATS Integrations:** Uploaded candidate resumes are evaluated and scored in real-time by a Mistral-7B powered scoring engine using `pdf-parse`.
* **Third-Party Test Integrations:** Ability to pull candidate assessment scores immediately via secure APIs.
* **Automated Workflow Notifications:** Email handling and instant dashboard notifications for application status changes.
* **Cloud Storage:** Images and Resumes are securely handled via Cloudinary.

### 🤖 AI-Powered Live Proctoring & Interviews
* **Real-time Monitoring:** Built-in candidate proctoring using TensorFlow.js (`coco-ssd`) to detect multiple faces, absence of face, or switching tabs during the interview. 
* **Live WebSockets:** Bi-directional communication implemented using Socket.IO that streams live proctoring violations and interview warnings directly to Admin dashboards.
* **Automated Flagging & Terminations:** System autonomously tracks an "Integrity Score", decrementing upon violations and auto-terminating if limits are exceeded.
* **AI Chatbot & Evaluation:** Uses OpenRouter SDK to conduct conversational AI interviews dynamically and evaluate Candidate answers based on the job role.

---

## 🏛️ Project Architecture

This monorepo is divided into four main projects:

1. **`job-portal-backend`**: The core Node.js/Express REST API serving the main Job Portal database, acting as an ATS and handling user operations.
2. **`job-portal-frontend-redesigned`**: The React & Vite web portal (TailwindCSS) catering to candidate searching jobs, managers managing applications, and platform admins.
3. **`AI-Interview-Panel-Backend`**: The backend dedicated strictly to handling the AI chatbot and processing live continuous proctoring updates via Socket.IO.
4. **`ai-interview-frontend`**: The React-based interview interface for candidates. Handles live webcams, TensorFlow object detection, and provides the actual AI answering interface.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16 or higher)
* **PostgreSQL** Database 
* API Keys for Cloudinary, OpenRouter (for Mistral/AI models), and an Email SMTP server.

### 1. Database Setup
A `schema.sql` dump file is provided in `job-portal-backend/backend/database/`. Run this script against your local or hosted PostgreSQL instance to scaffold all the required tables (`users`, `companies`, `jobs`, `applications`, `interview_sessions`, etc.).

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

## 📚 API Reference
A full comprehensive breakdown of the platform's API endpoints can be found in `job-portal-backend/backend/API_DOCUMENTATION.md` detailing all RESTful routes and socket events.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the ISC License.
