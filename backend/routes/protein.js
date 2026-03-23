const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/protein/fold — Predict 3D protein structure using Meta ESMFold
router.post('/fold', protect, async (req, res) => {
  try {
    const { sequence } = req.body;

    if (!sequence || typeof sequence !== 'string') {
      return res.status(400).json({ message: 'Amino acid sequence is required.' });
    }

    // Validate: only valid amino acid characters
    const cleaned = sequence.replace(/\s/g, '').toUpperCase();
    const validAA = /^[ACDEFGHIKLMNPQRSTVWY]+$/;
    if (!validAA.test(cleaned)) {
      return res.status(400).json({ 
        message: 'Invalid sequence. Only standard amino acid letters (A,C,D,E,F,G,H,I,K,L,M,N,P,Q,R,S,T,V,W,Y) are allowed.' 
      });
    }

    if (cleaned.length < 10) {
      return res.status(400).json({ message: 'Sequence too short. Minimum 10 amino acids required.' });
    }

    if (cleaned.length > 1024) {
      return res.status(400).json({ message: 'Sequence too long. Maximum 1024 amino acids.' });
    }

    const eKey = process.env.NVIDIA_ESMFOLD_API_KEY;
    const bKey = process.env.NVIDIA_API_KEY;
    const apiKey = (eKey && !eKey.includes('your_nvidia')) ? eKey : bKey;

    if (!apiKey || apiKey.includes('your_nvidia')) {
      return res.status(500).json({ message: 'NVIDIA ESMFold API key not configured.' });
    }

    console.log(`🧬 ESMFold: Predicting structure for ${cleaned.length} residues...`);

    const response = await fetch('https://health.api.nvidia.com/v1/biology/nvidia/esmfold', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ sequence: cleaned })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ESMFold API error:', response.status, errText);
      return res.status(response.status).json({ 
        message: `Protein folding prediction failed (${response.status})` 
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // ESMFold returns PDB format text
    if (contentType.includes('text') || contentType.includes('pdb')) {
      const pdbData = await response.text();
      console.log(`✅ ESMFold: Structure predicted successfully (${pdbData.length} bytes PDB)`);
      return res.json({ 
        success: true, 
        pdbData,
        residueCount: cleaned.length,
        format: 'pdb'
      });
    }

    // JSON response
    const data = await response.json();
    console.log('✅ ESMFold: Structure predicted successfully');
    res.json({ 
      success: true, 
      ...data,
      residueCount: cleaned.length
    });

  } catch (error) {
    console.error('ESMFold exception:', error);
    res.status(500).json({ message: 'Internal server error during protein folding.' });
  }
});

module.exports = router;
