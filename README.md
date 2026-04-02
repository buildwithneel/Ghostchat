# GhostChat MVP

## 🚀 Overview
GhostChat is a modern, privacy-first, anonymous group chat application with advanced file sharing capabilities, built specifically for speed, simplicity, and premium UI.

## 🗂️ Features
- **Instant Rooms:** Join or create rooms instantly; auto-deletes when empty.
- **Anonymous Usernames:** Randomly assigned `Ghost_XXXX`, rename available.
- **Smart File Features:** View-once files, self-destructing files with expiry timers. Password protected files.
- **Real-time UX:** Typing indicators, socket notifications, user pinning. Glassmorphism dark-mode UI.

## 🛠️ Project Structure
- `frontend/`: React + Vite + Tailwind CSS + Framer Motion
- `backend/`: Node.js + Express + Socket.IO + Multer + node-cron

---

## 💻 Setup & Run Locally

### 1. Backend Setup
1. CD into backend:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the backend:
   ```bash
   node server.js
   ```
*(Backend runs on `http://localhost:3000`)*

### 2. Frontend Setup
1. CD into frontend:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
*(Frontend runs on `http://localhost:5173`)*

---

## 📈 Deployment Guide

### Frontend Deployment (Vercel)
1. Commit the `frontend` folder to GitHub (as its own repo or a monorepo).
2. Go to **Vercel** and import the project.
3. Select the `frontend` directory as the root if it is a monorepo.
4. Vercel will auto-detect Vite. Ensure the build command is `npm run build` and output directory is `dist`.
5. Deploy. (Note: A `vercel.json` is included for SPA routing).

### Backend Deployment (Render)
1. Go to **Render** and create a New Web Service.
2. Link your GitHub repo containing the backend.
3. Select the `backend` directory as the Root Directory.
4. Use Node environment.
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Ensure to set Environment Variables in Render (`PORT=3000`).
6. Deploy.

**Important**: Once your backend is deployed, go to your `frontend/src/pages/ChatRoom.jsx` and `Home.jsx` and replace the `http://localhost:3000` URLs with your new Render backend URL.
