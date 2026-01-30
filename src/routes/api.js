const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to verify bill ownership
async function verifyOwnership(billId, user) {
  const bill = await db.query('SELECT * FROM bills WHERE id = $1', [billId]);
  if (bill.rows.length === 0) return null;
  if (bill.rows[0].created_by !== (user.username || user.email)) return null;
  return bill.rows[0];
}

// Add item
router.post('/bills/:id/items', async (req, res) => {
  const { name, price, quantity } = req.body;
  const bill = await verifyOwnership(req.params.id, req.user);
  if (!bill) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await db.query(
      'INSERT INTO items (bill_id, name, price, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, name, parseFloat(price) || 0, parseInt(quantity) || 1]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update item
router.put('/items/:id', async (req, res) => {
  const { name, price, quantity } = req.body;
  try {
    const item = await db.query('SELECT bill_id FROM items WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    const bill = await verifyOwnership(item.rows[0].bill_id, req.user);
    if (!bill) return res.status(403).json({ error: 'Access denied' });

    const result = await db.query(
      'UPDATE items SET name = $1, price = $2, quantity = $3 WHERE id = $4 RETURNING *',
      [name, parseFloat(price) || 0, parseInt(quantity) || 1, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/items/:id', async (req, res) => {
  try {
    const item = await db.query('SELECT bill_id FROM items WHERE id = $1', [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    const bill = await verifyOwnership(item.rows[0].bill_id, req.user);
    if (!bill) return res.status(403).json({ error: 'Access denied' });

    await db.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Add participant
router.post('/bills/:id/participants', async (req, res) => {
  const { name } = req.body;
  const bill = await verifyOwnership(req.params.id, req.user);
  if (!bill) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await db.query(
      'INSERT INTO participants (bill_id, name) VALUES ($1, $2) RETURNING *',
      [req.params.id, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// Delete participant
router.delete('/participants/:id', async (req, res) => {
  try {
    const p = await db.query('SELECT bill_id FROM participants WHERE id = $1', [req.params.id]);
    if (p.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
    
    const bill = await verifyOwnership(p.rows[0].bill_id, req.user);
    if (!bill) return res.status(403).json({ error: 'Access denied' });

    await db.query('DELETE FROM participants WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete participant' });
  }
});

// Assign item to participant
router.post('/items/:itemId/assign/:participantId', async (req, res) => {
  try {
    const item = await db.query('SELECT bill_id FROM items WHERE id = $1', [req.params.itemId]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    const bill = await verifyOwnership(item.rows[0].bill_id, req.user);
    if (!bill) return res.status(403).json({ error: 'Access denied' });

    await db.query(
      'INSERT INTO item_assignments (item_id, participant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.itemId, req.params.participantId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign item' });
  }
});

// Unassign item from participant
router.delete('/items/:itemId/assign/:participantId', async (req, res) => {
  try {
    const item = await db.query('SELECT bill_id FROM items WHERE id = $1', [req.params.itemId]);
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    const bill = await verifyOwnership(item.rows[0].bill_id, req.user);
    if (!bill) return res.status(403).json({ error: 'Access denied' });

    await db.query(
      'DELETE FROM item_assignments WHERE item_id = $1 AND participant_id = $2',
      [req.params.itemId, req.params.participantId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unassign item' });
  }
});

// Update bill settings (tax, tip)
router.put('/bills/:id/settings', async (req, res) => {
  const { tax_percent, tip_percent } = req.body;
  const bill = await verifyOwnership(req.params.id, req.user);
  if (!bill) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await db.query(
      'UPDATE bills SET tax_percent = $1, tip_percent = $2 WHERE id = $3 RETURNING *',
      [parseFloat(tax_percent) || 0, parseFloat(tip_percent) || 0, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get bill summary with calculations
router.get('/bills/:id/summary', async (req, res) => {
  try {
    const bill = await db.query('SELECT * FROM bills WHERE id = $1', [req.params.id]);
    if (bill.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });

    // Allow owner to access
    const isOwner = bill.rows[0].created_by === (req.user?.username || req.user?.email);
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    const summary = await calculateSummary(bill.rows[0]);
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate summary' });
  }
});

async function calculateSummary(bill) {
  const items = await db.query('SELECT * FROM items WHERE bill_id = $1', [bill.id]);
  const participants = await db.query('SELECT * FROM participants WHERE bill_id = $1', [bill.id]);
  const assignments = await db.query(
    `SELECT ia.*, i.price, i.quantity, i.name as item_name, p.name as participant_name
     FROM item_assignments ia
     JOIN items i ON ia.item_id = i.id
     JOIN participants p ON ia.participant_id = p.id
     WHERE i.bill_id = $1`,
    [bill.id]
  );

  // Calculate subtotal
  const subtotal = items.rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * (bill.tax_percent || 0) / 100;
  const tipAmount = subtotal * (bill.tip_percent || 0) / 100;
  const total = subtotal + taxAmount + tipAmount;

  // Calculate per-person shares
  const shares = {};
  participants.rows.forEach(p => {
    shares[p.id] = { name: p.name, itemsTotal: 0, items: [] };
  });

  // Group assignments by item to split equally among sharers
  const itemSharers = {};
  assignments.rows.forEach(a => {
    if (!itemSharers[a.item_id]) {
      itemSharers[a.item_id] = { price: a.price * a.quantity, sharers: [], name: a.item_name };
    }
    itemSharers[a.item_id].sharers.push(a.participant_id);
  });

  // Distribute item costs
  Object.values(itemSharers).forEach(item => {
    const perPerson = item.price / item.sharers.length;
    item.sharers.forEach(pid => {
      if (shares[pid]) {
        shares[pid].itemsTotal += perPerson;
        shares[pid].items.push({ name: item.name, amount: perPerson });
      }
    });
  });

  // Add proportional tax and tip
  const result = [];
  Object.entries(shares).forEach(([id, share]) => {
    const proportion = subtotal > 0 ? share.itemsTotal / subtotal : 0;
    const taxShare = taxAmount * proportion;
    const tipShare = tipAmount * proportion;
    result.push({
      id: parseInt(id),
      name: share.name,
      itemsTotal: Math.round(share.itemsTotal * 100) / 100,
      tax: Math.round(taxShare * 100) / 100,
      tip: Math.round(tipShare * 100) / 100,
      total: Math.round((share.itemsTotal + taxShare + tipShare) * 100) / 100,
      items: share.items
    });
  });

  return {
    bill: {
      id: bill.id,
      name: bill.name,
      currency: bill.currency,
      tax_percent: bill.tax_percent,
      tip_percent: bill.tip_percent
    },
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(taxAmount * 100) / 100,
    tip: Math.round(tipAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    shares: result
  };
}

module.exports = router;
module.exports.calculateSummary = calculateSummary;
