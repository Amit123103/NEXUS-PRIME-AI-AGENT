const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const User = require('../models/User');

const router = express.Router();

// POST /api/image/generate — Generate image from text prompt
router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt, negative_prompt = '', width = 1024, height = 1024, steps = 25, seed = 0 } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: 'Image prompt is required' });
    }

    const iKey = process.env.NVIDIA_IMAGE_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (iKey && !iKey.includes('your_nvidia')) ? iKey : bKey;

    if (!apiKey || apiKey.includes('your_nvidia')) {
      return res.status(500).json({ message: 'NVIDIA API key not configured. Add NVIDIA_API_KEY to your .env file.' });
    }

    console.log(`🎨 Generating image: "${prompt.substring(0, 50)}..."`);

    const response = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          { text: prompt.trim(), weight: 1 },
          ...(negative_prompt ? [{ text: negative_prompt.trim(), weight: -1 }] : [])
        ],
        cfg_scale: 7,
        sampler: 'K_DPM_2_ANCESTRAL',
        seed: seed || Math.floor(Math.random() * 2147483647),
        steps: Math.min(steps, 50),
        height: Math.min(height, 1024),
        width: Math.min(width, 1024),
        samples: 1
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Image generation error:', err);
      throw new Error(err.error?.message || err.detail || err.title || `API error ${response.status}`);
    }

    const data = await response.json();

    if (!data.artifacts || data.artifacts.length === 0) {
      throw new Error('No image generated');
    }

    // Save image to uploads directory
    const imageBase64 = data.artifacts[0].base64;
    const fileName = `generated_${Date.now()}.png`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);

    fs.writeFileSync(filePath, Buffer.from(imageBase64, 'base64'));

    // Save to DB
    const image = await Image.create({
      user: req.user._id,
      url: `/uploads/${fileName}`,
      prompt: prompt.trim(),
      type: 'generated'
    });

    // Increment user stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.imagesCreated': 1 } });

    console.log(`✅ Image saved: ${fileName}`);

    res.json({
      success: true,
      imageUrl: image.url,
      seed: data.artifacts[0].seed || seed,
      prompt: image.prompt
    });

  } catch (error) {
    console.error('Image generation failed:', error.message);
    res.status(500).json({
      message: `Image generation failed: ${error.message}`
    });
  }
});

// GET /api/image/gallery — Get user's gallery
router.get('/gallery', protect, async (req, res) => {
  try {
    const images = await Image.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, images });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gallery' });
  }
});

module.exports = router;
