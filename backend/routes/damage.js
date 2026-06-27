import express from 'express';
import { query, logActivity, evaluateReorderAlert } from '../../database/db.js';
import { authenticateToken, authorizeRoles } from '../auth_middleware.js';

const router = express.Router();

// GET /api/damage
router.get('/', authenticateToken, async (req, res) => {
  try {
    const records = await query(`
      SELECT d.id, d.item_id AS itemId, d.quantity, d.reported_by AS reportedBy, 
             d.notes, d.status, d.created_at AS createdAt,
             i.name AS itemName, i.sku AS itemSku, u.username AS reporterName
      FROM damaged_items d
      LEFT JOIN inventory_items i ON d.item_id = i.id
      LEFT JOIN users u ON d.reported_by = u.id
      ORDER BY d.created_at DESC
    `);
    res.json(records);
  } catch (err) {
    console.error('Fetch damage records error:', err);
    res.status(500).json({ error: 'Internal server error fetching damage reports' });
  }
});

// POST /api/damage (Report brand new damage)
router.post('/', authenticateToken, async (req, res) => {
  const { itemId, quantity, notes } = req.body;

  if (!itemId || !quantity || parseInt(quantity) <= 0) {
    res.status(400).json({ error: 'Valid Item ID and positive quantity of damaged material are required' });
    return;
  }

  const iid = parseInt(itemId);
  const qty = parseInt(quantity);

  try {
    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [iid]);
    const item = items[0];

    if (!item) {
      res.status(404).json({ error: 'Inventory material does not exist in our books' });
      return;
    }

    if (item.quantity < qty) {
      res.status(400).json({
        error: `Cannot report more damage (${qty}) than currently available stock (${item.quantity})`
      });
      return;
    }

    // 1. Deduct quantum from inventory item
    await query(
      'UPDATE inventory_items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?',
      [qty, iid]
    );

    // 2. Insert stock movement (type: 'Out')
    const finalNotes = notes || 'No comments provided';
    await query(
      'INSERT INTO stock_movements (item_id, type, quantity, reason, user_id) VALUES (?, "Out", ?, ?, ?)',
      [iid, qty, `Damaged reported: ${finalNotes}`, req.user.id]
    );

    // 3. Insert damaged_items entry
    const dResult = await query(
      'INSERT INTO damaged_items (item_id, quantity, reported_by, notes, status) VALUES (?, ?, ?, ?, "Reported")',
      [iid, qty, req.user.id, finalNotes]
    );

    const insertedDamageId = dResult.insertId;

    // 4. Run reorder alert checks
    await evaluateReorderAlert(iid);

    // 5. Log activity
    await logActivity(
      req.user.id,
      'Damage Reported',
      `Reported ${qty} units of ${item.name} (${item.sku}) as damaged. Notes: ${finalNotes}`
    );

    res.status(201).json({
      id: insertedDamageId,
      itemId: iid,
      quantity: qty,
      reportedBy: req.user.id,
      notes: finalNotes,
      status: 'Reported',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Report damage error:', err);
    res.status(500).json({ error: 'Failed to file damage report in database.' });
  }
});

// PUT /api/damage/:id (Update damage status to Repaired or Discarded)
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  const validStatuses = ['Reported', 'Repaired', 'Discarded'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const damages = await query('SELECT * FROM damaged_items WHERE id = ?', [id]);
    const currentDamage = damages[0];

    if (!currentDamage) {
      res.status(404).json({ error: 'Damaged item record not found' });
      return;
    }

    const oldStatus = currentDamage.status;
    const itemId = currentDamage.item_id;
    const qty = currentDamage.quantity;

    // Update status
    await query('UPDATE damaged_items SET status = ? WHERE id = ?', [status, id]);

    // If status changes to Repaired from anything else, restore stock
    if (status === 'Repaired' && oldStatus !== 'Repaired') {
      await query(
        'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
        [qty, itemId]
      );

      // Auto-procure stock movement in
      await query(
        'INSERT INTO stock_movements (item_id, type, quantity, reason, user_id) VALUES (?, "In", ?, "Repaired item checked-in back", ?)',
        [itemId, qty, req.user.id]
      );

      await evaluateReorderAlert(itemId);
    }

    const items = await query('SELECT name FROM inventory_items WHERE id = ?', [itemId]);
    const itemObj = items[0];

    await logActivity(
      req.user.id,
      'Damage Status Cleaned',
      `Changed damage status to ${status} on record #${id} - item: ${itemObj?.name || 'Deleted material'}`
    );

    res.json({
      message: 'Damage record updated successfully',
      damaged: {
        id,
        itemId,
        quantity: qty,
        reportedBy: currentDamage.reported_by,
        notes: currentDamage.notes,
        status,
        createdAt: currentDamage.created_at
      }
    });
  } catch (err) {
    console.error('Update damage status error:', err);
    res.status(500).json({ error: 'Failed to update status on damage report.' });
  }
});

export default router;
