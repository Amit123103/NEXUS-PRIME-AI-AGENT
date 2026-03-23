const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const proteinRoutes = require('./routes/protein');
const researchRoutes = require('./routes/research');
const connectDB = require('./config/db');

const app = express();

// Basic Health Check (Helps Render avoid 502/503 during boot)
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'up', timestamp: new Date() }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3005',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Initialize Database (MongoDB Atlas) in background to prevent startup blocks
connectDB().catch(err => {
  console.error('⚠️ Critical Database Error during background connect:', err.message);
  // We don't exit here immediately so the server can still respond with 503/500 to health checks
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Favicon handler (prevents 404)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve static files (Frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chats', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/image', require('./routes/image'));
app.use('/api/video', require('./routes/video'));
app.use('/api/protein', proteinRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/asr', require('./routes/asr'));

// Page routes (Client-side routing support)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'auth.html')));
app.get('/agent', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'agent.html')));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Serve Static Files (Frontend)
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log(`📂 Serving static files from: ${frontendPath}`);
if (!fs.existsSync(frontendPath)) {
  console.warn('⚠️ WARNING: frontend directory not found at:', frontendPath);
}
app.use(express.static(frontendPath));

// Page Routes (Simplified SPA behavior for Render)
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'auth.html')));
app.get('/agent', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'agent.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'reset-password.html')));

// Catch-all to serve index.html for undefined routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server (Unified Render/Railway/Local)
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║             ⚡ NEXUS PRIME OMEGA ⚡          ║
║         Server running on port ${PORT}          ║
║         Mode: ${process.env.NODE_ENV || 'development'}           ║
╚══════════════════════════════════════════════╝`);
});

// Export app
module.exports = app;
