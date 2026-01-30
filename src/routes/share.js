const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateSummary } = require('./api');

// Public share page (no auth required)
router.get('/:shareId', async (req, res) => {
  try {
    const bill = await db.query('SELECT * FROM bills WHERE share_id = $1', [req.params.shareId]);
    if (bill.rows.length === 0) {
      return res.status(404).render('error', { message: 'Bill not found' });
    }

    const summary = await calculateSummary(bill.rows[0]);
    res.render('share', { summary, shareId: req.params.shareId });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load bill' });
  }
});

// Public API endpoint for share data
router.get('/:shareId/json', async (req, res) => {
  try {
    const bill = await db.query('SELECT * FROM bills WHERE share_id = $1', [req.params.shareId]);
    if (bill.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const summary = await calculateSummary(bill.rows[0]);
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bill' });
  }
});

module.exports = router;
