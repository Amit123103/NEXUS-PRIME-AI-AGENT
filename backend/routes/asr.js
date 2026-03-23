const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

const router = express.Router();
// Store audio in memory instead of disk for speed and clean up
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/asr — Transcribe audio using NVIDIA Nemotron ASR
router.post('/', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const aKey = process.env.NVIDIA_ASR_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (aKey && !aKey.includes('your_nvidia')) ? aKey : bKey;

    if (!apiKey || apiKey.includes('your_nvidia')) {
      return res.status(500).json({ message: 'NVIDIA API key not configured.' });
    }

    // Use Node native FormData and Blob for zero-dependency multipart formatting
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'speech.webm');
    formData.append('model', 'nvidia/nemotron-asr-streaming');

    const response = await fetch('https://ai.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData // native fetch automatically sets correct multipart headers/boundaries
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ASR NVIDIA API error:', err);
      return res.status(response.status).json({ message: 'Speech recognition failed' });
    }

    const data = await response.json();
    
    // Returns { text: "transcribed text..." }
    res.json({ text: data.text || '' });

  } catch (error) {
    console.error('ASR exception:', error);
    res.status(500).json({ message: 'Internal server error during speech recognition' });
  }
});

module.exports = router;
