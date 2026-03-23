const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, (req, res) => res.json([]));
router.post('/', protect, (req, res) => res.status(201).json({ _id: `chat_${Date.now()}`, title: req.body.title || 'New Chat' }));
router.get('/:id', protect, (req, res) => res.json({ _id: req.params.id, messages: [] }));
router.delete('/:id', protect, (req, res) => res.json({ message: 'Deleted' }));

// NVIDIA API Server-Sent Events (SSE) Proxy
// NVIDIA API Server-Sent Events (SSE) Proxy
async function streamNvidiaCompletions(reqBody, res) {
  const { content, mode, imageUrl, type } = reqBody;
  const prompt = content || "Hello";

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let model = "meta/llama3-70b-instruct";
    let apiKey = process.env.NVIDIA_API_KEY;
    let apiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';

    // Model & Key selection based on Mode / Attachments
    const requestedMode = (mode || 'EXPERT').toUpperCase();

    if (imageUrl && (type === 'image' || !type)) {
      // Vision / OCR Mode
      model = "nvidia/neva-22b";
      apiKey = process.env.NVIDIA_OCR_API_KEY || process.env.NVIDIA_API_KEY;
      apiUrl = 'https://ai.api.nvidia.com/v1/vlm/nvidia/neva-22b';
    } else if (requestedMode === 'TECHNICAL' || requestedMode === 'BIO') {
      model = "microsoft/phi-3-mini-128k-instruct";
      apiKey = process.env.NVIDIA_PHI_API_KEY || process.env.NVIDIA_API_KEY;
    } else if (requestedMode === 'CREATIVE') {
      model = "nvidia/nemotron-4-340b-instruct";
      apiKey = process.env.NVIDIA_NEMOTRON_API_KEY || process.env.NVIDIA_API_KEY;
    } else if (requestedMode === 'EXPERT' || requestedMode === 'RESEARCH') {
      model = "meta/llama3-70b-instruct";
      apiKey = process.env.NVIDIA_LLAMA_API_KEY || process.env.NVIDIA_API_KEY;
    }

    const payload = {
      model: model,
      messages: [{ role: "user", content: imageUrl ? `${prompt} [Image attached: ${imageUrl}]` : prompt }],
      temperature: requestedMode === 'CREATIVE' ? 0.7 : 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: true
    };
    
    // For Vision/NIM endpoints, the URL might differ, but 'integrate' works for most LLMs
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`NVIDIA API ERROR (${model}):`, response.status, await response.text());
      res.write(`data: ${JSON.stringify({ token: ` [Error: NVIDIA API ${model} Failed. Check your API Key.]` })}\n\n`);
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data:') && line.trim() !== 'data: [DONE]') {
          try {
             const dataStr = line.replace(/^data: /, '').trim();
             if (!dataStr) continue;
             const parsed = JSON.parse(dataStr);
             const token = parsed.choices?.[0]?.delta?.content || "";
             if (token) {
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
             }
          } catch(e) {}
        }
      }
    }
  } catch (err) {
    console.error("STREAM ERROR:", err);
    res.write(`data: ${JSON.stringify({ token: " [Stream Interrupted — Network Failure]" })}\n\n`);
  }
  res.end();
}

router.post('/quick/stream', protect, async (req, res) => {
  await streamNvidiaCompletions(req.body, res);
});

router.post('/incognito/stream', protect, async (req, res) => {
  await streamNvidiaCompletions(req.body, res);
});

router.post('/:id/messages/stream', protect, async (req, res) => {
  await streamNvidiaCompletions(req.body, res);
});

router.post('/:id/stream', protect, async (req, res) => {
  await streamNvidiaCompletions(req.body, res);
});

module.exports = router;
