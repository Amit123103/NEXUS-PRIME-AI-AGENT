const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = 'amitakhil001@gmail.com';
    const existing = await User.findOne({ email });
    if (!existing) {
      await User.create({
        fullName: 'Test User',
        username: 'testuser_email',
        email: email,
        password: 'password123'
      });
      console.log('✅ Test user created: amitakhil001@gmail.com');
    } else {
      console.log('ℹ️ Test user already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test user:', err);
    process.exit(1);
  }
};

createTestUser();
