const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_EXPIRES_IN || '7d'
  });
};

// POST /api/auth/register
router.post('/register', [
  body('fullName').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 chars'),
  body('username').trim().isLength({ min: 3, max: 30 }).isAlphanumeric().withMessage('Username: 3-30 alphanumeric chars'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { fullName, username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    const existingUsername = await User.findOne({ username });
    
    if (existingUser || existingUsername) {
      return res.status(400).json({ message: existingUser ? 'Email already exists' : 'Username already exists' });
    }

    const user = await User.create({ fullName, username, email, password });
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // ── Send Welcome Email (Fire and forget) ──
    sendEmail({
        email: user.email,
        subject: 'Welcome to NEXUS PRIME OMEGA AI AGENT!',
        message: `Hello ${user.full_name}, welcome to the ecosystem.`,
        html: `<div style="font-family: sans-serif; padding: 20px;">
                <h1 style="color: #00d4ff;">⚡ NEXUS PRIME OMEGA</h1>
                <p>Hello <strong>${user.full_name}</strong>, your account is ready.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3005'}/auth" style="display: inline-block; padding: 10px 20px; background: #00d4ff; color: #fff; text-decoration: none; border-radius: 5px;">Login Now</a>
               </div>`
    }).catch(console.error);

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('login').trim().notEmpty().withMessage('Email or username required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { login, password } = req.body;
    const user = await User.findOne({ email: login.toLowerCase() }) || await User.findOne({ username: login.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      await sql`UPDATE users SET login_attempts = login_attempts + 1 WHERE id = ${user.id}`;
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await sql`UPDATE users SET login_attempts = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = ${user.id}`;

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        lastLoginAt: new Date()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    res.json({ token: generateToken(user.id), refreshToken: generateRefreshToken(user.id) });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, avatar, bio, location, preferences } = req.body;
    
    await sql`
      UPDATE users 
      SET full_name = COALESCE(${fullName}, full_name),
          avatar = COALESCE(${avatar}, avatar),
          bio = COALESCE(${bio}, bio),
          location = COALESCE(${location}, location),
          theme = COALESCE(${preferences?.theme}, theme),
          language = COALESCE(${preferences?.language}, language),
          agent_mode = COALESCE(${preferences?.agentMode}, agent_mode)
      WHERE id = ${req.user.id};
    `;
    
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'No user found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await sql`UPDATE users SET reset_password_token = ${hashedToken}, reset_password_expires = ${expires} WHERE id = ${user.id}`;

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3005'}/reset-password.html?token=${resetToken}`;
    
    await sendEmail({
      email: user.email,
      subject: 'NEXUS PRIME OMEGA — Password Reset Request',
      message: `Reset your password here: ${resetUrl}`,
      html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>🔐 Password Reset Request</h2>
              <p>Click below to reset your password. Valid for 10 minutes.</p>
              <a href="${resetUrl}" style="padding: 12px 24px; background: #9d4edd; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
             </div>`
    });

    res.json({ status: 'success', message: 'Token sent to email!' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars')
], async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const { rows } = await sql`
      SELECT * FROM users 
      WHERE reset_password_token = ${hashedToken} 
      AND reset_password_expires > CURRENT_TIMESTAMP 
      LIMIT 1;
    `;
    
    if (rows.length === 0) return res.status(400).json({ message: 'Token is invalid or expired' });

    const newPassword = await bcrypt.hash(req.body.password, 12);
    await sql`
      UPDATE users 
      SET password = ${newPassword}, 
          reset_password_token = NULL, 
          reset_password_expires = NULL 
      WHERE id = ${rows[0].id};
    `;

    res.json({ status: 'success', message: 'Password updated! Please login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
