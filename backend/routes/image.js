const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');
const { sql } = require('@vercel/postgres');
const Image = require('../models/Image');

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
      return res.status(500).json({ message: 'NVIDIA API key not configured.' });
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
        text_prompts: [{ text: prompt.trim(), weight: 1 }, ...(negative_prompt ? [{ text: negative_prompt.trim(), weight: -1 }] : [])],
        seed: seed || Math.floor(Math.random() * 2147483647),
        steps: Math.min(steps, 50),
        height: Math.min(height, 1024),
        width: Math.min(width, 1024),
        samples: 1
      })
    });

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const data = await response.json();
    if (!data.artifacts || data.artifacts.length === 0) throw new Error('No image generated');

    const fileName = `generated_${Date.now()}.png`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    fs.writeFileSync(filePath, Buffer.from(data.artifacts[0].base64, 'base64'));

    // Save to SQL DB
    const image = await Image.create({
      user: req.user.id,
      url: `/uploads/${fileName}`,
      prompt: prompt.trim(),
      type: 'generated'
    });

    // Atomic increment stats
    await sql`UPDATE users SET images_created = images_created + 1 WHERE id = ${req.user.id}`;

    res.json({ success: true, imageUrl: image.url, prompt: image.prompt });
  } catch (error) {
    console.error('Image generation failed:', error.message);
    res.status(500).json({ message: `Image generation failed: ${error.message}` });
  }
});

// GET /api/image/gallery — Get user's gallery
router.get('/gallery', protect, async (req, res) => {
  try {
    const images = await Image.find({ user: req.user.id });
    res.json({ success: true, images });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gallery' });
  }
});

module.exports = router;
