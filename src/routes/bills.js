const express = require('express');
const router = express.Router();
const db = require('../db');
const { nanoid } = require('nanoid');

// Home - list user's bills
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM bills WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.username || req.user.email]
    );
    res.render('home', { bills: result.rows, user: req.user });
  } catch (err) {
    console.error(err);
    res.render('home', { bills: [], user: req.user });
  }
});

// Create new bill form
router.get('/new', (req, res) => {
  res.render('new-bill', { user: req.user });
});

// Create bill
router.post('/bills', async (req, res) => {
  const { name, currency } = req.body;
  const shareId = nanoid(10);
  
  try {
    const result = await db.query(
      'INSERT INTO bills (name, currency, share_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, currency || 'THB', shareId, req.user.username || req.user.email]
    );
    res.redirect('/bills/' + result.rows[0].id);
  } catch (err) {
    console.error(err);
    res.redirect('/new?error=1');
  }
});

// View bill
router.get('/bills/:id', async (req, res) => {
  try {
    const bill = await db.query('SELECT * FROM bills WHERE id = $1', [req.params.id]);
    if (bill.rows.length === 0) return res.status(404).render('error', { message: 'Bill not found' });
    
    // Check ownership
    if (bill.rows[0].created_by !== (req.user.username || req.user.email)) {
      return res.status(403).render('error', { message: 'Access denied' });
    }

    const items = await db.query('SELECT * FROM items WHERE bill_id = $1 ORDER BY id', [req.params.id]);
    const participants = await db.query('SELECT * FROM participants WHERE bill_id = $1 ORDER BY id', [req.params.id]);
    const assignments = await db.query(
      'SELECT * FROM item_assignments WHERE item_id IN (SELECT id FROM items WHERE bill_id = $1)',
      [req.params.id]
    );

    res.render('bill', {
      bill: bill.rows[0],
      items: items.rows,
      participants: participants.rows,
      assignments: assignments.rows,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Database error' });
  }
});

// Delete bill
router.post('/bills/:id/delete', async (req, res) => {
  try {
    const bill = await db.query('SELECT * FROM bills WHERE id = $1', [req.params.id]);
    if (bill.rows.length === 0 || bill.rows[0].created_by !== (req.user.username || req.user.email)) {
      return res.status(403).render('error', { message: 'Access denied' });
    }
    
    await db.query('DELETE FROM bills WHERE id = $1', [req.params.id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

module.exports = router;
