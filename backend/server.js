require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const proteinRoutes = require('./routes/protein');
const researchRoutes = require('./routes/research');
const connectDB = require('./config/db');

const app = express();

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

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Favicon handler (prevents 404)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve static files
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

// Health Check
app.use('/api/asr', require('./routes/asr'));

// Page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'auth.html'));
});

app.get('/agent', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'agent.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3005;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║         ⚡ NEXUS PRIME OMEGA-3.0 ⚡          ║
║         Server running on port ${PORT}          ║
║         http://localhost:${PORT}               ║
╚══════════════════════════════════════════════╝
    `);
  });
};

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

// Export for Vercel
module.exports = app;
