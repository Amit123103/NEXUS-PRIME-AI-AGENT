const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/research — Update research stats (Stateless + NVIDIA AI)
router.post('/', protect, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });

    console.log(`🔍 Performing research on: ${topic}`);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3-70b-instruct",
        messages: [
          { role: "system", content: "You are a world-class research assistant. Provide a concise, highly informative summary about the requested topic." },
          { role: "user", content: `Please perform deep research and provide a summary on: ${topic}` }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) throw new Error('Research AI failed');

    const data = await response.json();
    const researchResult = data.choices[0].message.content;

    res.json({ success: true, message: 'Research completed', result: researchResult });
  } catch (error) {
    console.error('Research Error:', error);
    res.status(500).json({ message: 'Research failed' });
  }
});

// POST /api/research/deep — Deep research (Stateless + NVIDIA AI)
router.post('/deep', protect, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3-70b-instruct",
        messages: [
          { role: "system", content: "You are a senior analyst. Provide a deep, structured analysis including key findings, implications, and future outlook." },
          { role: "user", content: `Perform an exhaustive deep research analysis on: ${topic}` }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    if (!response.ok) throw new Error('Deep Research AI failed');

    const data = await response.json();
    const deepResult = data.choices[0].message.content;

    res.json({ success: true, message: 'Deep research completed', result: deepResult });
  } catch (error) {
    console.error('Deep Research Error:', error);
    res.status(500).json({ message: 'Deep research failed' });
  }
});

module.exports = router;
