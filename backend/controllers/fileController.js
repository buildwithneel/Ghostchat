const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Ensure uploads dir
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
}).single('file');

// In-memory file database (could move to DB)
// Format: Map<fileId, { ...metadata }>
const filesDB = new Map();

const uploadFile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { roomId, username, expiryMins, password, viewOnce } = req.body;
    
    // Default 1 hour expiry
    const msExpiry = (parseInt(expiryMins) || 60) * 60 * 1000;
    const expiresAt = Date.now() + msExpiry;
    
    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const fileId = req.file.filename;

    filesDB.set(fileId, {
      fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      roomId,
      username,
      uploadedAt: Date.now(),
      expiresAt,
      viewOnce: viewOnce === 'true',
      passwordHash,
      downloads: 0
    });

    res.json({
      success: true,
      file: {
        fileId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        hasPassword: !!passwordHash,
        viewOnce: viewOnce === 'true',
        expiresAt
      }
    });
  });
};

const getFile = (req, res) => {
  const { fileId } = req.params;
  const fileData = filesDB.get(fileId);
  if (!fileData) return res.status(404).json({ error: 'File not found or expired' });
  
  if (Date.now() > fileData.expiresAt) {
    deleteFileInternal(fileId);
    return res.status(404).json({ error: 'File expired' });
  }

  res.json({
    fileId,
    originalName: fileData.originalName,
    mimeType: fileData.mimeType,
    size: fileData.size,
    hasPassword: !!fileData.passwordHash,
    viewOnce: fileData.viewOnce,
    downloads: fileData.downloads,
    expiresAt: fileData.expiresAt
  });
};

const downloadFileHandler = async (req, res) => {
  const { fileId } = req.params;
  const { password } = req.body;
  
  const fileData = filesDB.get(fileId);
  if (!fileData) return res.status(404).json({ error: 'File not found or expired' });

  if (Date.now() > fileData.expiresAt) {
    deleteFileInternal(fileId);
    return res.status(404).json({ error: 'File expired' });
  }

  if (fileData.passwordHash) {
    if (!password) return res.status(401).json({ error: 'Password required' });
    const isMatch = await bcrypt.compare(password, fileData.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });
  }

  // Generate a short-lived download token
  const downloadToken = uuidv4();
  fileData.downloadToken = downloadToken;
  fileData.tokenExpires = Date.now() + 5 * 60 * 1000; // 5 min
  
  res.json({ success: true, token: downloadToken });
};

const serveFile = (req, res) => {
  const { fileId } = req.params;
  const { token } = req.query;

  const fileData = filesDB.get(fileId);
  if (!fileData) return res.status(404).send('File not found');

  // Verify token
  if (!fileData.passwordHash) {
     // public if no pass, but still rate limit / time check
     if (Date.now() > fileData.expiresAt) return res.status(404).send('Expired');
  } else {
     // token required
     if (!token || fileData.downloadToken !== token || Date.now() > fileData.tokenExpires) {
         return res.status(401).send('Unauthorized or token expired');
     }
  }

  const filePath = path.join(uploadDir, fileId);
  if (!fs.existsSync(filePath)) return res.status(404).send('Missing file on disk');

  fileData.downloads += 1;
  const isViewOnce = fileData.viewOnce;

  const io = req.app.get('io');
  if (io && fileData.roomId) {
     io.to(fileData.roomId).emit('file_downloaded', { fileId, downloads: fileData.downloads });
  }

  res.sendFile(filePath, (err) => {
    if (isViewOnce && !err) {
      setTimeout(() => deleteFileInternal(fileId), 100);
    }
  });
};

// Internal deletion logic
const deleteFileInternal = (fileId) => {
  const filePath = path.join(uploadDir, fileId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  filesDB.delete(fileId);
};

// Expose getFilesDB for the cron job
module.exports = {
  uploadFile,
  getFile,
  serveFile,
  downloadFileHandler,
  filesDB,
  deleteFileInternal
};
