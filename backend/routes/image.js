const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// POST /api/image/generate — Generate image (Stateless + NVIDIA SDXL)
router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt required' });

    const apiKey = process.env.NVIDIA_IMAGE_API_KEY || process.env.NVIDIA_API_KEY;
    
    console.log(`🎨 Generating image for: "${prompt.substring(0, 50)}..."`);

    const response = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt.trim(), weight: 1 }],
        cfg_scale: 7,
        sampler: 'K_DPM_2_ANCESTRAL',
        steps: 25,
        height: 1024,
        width: 1024,
        samples: 1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('NVIDIA Image API error:', err);
      throw new Error(`NVIDIA API failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.artifacts || data.artifacts.length === 0) {
      throw new Error('No image artifact returned');
    }

    const base64Data = data.artifacts[0].base64;
    const fileName = `generated_${Date.now()}.png`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    res.json({ success: true, imageUrl: `/uploads/${fileName}`, prompt: prompt.trim() });
  } catch (error) {
    console.error('Image Generation Error:', error);
    res.status(500).json({ message: 'Generation failed' });
  }
});

// GET /api/image/gallery — Get gallery (Stateless placeholder)
router.get('/gallery', protect, async (req, res) => {
  try {
    // Return empty gallery for now
    res.json({ success: true, images: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gallery' });
  }
});

module.exports = router;
