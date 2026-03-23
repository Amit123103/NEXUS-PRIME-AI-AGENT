const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const proteinRoutes = require('./routes/protein');
const researchRoutes = require('./routes/research');
const app = express();

// Basic Health Check
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
  message: { message: 'Too many requests' }
});
app.use('/api/', limiter);

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

// Static files (Frontend)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use('/uploads', express.static(uploadsDir));

// Page routes
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/agent', (req, res) => res.sendFile(path.join(frontendPath, 'agent.html')));

// Catch-all to serve index.html for undefined routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 API fallback (only if not caught by static/HTML)
app.use('/api/*', (req, res) => res.status(404).json({ message: 'API Route not found' }));

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
