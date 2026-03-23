const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  stats: {
    totalChats: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    imagesCreated: { type: Number, default: 0 },
    filesAnalyzed: { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    researchDone: { type: Number, default: 0 },
    researchPoints: { type: Number, default: 0 }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
