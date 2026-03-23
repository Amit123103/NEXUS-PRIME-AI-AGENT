const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Chat = require('../models/Chat');
const User = require('../models/User');

const router = express.Router();

// GET /api/chats — List user chats
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id }).sort({ updatedAt: -1 }).select('title model mode updatedAt');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// POST /api/chats — Create new chat
router.post('/', protect, async (req, res) => {
  try {
    const chat = await Chat.create({ user: req.user._id, title: req.body.title || 'New Chat' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalChats': 1 } });
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error creating chat' });
  }
});

// GET /api/chats/:id — Get chat messages
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat' });
  }
});

// DELETE /api/chats/:id — Delete chat
router.delete('/:id', protect, async (req, res) => {
  try {
    await Chat.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting chat' });
  }
});

// Streaming Chat Logic (Simplified restore)
router.post('/:id/stream', protect, async (req, res) => {
  // ... (Standard streaming implementation with Mongoose chat.save())
  try {
    const { prompt } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, user: req.user._id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Mock response for now or call NVIDIA API
    const responseText = "NEXUS PRIME OMEGA — Intelligence online.";
    chat.messages.push({ role: 'user', content: prompt });
    chat.messages.push({ role: 'assistant', content: responseText });
    await chat.save();
    
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalMessages': 2 } });

    res.json({ text: responseText });
  } catch (error) {
    res.status(500).json({ message: 'Streaming failed' });
  }
});

module.exports = router;
