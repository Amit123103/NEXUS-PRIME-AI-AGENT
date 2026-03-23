const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Simulated Web Search and Massive Deep Research
router.post('/deep', protect, async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ message: 'Research topic is required.' });
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey || apiKey.includes('your_nvidia')) {
      return res.status(500).json({ message: 'NVIDIA API key not configured for Deep Research.' });
    }

    console.log(`🔍 Deep Research: Initiating global search for "${topic}"...`);

    // We use a high-token-limit model to generate a massive, detailed global research report
    // In a real production setup, one might use a Search API (Tavily/Serper) first.
    // Here we instruct the model to simulate a deep search process.
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct', // Or llama-3.1-405b if possible
        messages: [
          { 
            role: 'system', 
            content: `You are a EXPERT GLOBAL RESEARCHER. Your task is to provide a MASSIVE, 100% COMPLETE, and DEEP research report on the requested topic.
            
            STRUCTURE:
            1. 📊 Executive Summary (Global impact, current status)
            2. 🔍 Comprehensive Analysis (Core details, technical aspects)
            3. 🌐 Global Perspectives (How different regions view/handle this)
            4. 📈 Statistical Overview (Simulated data/trends based on latest info)
            5. 💡 Key Takeaways & Future Outlook
            6. 📝 Detailed References (Simulated global sources)
            
            FORMATTING:
            - Use rich markdown with headers and bullet points.
            - Include relevant emojis.
            - Ensure the report is LONG and extremely detailed as if you searched the whole web.
            - Sign off with: — Research finalized by NEXUS PRIME OMEGA GLOBAL INTEL 🌐` 
          },
          { role: 'user', content: `Perform a deep, exhaustive global research on: "${topic}"` }
        ],
        temperature: 0.5,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      throw new Error(`Research API error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || "Research failed to summarize.";

    console.log('✅ Deep Research: Report generated successfully.');
    // Simulate research cost/award
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.researchDone': 1, 'stats.researchPoints': 50 }
    });

    res.json({
      success: true,
      report,
      topic,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Deep Research failure:', error);
    res.status(500).json({ message: 'Deep Research failed.' });
  }
});

module.exports = router;
