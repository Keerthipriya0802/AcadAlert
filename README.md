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

## Deployment (Render)

This repository can be deployed as:

- Backend Web Service (Node/Express)
- Frontend Static Site (Vite)

### 1) Prerequisites

- Push this project to GitHub.
- Create a MongoDB Atlas database and copy the connection string.

### 2) One-Click Blueprint (Recommended)

Use the included `render.yaml` in the repo root.

It creates:

- `acadalert-api` (backend)
- `acadalert-web` (frontend static site)

### 3) Required Environment Variables

For backend service (`acadalert-api`):

- `MONGO_URI` = your Atlas Mongo URI
- `PORT` is provided by Render automatically

Optional (only if Firebase login is used):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

For frontend service (`acadalert-web`):

- `VITE_API_URL` should point to your backend URL + `/api`
- Example: `https://acadalert-api.onrender.com/api`

### 4) Manual Render Setup (If not using blueprint)

Backend:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

Frontend:

- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Add SPA rewrite from `/*` to `/index.html`

### 5) Local Production Preview

Frontend:

```bash
cd client
npm run build
npm run preview
```

Backend:

```bash
cd server
npm start
```

## Deployment (Recommended Hybrid: Vercel + Render)

Use this option for fastest and most stable deployment with current code:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### 1) Deploy Backend on Render

You can use the existing `render.yaml` or create service manually.

Required backend env var:

- `MONGO_URI`

Optional Firebase env vars (only if needed):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

After deploy, copy backend URL:

- Example: `https://acadalert-api.onrender.com`

### 2) Deploy Frontend on Vercel

In Vercel project settings:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

Set frontend env var:

- `VITE_API_URL=https://<your-render-backend>/api`

This repo includes `client/vercel.json` rewrite rules for React routes.

### 3) Final Check

- Open frontend URL
- Log in with student/staff/coordinator accounts
- Verify API calls and dashboard data loading
