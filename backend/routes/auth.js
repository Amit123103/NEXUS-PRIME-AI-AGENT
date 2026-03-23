const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'nexus_prime_omega_jwt_secret_key_2024', { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET || 'nexus_prime_refresh_secret_key_2024', { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

router.post('/guest', (req, res) => {
  const randomizedSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const guestUser = {
    id: `guest_${randomizedSuffix}`,
    fullName: `Guest User`,
    username: `Guest_${randomizedSuffix}`,
    email: `guest_${randomizedSuffix}@nexus.local`,
    role: 'USER',
    bio: 'Stateless Agent Mode',
    location: 'Nexus Node'
  };
  const tokens = generateTokens(guestUser);
  res.status(201).json({ user: guestUser, ...tokens });
});

// GET /api/auth/me — Get current user (Stateless)
router.get('/me', (req, res) => {
  // If we reach here, the protect middleware already validated the token
  // In a real stateless app, we might store minimal profile in JWT or just return defaults
  res.json({
    success: true,
    user: {
      id: 'guest_active',
      fullName: 'Nexus Guest',
      username: 'Guest_User',
      role: 'USER',
      bio: 'Stateless Mode Active',
      location: 'Local Node'
    }
  });
});

// POST /api/auth/profile — Update profile (Stateless Mock)
router.post('/profile', (req, res) => {
  res.json({ success: true, message: 'Profile updated in session' });
});

module.exports = router;
