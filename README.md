<div align="center">

# 👻 GhostChat

### *Privacy-First. Anonymous. Real-Time.*

**An ephemeral group chat application with self-destructing files, zero logins, and a premium glassmorphism UI.**

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Live Demo](#) · [Report Bug](https://github.com/buildwithneel/Ghostchat/issues) · [Request Feature](https://github.com/buildwithneel/Ghostchat/issues)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🕵️ **Zero Login** | Jump straight into a chat room — no sign-up, no tracking |
| 👻 **Anonymous Identities** | Auto-assigned `Ghost_XXXX` usernames, rename anytime |
| 🚀 **Instant Rooms** | Create or join a room with a single code; rooms auto-delete when empty |
| 💬 **Real-Time Messaging** | Powered by Socket.IO for blazing-fast, live communication |
| 📁 **Smart File Sharing** | Upload files with expiry timers, view-once locks, and self-destruct modes |
| 🔒 **Password-Protected Files** | Add an optional password to any shared file |
| ⌨️ **Typing Indicators** | See when others are typing in real time |
| 🎨 **Glassmorphism UI** | A stunning dark-mode UI with smooth Framer Motion animations |
| 🧹 **Auto-Cleanup** | Expired files and inactive rooms are purged automatically via cron jobs |

---

## 🛠️ Tech Stack

**Frontend**
- ⚛️ [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- 🎞️ [Framer Motion](https://www.framer.com/motion/) for animations
- 🎨 Glassmorphism CSS with custom design system

**Backend**
- 🟢 [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- 🔌 [Socket.IO](https://socket.io/) for real-time WebSockets
- 📦 [Multer](https://github.com/expressjs/multer) for file uploads
- ⏱️ [node-cron](https://github.com/kelektiv/node-cron) for scheduled cleanup jobs
- 🔐 [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing

---

## 📁 Project Structure

```
ghostchat/
├── backend/
│   ├── controllers/        # Room & file logic
│   ├── routes/             # Express API routes
│   ├── socket/             # Socket.IO event handlers
│   ├── utils/              # Helper utilities
│   ├── .env.example        # Environment variable template
│   └── server.js           # App entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page-level components
│   │   └── utils/          # Frontend utilities
│   └── index.html
│
├── render.yaml             # Render.com deployment config
└── README.md
```

---

## 💻 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### 1. Clone the Repository

```bash
git clone https://github.com/buildwithneel/Ghostchat.git
cd Ghostchat
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Start the backend server:

```bash
npm start
```

> ✅ Backend runs at `http://localhost:3000`

### 3. Frontend Setup

Open a **new terminal** window:

```bash
cd frontend
npm install
npm run dev
```

> ✅ Frontend runs at `http://localhost:5173`

---

## 🚀 Deployment

### Backend → [Render](https://render.com)

GhostChat's backend requires a **persistent server** due to WebSockets and in-memory state. Vercel serverless functions are **not** compatible.

1. Go to [Render.com](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Render will automatically detect `render.yaml` and configure everything.
4. Set any required environment variables in the Render dashboard.
5. Deploy! 🎉

### Frontend → [Vercel](https://vercel.com)

1. Go to [Vercel](https://vercel.com) and import your GitHub repository.
2. Set the **Root Directory** to `frontend`.
3. Add the environment variable:
   ```
   VITE_BACKEND_URL=https://your-render-backend-url.onrender.com
   ```
4. Deploy! 🎉

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Built with ❤️ by [BuildWithNeel](https://github.com/buildwithneel)

</div>
