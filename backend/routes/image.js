const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Image = require('../models/Image');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// POST /api/image/generate — Generate image (Mongoose)
router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt required' });

    // NVIDIA API Call (Omitted for brevity, use existing logic)
    const fileName = `generated_${Date.now()}.png`;
    const imageUrl = `/uploads/${fileName}`;
    
    const image = await Image.create({
      user: req.user._id,
      url: imageUrl,
      prompt: prompt.trim()
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.imagesCreated': 1 } });

    res.json({ success: true, imageUrl: image.url, prompt: image.prompt });
  } catch (error) {
    res.status(500).json({ message: 'Generation failed' });
  }
});

// GET /api/image/gallery — Get gallery
router.get('/gallery', protect, async (req, res) => {
  try {
    const images = await Image.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, images });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gallery' });
  }
});

module.exports = router;
