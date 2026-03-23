const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
  content: { type: String, required: true },
  type: { type: String, default: 'text' },
  fileUrl: String,
  imageUrl: String
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  model: { type: String, default: 'qwen/qwen3.5-397b-a22b' },
  mode: { type: String, default: 'EXPERT' },
  messages: [messageSchema],
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
