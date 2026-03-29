# AcadAlert - Academic Warning System (MERN)

AcadAlert is a full-stack academic monitoring platform built with MongoDB, Express.js, React.js, and Node.js.

It evaluates student performance using rule-based risk scoring and provides dedicated dashboards for:
- Student
- Staff
- Academic Coordinator

## Tech Stack

- Frontend: React (Vite), Bootstrap, Chart.js
- Backend: Node.js, Express.js, Mongoose
- Database: MongoDB

## Temporary Login Credentials

- Student
  - Email: keerthipriya.it23@bitsathy.ac.in
  - Password: student
- Staff
  - Email: keerthipriya0802@gmail.com
  - Password: staff
- Academic Coordinator
  - Email: keerthipriyanagarajan552@gmail.com
  - Password: coordinator

## Features

- Role-based login and route protection
- Rule-based risk scoring engine with weighted points
- Risk classification: Safe, Mild, Moderate, Severe
- Student dashboard with profile, risk breakdown, recommendations, and Chart.js performance graph
- Student meeting request submission
- Staff dashboard with filters, search, student list, meeting request management, and meeting creation
- Coordinator dashboard with full student visibility, student add/update, and risk rule management
- REST APIs for students, risk, meeting requests, and risk rule updates

## Project Structure

- server: Express API + MongoDB models + seed data
- client: React app with role-based dashboards

## Setup

### 1) Start MongoDB

Use local MongoDB on:

mongodb://127.0.0.1:27017/acadalert

### 2) Backend

```bash
cd server
npm install
npm run dev
```

Backend runs at:

http://localhost:5000

### 3) Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at:

http://localhost:5173

## Environment

Copy `server/.env.example` to `server/.env` if needed.

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/acadalert
```

## Main API Endpoints

- POST `/api/auth/login`
- GET `/api/students`
- POST `/api/students`
- PUT `/api/students/:id`
- DELETE `/api/students/:id`
- GET `/api/students/risk`
- POST `/api/meeting-request`
- GET `/api/meeting-requests`
- GET `/api/risk-rules`
- PUT `/api/risk-rules/:key`

## Notes

- Google OAuth is intentionally not implemented.
- Email alerts are intentionally not implemented.
- Seed data is generated at server startup and is idempotent.
