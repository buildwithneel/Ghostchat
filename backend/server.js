const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');

const { initSocket } = require('./socket/chatHandler');
const fileRoutes = require('./routes/fileRoutes');
const { rooms } = require('./controllers/roomController');
const { filesDB, deleteFileInternal } = require('./controllers/fileController');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security/Anti-Spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
app.use(cors({ origin: '*' })); // Match production URL if needed
app.use(express.json());

// Routes
app.use('/api/files', fileRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 5e7 // Allow up to 50MB uploads via base64 fallback (if needed)
});

app.set('io', io);

initSocket(io);

// Health check
app.get('/', (req, res) => {
  res.send('GhostChat Backend MVP is Running');
});

// CRON JOBS
// Run every minute to clean up expired files and inactive rooms
cron.schedule('* * * * *', () => {
  const now = Date.now();
  
  // Clean expired files
  for (const [fileId, fileData] of filesDB.entries()) {
    if (now > fileData.expiresAt) {
      deleteFileInternal(fileId);
    }
  }

  // Clean inactive/empty rooms
  const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000;
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActive > ROOM_EXPIRY_MS && room.users.size === 0) {
      rooms.delete(roomId);
    }
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  [GhostChat Server Error] Port ${PORT} is already in use.`);
    console.error(`Another instance of GhostChat backend is running, or another process is using port ${PORT}.`);
    console.error(`To fix: Stop the conflicting process or change PORT in backend/.env.\n`);
    process.exit(1);
  } else {
    console.error('[GhostChat Server Error]', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
