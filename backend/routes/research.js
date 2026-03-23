const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// POST /api/research — Update research stats (Mongoose)
router.post('/', protect, async (req, res) => {
  try {
    const { topic } = req.body;
    // Perform research logic...
    
    await User.findByIdAndUpdate(req.user._id, { 
      $inc: { 
        'stats.researchDone': 1,
        'stats.researchPoints': 50
      } 
    });

    res.json({ success: true, message: 'Research completed' });
  } catch (error) {
    res.status(500).json({ message: 'Research failed' });
  }
});

module.exports = router;
