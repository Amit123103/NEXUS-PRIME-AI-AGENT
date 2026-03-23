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
    const chats = await Chat.find({ userId: req.user.id, isArchived: false });
    res.json({ chats });
  } catch (error) {
    console.error('Fetch chats error:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
});

// POST /api/chats — create new chat
router.post('/', protect, async (req, res) => {
  try {
    const chat = await Chat.create({
      userId: req.user.id,
      title: req.body.title || 'New Chat',
      model: req.body.model || 'qwen/qwen3.5-397b-a22b',
      mode: req.body.mode || 'EXPERT'
    });
    // Increment stats via direct SQL
    await sql`UPDATE users SET total_chats = total_chats + 1 WHERE id = ${req.user.id}`;
    res.status(201).json({ chat });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Error creating chat' });
  }
});

// GET /api/chats/:id — get specific chat
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat' });
  }
});

// PUT /api/chats/:id — update chat title
router.put('/:id', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const { rows } = await sql`
      UPDATE chats 
      SET title = ${title}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING *;
    `;
    if (rows.length === 0) return res.status(404).json({ message: 'Chat not found' });
    res.json({ chat: rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error updating chat' });
  }
});

// DELETE /api/chats/:id — delete chat
router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);
    res.json({ message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting chat' });
  }
});

// POST /api/chats/:id/messages/stream — STREAMING message endpoint
router.post('/:id/messages/stream', protect, async (req, res) => {
  try {
    const { content, type = 'text', imageUrl } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Message content required' });

    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.user_id !== req.user.id) return res.status(404).json({ message: 'Chat not found' });

    // Add user message to SQL
    const userMessage = await Message.create({
      chatId: chat.id,
      role: 'user',
      content: content.trim(),
      type: type || 'text',
      imageUrl
    });

    // Auto-generate title if first user message
    if (chat.messages.filter(m => m.role === 'user').length === 0) {
      const newTitle = content.trim().substring(0, 50) + (content.length > 50 ? '...' : '');
      await sql`UPDATE chats SET title = ${newTitle} WHERE id = ${chat.id}`;
      chat.title = newTitle;
    }

    const pKey = process.env.NVIDIA_PHI_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : bKey;

    if (!apiKey || apiKey.includes('your_nvidia')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ token: 'Intelligence Core Offline: API key not configured.', done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
      return res.end();
    }

    // Build history from SQL messages
    const conversationHistory = chat.messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [{ role: 'system', content: SYSTEM_PROMPT + `\n\nMode: ${chat.mode}` }, ...conversationHistory],
        temperature: 0.6,
        max_tokens: 4096,
        stream: true
      })
    });

    if (!apiResponse.ok) throw new Error(`NVIDIA API Error: ${apiResponse.status}`);

    let fullResponse = '';
    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const token = JSON.parse(line.slice(6)).choices[0].delta.content || '';
            fullResponse += token;
            res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          } catch (e) {}
        }
      }
    }

    // Save Assistant response to SQL
    await Message.create({ chatId: chat.id, role: 'assistant', content: fullResponse.trim() });
    
    // Update user stats (Atomic increment)
    await sql`UPDATE users SET total_messages = total_messages + 2 WHERE id = ${req.user.id}`;

    res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ token: `\nError: ${error.message}`, done: true })}\n\n`);
    res.end();
  }
});

// POST /api/chats/incognito/stream — Zero persistence stream
router.post('/incognito/stream', protect, async (req, res) => {
  try {
    const { content, mode = 'EXPERT' } = req.body;
    const pKey = process.env.NVIDIA_PHI_API_KEY;
    const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : process.env.NVIDIA_API_KEY;

    res.setHeader('Content-Type', 'text/event-stream');
    res.flushHeaders();

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [{ role: 'system', content: SYSTEM_PROMPT + `\n\n[INCOGNITO MODE ACTIVE]` }, { role: 'user', content }],
        stream: true
      })
    });

    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const tokens = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
      for (const l of tokens) {
        try {
          const t = JSON.parse(l.slice(6)).choices[0].delta.content;
          if (t) res.write(`data: ${JSON.stringify({ token: t, done: false })}\n\n`);
        } catch (e) {}
      }
    }
    res.write(`data: ${JSON.stringify({ done: true, incognito: true })}\n\n`);
    res.end();
  } catch (error) {
    res.end();
  }
});

// POST /api/chats/quick/stream — Creates chat + stream
router.post('/quick/stream', protect, async (req, res) => {
  try {
    const { content, mode = 'EXPERT' } = req.body;
    const chat = await Chat.create({ userId: req.user.id, title: content.substring(0, 50), mode });
    await sql`UPDATE users SET total_chats = total_chats + 1 WHERE id = ${req.user.id}`;
    
    // Save User message
    await Message.create({ chatId: chat.id, role: 'user', content });

    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ chatId: chat.id, chatTitle: chat.title })}\n\n`);

    const pKey = process.env.NVIDIA_PHI_API_KEY;
    const apiKey = (pKey && !pKey.includes('your_nvidia')) ? pKey : process.env.NVIDIA_API_KEY;

    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        model: 'microsoft/phi-3-mini-128k-instruct',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }],
        stream: true
      })
    });

    let fullResp = '';
    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
      for (const l of lines) {
        try {
          const t = JSON.parse(l.slice(6)).choices[0].delta.content;
          if (t) { fullResp += t; res.write(`data: ${JSON.stringify({ token: t, done: false })}\n\n`); }
        } catch (e) {}
      }
    }

    await Message.create({ chatId: chat.id, role: 'assistant', content: fullResp.trim() });
    res.write(`data: ${JSON.stringify({ done: true, chatTitle: chat.title })}\n\n`);
    res.end();
  } catch (error) {
    res.end();
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
    
    // Search in both titles and message content using SQL ILIKE
    const { rows } = await sql`
      SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at 
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.user_id = ${req.user.id}
      AND (c.title ILIKE ${'%' + q + '%'} OR m.content ILIKE ${'%' + q + '%'})
      ORDER BY c.updated_at DESC;
    `;
    res.json({ chats: rows });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching chats' });
  }
});

module.exports = router;
