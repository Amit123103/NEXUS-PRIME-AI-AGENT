const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  prompt: { type: String, required: true },
  type: { type: String, default: 'generated' }
}, { timestamps: true });

module.exports = mongoose.model('Image', imageSchema);
