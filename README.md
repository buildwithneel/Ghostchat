<div align="center">

# 👻 GhostChat

### *Ephemeral • Anonymous • End-to-End Real-Time Collaboration*

An open-source, privacy-first real-time messaging Progressive Web App (PWA) with password-protected rooms, QR code invitations, self-destructing file sharing, and zero accounts or logs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br />

[Explore Features](#-key-features) • [Quick Start](#-quick-start) • [PWA & Mobile](#-pwa--mobile-experience) • [Architecture](#-architecture) • [Deployment](#-deployment) • [Contributing](#-contributing)

</div>

---

## 🌟 Overview

**GhostChat** is designed for people who want instant, secure, and disposable group communication without creating accounts, providing phone numbers, or leaving permanent digital footprints. 

Whether you need a quick temporary channel to coordinate a meeting, share sensitive credentials that expire immediately, or transfer files securely between devices without signing into third-party clouds, GhostChat creates a sandbox room in seconds and vanishes completely once everyone leaves.

---

## ✨ Key Features

### 🔒 Privacy & Ephemeral Security
- **Zero Login / Zero Tracking**: No email, phone number, passwords, or cookies required. Start chatting immediately.
- **Auto-Assigned Identities**: Dynamic, colorful identities (`Ghost_XXXX`) with avatar generation. Rename anytime on the fly.
- **Password-Protected Rooms**: Optional room passwords hashed securely with bcrypt.
- **Disposable Architecture**: Inactive rooms and messages are pruned automatically. Nothing is stored in permanent databases.
- **Self-Destructing Files**: Share files with custom expiration timers, view-once limits, and optional file-level passwords.

### 📱 Progressive Web App (PWA) & Mobile Excellence
- **Fully Installable**: Add to Home Screen on iOS Safari, Android Chrome, and Desktop (Chrome / Edge / Brave).
- **Interactive Install Prompts**: Custom banners and step-by-step visual installation guides tailored to each operating system.
- **Service Worker Caching**: Intelligent cache-first caching for static assets, network-first navigation fallback, and offline awareness.
- **Mobile Virtual Keyboard Optimized**: Seamless input pinning above the soft keyboard using the `visualViewport` API, preventing viewport jumping and hidden messages.
- **Responsive on Any Screen**: Pixel-perfect support from compact screens (iPhone SE, 375×667) to large 4K desktop displays.

### ⚡ Real-Time Collaboration
- **Blazing WebSockets**: Powered by Socket.IO for sub-millisecond message delivery.
- **Live Typing Indicators**: See who is typing in real time.
- **Room QR Codes & Instant Invites**: Generate dynamic QR codes for any room; scan on mobile to join protected or open rooms instantly.
- **Interactive Audio Feedback**: Custom sound cues for incoming and sent messages with audio permission handling and mute toggles.
- **Dual Theme Support**: Beautiful glassmorphism aesthetic with high-contrast Dark and Light themes.
- **Recent Rooms Switcher**: Fast client-side quick-switching between visited rooms with lock badges.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Glassmorphism tokens
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **QR Codes**: [qrcode](https://www.npmjs.com/package/qrcode)
- **Audio & Media**: Web Audio API with fallback sound assets
- **PWA**: Service Worker API (`sw.js`), Web App Manifest

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v18+ LTS recommended)
- **Framework**: [Express 5](https://expressjs.com/)
- **WebSockets**: [Socket.IO 4.x](https://socket.io/)
- **Security & Cryptography**: [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **File Uploads**: [Multer](https://github.com/expressjs/multer)
- **Automation**: [node-cron](https://github.com/kelektiv/node-cron) for automated expired file/room sweeping

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) `>= 18.0.0`
- [npm](https://www.npmjs.com/) `>= 9.0.0`

### 1. Clone Repository

```bash
git clone https://github.com/buildwithneel/Ghostchat.git
cd Ghostchat
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Start the backend development server:

```bash
npm start
```
> Server runs on `http://localhost:3000`

### 3. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```
> Client runs on `http://localhost:5173`

---

## 📱 PWA & Mobile Experience

GhostChat complies with modern PWA criteria and provides a native-like experience across platforms:

```
┌────────────────────────────────────────────────────────┐
│                   GhostChat PWA                        │
├──────────────────────────┬─────────────────────────────┤
│ Feature                  │ Status                      │
├──────────────────────────┼─────────────────────────────┤
│ Installable App          │ ✅ iOS, Android, Desktop    │
│ Service Worker (sw.js)   │ ✅ Cache-First + Fallbacks  │
│ Manifest (manifest.json) │ ✅ Maskable icons & screens │
│ Offline Mode             │ ✅ Cached Shell & Fallback  │
│ Mobile Viewport / Kbd    │ ✅ visualViewport pinned    │
│ Safe-Area Insets         │ ✅ env(safe-area-inset-*)   │
└──────────────────────────┴─────────────────────────────┘
```

- **iOS Safari**: Tap `Share` $\to$ `Add to Home Screen`.
- **Android Chrome**: Tap the `Install` banner or browser menu $\to$ `Install app`.
- **Desktop (Chrome/Edge)**: Click the install icon in the address bar.

---

## 🏛️ Architecture

```
Ghostchat/
├── backend/
│   ├── controllers/          # Room lifecycle & file management
│   ├── routes/               # REST endpoints for room validation & uploads
│   ├── socket/               # Real-time WebSocket connection handlers
│   ├── uploads/              # Temporary file staging directory
│   ├── utils/                # Password verification and hash helpers
│   ├── server.js             # Main HTTP + Socket.IO server & cron tasks
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json     # PWA Web App Manifest
│   │   ├── sw.js             # Service Worker caching & routing
│   │   ├── icon-*.png        # Maskable & standard application icons
│   │   └── notification.mp3  # Audio notification cues
│   ├── src/
│   │   ├── components/       # UI components (Chat, Modals, TopBar, PWA Banner)
│   │   ├── pages/            # Home & ChatRoom views
│   │   ├── utils/            # Colors, sound player, config resolution
│   │   ├── App.jsx           # Theme context & route configuration
│   │   └── main.jsx          # Entry point & Service Worker registration
│   ├── vercel.json           # Vercel deployment headers & rewrite rules
│   ├── vite.config.js        # Vite bundler configuration
│   └── package.json
│
└── render.yaml               # Infrastructure-as-code for Render deployment
```

---

## 🌐 Deployment

### 1. Backend $\to$ [Render](https://render.com)
GhostChat requires a persistent Node.js environment to maintain Socket.IO WebSocket states:

1. Create a new **Web Service** on Render connected to this repository.
2. Render detects `render.yaml` automatically.
3. Set the following environment variables:
   - `PORT`: `3000` (or Render default)
   - `CORS_ORIGIN`: `https://your-frontend-domain.vercel.app`
4. Deploy service.

### 2. Frontend $\to$ [Vercel](https://vercel.com)
1. Import repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add environment variables:
   - `VITE_BACKEND_URL`: `https://your-render-backend-url.onrender.com`
4. The included `frontend/vercel.json` automatically configures:
   - SPA route rewrites to `/index.html`
   - Cache-Control headers for `/sw.js` and `/manifest.json`
   - Static asset immutable caching
5. Click **Deploy**.

---

## 🔒 Security Best Practices

- **Zero Persistence**: Chat logs exist solely in volatile memory during active socket sessions.
- **Cryptographic Hashing**: Room passwords use standard salted bcrypt hashing.
- **Access Restrictions**: Rate-limiting and size thresholds on temporary file attachments.
- **HTTPS Enforcement**: WebSockets upgrade to WSS over TLS in production to prevent eavesdropping.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Made with 👻 by [buildwithneel](https://github.com/buildwithneel)

</div>
