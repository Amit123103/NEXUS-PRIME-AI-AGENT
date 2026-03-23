const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('Enter valid email'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 symbols'),
  body('fullName').notEmpty().withMessage('Full name required'),
  body('username').notEmpty().withMessage('Username required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password, fullName, username } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ email, password, fullName, username });
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Send Welcome Email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to NEXUS PRIME OMEGA!',
        html: `<h1>Welcome, ${user.fullName}!</h1><p>Your AI journey begins now.</p>`
      });
    } catch (err) {
      console.warn('Welcome email failed:', err.message);
    }

    res.status(201).json({ user: { id: user._id, fullName, username, email }, accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateTokens(user._id);
    res.json({ user: { id: user._id, fullName: user.fullName, email: user.email }, accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password.</p>`
    });

    res.json({ message: 'Token sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password updated!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
