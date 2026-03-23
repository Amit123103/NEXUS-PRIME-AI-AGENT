const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
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

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(400).json({ message: `${field} already exists` });
    }

    const user = await User.create({ fullName, username, email, password });
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // ── Send Welcome Email ──────────────────
    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to NEXUS PRIME OMEGA AI AGENT — Your Intelligence Upgraded!',
        message: `Hello ${user.fullName},\n\nWelcome to NEXUS PRIME OMEGA AI AGENT! Your account has been successfully created.\n\nYou now have access to a unified ecosystem of superintelligence, including:\n- Global Deep Research (Real-time Synthesis)\n- Neural Vision Analysis (Image-to-Reasoning)\n- ESMfold Biological Computation\n- Creative Diffusion Engines\n\nLogin to your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3005'}/auth\n\nStay sharp,\nThe NEXUS TEAM`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00d4ff; font-family: 'Orbitron', sans-serif; margin: 0;">⚡ NEXUS PRIME OMEGA</h1>
              <p style="color: #64748b; font-size: 0.9rem;">The Future of Multi-Modal Intelligence</p>
            </div>
            
            <p style="font-size: 1.1rem; color: #1e293b;">Hello <strong>${user.fullName}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;">Your journey into superintelligence begins now. Your account is active and you have been granted access to the OMEGA-3.0 neural framework.</p>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #f1f5f9;">
              <h3 style="color: #1e293b; margin-top: 0;">Core Platform Capabilities:</h3>
              <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
                <li><strong>Autonomous Research:</strong> Real-time cross-verification of global data.</li>
                <li><strong>Neural Vision:</strong> Sophisticated image analysis and reasoning.</li>
                <li><strong>Molecular Science:</strong> Integrated protein structure prediction.</li>
                <li><strong>Dynamic Synthesis:</strong> 10+ behavioral modes for tailored AI response.</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 35px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3005'}/auth" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00d4ff, #7c3aed); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);">Launch Your Intelligence</a>
            </div>
            
            <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 0.75rem; color: #94a3b8; text-align: center;">
              &copy; 2024 NEXUS PRIME OMEGA AI AGENT Team. All rights reserved.<br>
              Privacy First. Intelligence Driven.
            </p>
          </div>
        `
      });
    } catch (err) {
      console.error('Welcome email failed:', err);
    }

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
        location: user.location,
        socialLinks: user.socialLinks,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt
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
    const user = await User.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login.toLowerCase() }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      return res.status(423).json({ message: 'Account locked. Try again later.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
        location: user.location,
        socialLinks: user.socialLinks,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
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
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, avatar, bio, location, socialLinks, preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (fullName) user.fullName = fullName;
    if (avatar) user.avatar = avatar;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (socialLinks) user.socialLinks = { ...user.socialLinks.toObject(), ...socialLinks };
    if (preferences) user.preferences = { ...user.preferences.toObject(), ...preferences };
    await user.save();
    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
        location: user.location,
        socialLinks: user.socialLinks,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3005'}/reset-password.html?token=${resetToken}`;
    const message = `Forgot your password? Reset it here: ${resetUrl}\nIf you didn't request this, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'NEXUS PRIME OMEGA — Password Reset Request (Valid for 10 min)',
        message,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #00f0ff;">🔐 Password Reset Request</h2>
            <p>You requested a password reset for your NEXUS PRIME OMEGA AI AGENT account.</p>
            <p>Click the button below to set a new password. This link is valid for <strong>10 minutes</strong>.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #9d4edd; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px; font-size: 0.8rem; color: #999;">If you did not request this, please ignore this email.</p>
          </div>
        `
      });

      res.status(200).json({ status: 'success', message: 'Token sent to email!' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Error sending email. Try again later.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars')
], async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ status: 'success', message: 'Password updated! Please login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
