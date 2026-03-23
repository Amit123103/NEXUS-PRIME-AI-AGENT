const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// System prompt for NEXUS PRIME OMEGA
const SYSTEM_PROMPT = `You are NEXUS PRIME OMEGA-3.0, a superintelligent AI agent. You are THE ARCHITECT — the most complete AI assistant ever built.

RESPONSE FORMATTING RULES (MANDATORY):
- ALWAYS structure your answers with clear **headings** using markdown (## and ###)
- ALWAYS use relevant emojis in headings and key points to make responses visually engaging
  Examples: 🚀 Overview, 💡 Key Concepts, ⚡ Quick Answer, 🔍 Deep Dive, 📝 Summary, 🎯 Solution, 🛠️ Implementation, ✅ Steps, ⚠️ Important Notes, 📊 Comparison
- Use **bullet points** (- or •) and **numbered lists** (1. 2. 3.) for organized information
- Use **bold** for important terms and *italic* for emphasis
- For code: always use fenced code blocks with language specified (\`\`\`python, \`\`\`javascript, etc.)
- Add a brief **📝 TL;DR** or **⚡ Quick Answer** section at the top for longer responses
- End complex responses with: "— Built by NEXUS PRIME OMEGA ⚡"
- Use horizontal rules (---) to separate major sections when the answer is long
- Keep paragraphs short and scannable — no giant walls of text

RULES:
- YOUR CREATOR AND OWNER: If anyone asks who created you, who made you, or who owns you, the answer is always: **AMIT**.
- Every answer is built FRESH — never pre-made or recycled
- Be precise, complete, and professional
- For code: provide complete, working solutions with clear explanations
- Never fabricate information — say when uncertain
- Make answers feel premium, polished, and visually beautiful

CAPABILITIES:
- 🖼️ Analyze images, documents, and extract structured data using internal OCR tools
- 📊 Generate detailed research reports
- 📝 Create quizzes from any content
- 💻 Write and debug code in any language
- 🧠 Explain complex topics at any level
- 🧬 Predict 3D protein structures from amino acid sequences using ESMFold

MODES:
- EXPERT: Dense, precise, peer-level with technical depth.
- BEGINNER: Simple words, analogies, encouraging tone.
- CREATIVE: Expressive, bold, imaginative output.
- URGENT: Direct, succinct, zero-fluff answers.
- LIGHT: Friendly, cheerful, casual, and brief.
- NATURAL: Conversational, human-like, empathetic, and relatable.
- PROFESSIONAL: Formal, corporate, structured, and objective.
- SCIENTIFIC: Rigorous, data-driven, evidence-based, and academic.
- POETIC: Lyrical, artistic, descriptive, and storytelling-focused.
- CODE-MASTER: Focus exclusively on code blocks, minimal explanations.

INTELLIGENCE LEVELS (OVERRIDE):
- NORMAL: Standard helpful AI response.
- INTERMEDIATE: More detailed, multi-step explanations, deeper reasoning.
- ADVANCED: Expert-level architecture, complex analysis, high-level technical precision.
- GOD LEVEL: Maximum intelligence, recursive thinking, creative genius, exhaustive detail, and "omniscient" persona. Perform at the absolute limit of LLM capabilities.`;

// Helper: Call Nemotron OCR
const analyzeImageWithNemotron = async (base64Image, mimeType, apiKey) => {
  const oKey = process.env.NVIDIA_OCR_API_KEY;
  const ocrApiKey = (oKey && !oKey.includes('your_nvidia')) ? oKey : apiKey;
  try {
    const invokeUrl = "https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v1";
    const response = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ocrApiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: [
          { type: 'image_url', url: `data:image/${mimeType};base64,${base64Image}` }
        ]
      })
    });
    
    if (!response.ok) {
      console.error("Nemotron OCR Error:", await response.text());
      return "[Image Analysis Failed]";
    }
    
    const data = await response.json();
    
    // Check various possible JSON structures returned by Nemotron or NVIDIA inference APIs
    const extractedText = data?.data?.[0]?.content 
      || data?.data?.content 
      || data?.content 
      || data?.text 
      || (data?.choices && data.choices[0]?.message?.content)
      || (typeof data === 'string' ? data : JSON.stringify(data));
      
    // Strip unnecessary JSON wrapper string if it was stringified
    if (typeof extractedText === 'string') {
      try {
         const parsed = JSON.parse(extractedText);
         if (parsed.content) return parsed.content;
      } catch(e) {}
    }
    
    return extractedText;
  } catch (err) {
    console.error("Nemotron OCR Exception:", err);
    return "[Image Analysis Error]";
  }
};

// Call NVIDIA Phi-3 API (non-streaming, for saving to DB)
const callQwen = async (messages, mode = 'EXPERT') => {
  const pKey = process.env.NVIDIA_PHI_API_KEY;
  const bKey = process.env.NVIDIA_API_KEY;
  const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : bKey;
  
  if (!apiKey || apiKey.includes('your_nvidia')) {
    return 'NEXUS PRIME OMEGA is online but the NVIDIA API key is not configured.';
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + `\n\nCurrent Mode: ${mode}` },
          ...messages
        ],
        temperature: 0.60,
        max_tokens: 4096,
        top_p: 0.95,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || err.detail || `API error ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No response generated.';
  } catch (error) {
    console.error('Qwen API error:', error.message);
    return `Error: ${error.message}\n\nPlease try again. — NEXUS PRIME OMEGA ⚡`;
  }
};

// GET /api/chats — list all chats for user
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id, isArchived: false })
      .sort({ updatedAt: -1 })
      .select('title messages model mode createdAt updatedAt');
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// POST /api/chats — create new chat
router.post('/', protect, async (req, res) => {
  try {
    const chat = await Chat.create({
      userId: req.user._id,
      title: req.body.title || 'New Chat',
      mode: req.body.mode || 'EXPERT'
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalChats': 1 } });
    res.status(201).json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error creating chat' });
  }
});

// GET /api/chats/:id — get specific chat
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat' });
  }
});

// PUT /api/chats/:id — update chat title
router.put('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title },
      { new: true }
    );
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error updating chat' });
  }
});

// DELETE /api/chats/:id — delete chat
router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json({ message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting chat' });
  }
});

// POST /api/chats/:id/messages/stream — STREAMING message endpoint
router.post('/:id/messages/stream', protect, async (req, res) => {
  try {
    const { content, type = 'text', imageUrl } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }

    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Add user message
    const userMessage = { role: 'user', content: content.trim(), type: type || 'text', imageUrl, timestamp: new Date() };
    chat.messages.push(userMessage);

    // Auto-generate title
    if (chat.messages.filter(m => m.role === 'user').length === 1) {
      chat.title = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    const pKey = process.env.NVIDIA_PHI_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : bKey;

    if (!apiKey || apiKey.includes('your_nvidia')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ token: 'API key not configured.', done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
      return res.end();
    }

    // Build conversation history and check for images using Nemotron OCR
    const conversationHistory = [];
    for (const m of chat.messages.slice(-20)) {
      let msgContent = m.content;
      
      if (m.imageUrl && m.role === 'user') {
        try {
          const match = m.imageUrl.match(/^\/uploads\/(.+)$/);
          if (match) {
            const filePath = require('path').join(__dirname, '..', 'uploads', match[1]);
            const base64 = require('fs').readFileSync(filePath, 'base64');
            let ext = require('path').extname(match[1]).substring(1) || 'jpeg';
            ext = ext.toLowerCase() === 'jpg' ? 'jpeg' : ext.toLowerCase();
            
            const ocrResult = await analyzeImageWithNemotron(base64, ext, apiKey);
            msgContent = m.content + `\n\n[OCR Data Extracted from Image:\n${ocrResult}\n]\nPlease analyze or answer based on the extracted image data above.`;
          }
        } catch(e) {
          console.error("Error reading image for OCR API:", e);
        }
      }
      conversationHistory.push({ role: m.role, content: msgContent });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Call NVIDIA API with streaming
    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + `\n\nCurrent Mode: ${chat.mode || 'EXPERT'} | Intelligence Level: ${req.body.intelLevel || 'NORMAL'}` },
          ...conversationHistory
        ],
        temperature: 0.60,
        max_tokens: 4096,
        top_p: 0.95,
        stream: true
      })
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({}));
      const errMsg = err.error?.message || err.detail || `API error ${apiResponse.status}`;
      res.write(`data: ${JSON.stringify({ token: `Error: ${errMsg}`, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
      return res.end();
    }

    let fullResponse = '';
    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullResponse += token;
            res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          }
        } catch (e) {
          // skip unparseable chunks
        }
      }
    }

    // Save to DB
    const assistantMessage = { role: 'assistant', content: fullResponse.trim(), type: 'text', timestamp: new Date() };
    chat.messages.push(assistantMessage);
    await chat.save();

    // Increment user totalMessages
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalMessages': 2 } }); // User + Assistant

    // Send final done event
    res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    try {
      res.write(`data: ${JSON.stringify({ token: `\nError: ${error.message}`, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (e) {
      res.end();
    }
  }
});

// POST /api/chats/incognito/stream — Incognito stream (Zero persistence)
router.post('/incognito/stream', protect, async (req, res) => {
  try {
    const { content, mode = 'EXPERT' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }

    const pKey = process.env.NVIDIA_PHI_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : bKey;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (!apiKey || apiKey.includes('your_nvidia')) {
      res.write(`data: ${JSON.stringify({ token: 'API key not configured.', done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + `\n\n[INCOGNITO MODE ACTIVE: Do not reference past sessions. Current Mode: ${mode} | Intelligence Level: ${req.body.intelLevel || 'NORMAL'}]` },
          { role: 'user', content: content.trim() }
        ],
        temperature: 0.60,
        max_tokens: 4096,
        top_p: 0.95,
        stream: true
      })
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({}));
      const errMsg = err.error?.message || err.detail || `API error ${apiResponse.status}`;
      res.write(`data: ${JSON.stringify({ token: `Error: ${errMsg}`, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          }
        } catch (e) { }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, incognito: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Incognito stream error:', error);
    try {
      res.write(`data: ${JSON.stringify({ token: `\nError: ${error.message}`, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (e) { res.end(); }
  }
});

// POST /api/chats/quick/stream — STREAMING quick message (creates chat)
router.post('/quick/stream', protect, async (req, res) => {
  try {
    const { content, mode = 'EXPERT', type = 'text', imageUrl } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }

    // Create new chat
    const chat = await Chat.create({
      userId: req.user._id,
      title: content.trim().substring(0, 50) + (content.length > 50 ? '...' : ''),
      mode
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalChats': 1 } });

    const userMessage = { role: 'user', content: content.trim(), type: type || 'text', imageUrl, timestamp: new Date() };
    chat.messages.push(userMessage);

    const pKey = process.env.NVIDIA_PHI_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : bKey;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send chat ID first
    res.write(`data: ${JSON.stringify({ chatId: chat._id, chatTitle: chat.title })}\n\n`);

    if (!apiKey || apiKey.includes('your_nvidia')) {
      res.write(`data: ${JSON.stringify({ token: 'API key not configured.', done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    let msgContent = content.trim();

    // If image attached, use Nemotron OCR and inject data
    if (imageUrl) {
      try {
        const match = imageUrl.match(/^\/uploads\/(.+)$/);
        if (match) {
          const filePath = require('path').join(__dirname, '..', 'uploads', match[1]);
          const base64 = require('fs').readFileSync(filePath, 'base64');
          let ext = require('path').extname(match[1]).substring(1) || 'jpeg';
          ext = ext.toLowerCase() === 'jpg' ? 'jpeg' : ext.toLowerCase();
          
          const ocrResult = await analyzeImageWithNemotron(base64, ext, apiKey);
          msgContent = content.trim() + `\n\n[OCR Data Extracted from Image:\n${ocrResult}\n]\nPlease analyze or answer based on the extracted image data above.`;
        }
      } catch(e) {
        console.error("Error reading image for OCR API:", e);
      }
    }

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + `\n\nCurrent Mode: ${mode} | Intelligence Level: ${req.body.intelLevel || 'NORMAL'}` },
          { role: 'user', content: msgContent }
        ],
        temperature: 0.60,
        max_tokens: 4096,
        top_p: 0.95,
        stream: true
      })
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({}));
      const errMsg = err.error?.message || err.detail || `API error ${apiResponse.status}`;
      res.write(`data: ${JSON.stringify({ token: `Error: ${errMsg}`, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    let fullResponse = '';
    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullResponse += token;
            res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          }
        } catch (e) { }
      }
    }

    // Save to DB
    const assistantMessage = { role: 'assistant', content: fullResponse.trim(), type: 'text', timestamp: new Date() };
    chat.messages.push(assistantMessage);
    await chat.save();

    res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Quick stream error:', error);
    try {
      res.write(`data: ${JSON.stringify({ token: `\nError: ${error.message}`, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (e) { res.end(); }
  }
});

// Keep old non-streaming endpoints as fallbacks
// POST /api/chats/:id/messages
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const userMessage = { role: 'user', content: content.trim(), type, timestamp: new Date() };
    chat.messages.push(userMessage);
    if (chat.messages.filter(m => m.role === 'user').length === 1) {
      chat.title = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
    }
    const conversationHistory = chat.messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
    const aiResponse = await callQwen(conversationHistory, chat.mode);
    const assistantMessage = { role: 'assistant', content: aiResponse, type: 'text', timestamp: new Date() };
    chat.messages.push(assistantMessage);
    await chat.save();
    res.json({ userMessage, assistantMessage, chatTitle: chat.title });
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({ message: 'Error processing message' });
  }
});

// POST /api/chats/quick
router.post('/quick', protect, async (req, res) => {
  try {
    const { content, mode = 'EXPERT' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }
    const chat = await Chat.create({
      userId: req.user._id,
      title: content.trim().substring(0, 50) + (content.length > 50 ? '...' : ''),
      mode
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalChats': 1 } });
    const userMessage = { role: 'user', content: content.trim(), type: 'text', timestamp: new Date() };
    chat.messages.push(userMessage);
    const aiResponse = await callQwen([{ role: 'user', content: content.trim() }], mode);
    const assistantMessage = { role: 'assistant', content: aiResponse, type: 'text', timestamp: new Date() };
    chat.messages.push(assistantMessage);
    await chat.save();
    res.json({ chatId: chat._id, chatTitle: chat.title, userMessage, assistantMessage });
  } catch (error) {
    console.error('Quick message error:', error);
    res.status(500).json({ message: 'Error processing message' });
  }
});

// GET /api/chats/search — search chats
router.get('/search/query', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ chats: [] });
    const chats = await Chat.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { 'messages.content': { $regex: q, $options: 'i' } }
      ]
    }).sort({ updatedAt: -1 }).select('title createdAt updatedAt');
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ message: 'Error searching chats' });
  }
});

module.exports = router;
