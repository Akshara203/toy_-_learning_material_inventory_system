import express from 'express';
import { query, logActivity, evaluateReorderAlert } from '../../database/db.js';
import { authenticateToken, authorizeRoles } from '../auth_middleware.js';

const router = express.Router();

// GET /api/stock/history (Supports query details, items populating)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const movements = await query(`
      SELECT m.id, m.item_id AS itemId, m.type, m.quantity, m.reason, 
             m.user_id AS userId, m.created_at AS createdAt, 
             i.name AS itemName, i.sku AS itemSku, u.username
      FROM stock_movements m
      LEFT JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `);
    res.json(movements);
  } catch (err) {
    console.error('Fetch stock history error:', err);
    res.status(500).json({ error: 'Internal server error fetching stock movements' });
  }
});

// POST /api/stock/in (Check-in / Add supplies)
router.post('/in', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  const { itemId, quantity, reason } = req.body;

  if (!itemId || !quantity || parseInt(quantity) <= 0) {
    res.status(400).json({ error: 'Valid Item ID and positive quantity are required' });
    return;
  }

  const iid = parseInt(itemId);
  const qty = parseInt(quantity);

  try {
    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [iid]);
    const item = items[0];

    if (!item) {
      res.status(404).json({ error: 'Inventory item does not exist' });
      return;
    }

    const mReason = reason || 'Supplies check-in';

    // Transaction-like sequential execution
    await query(
      'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
      [qty, iid]
    );

    const mResult = await query(
      'INSERT INTO stock_movements (item_id, type, quantity, reason, user_id) VALUES (?, "In", ?, ?, ?)',
      [iid, qty, mReason, req.user.id]
    );

    const insertedMovementId = mResult.insertId;

    await evaluateReorderAlert(iid);

    await logActivity(
      req.user.id,
      'Stock Checked In',
      `Checked in +${qty} units of ${item.name} (${item.sku}). Reason: ${mReason}`
    );

    const updatedItems = await query('SELECT * FROM inventory_items WHERE id = ?', [iid]);

    // Format output consistent with FE expectations
    res.status(201).json({
      message: 'Stock updated successfully',
      movement: {
        id: insertedMovementId,
        itemId: iid,
        type: 'In',
        quantity: qty,
        reason: mReason,
        userId: req.user.id,
        createdAt: new Date().toISOString()
      },
      item: {
        id: updatedItems[0].id,
        name: updatedItems[0].name,
        categoryId: updatedItems[0].category_id,
        sku: updatedItems[0].sku,
        description: updatedItems[0].description,
        quantity: updatedItems[0].quantity,
        minRequired: updatedItems[0].min_required,
        location: updatedItems[0].location,
        supplier: updatedItems[0].supplier,
        createdAt: updatedItems[0].created_at
      }
    });
  } catch (err) {
    console.error('Stock In error:', err);
    res.status(500).json({ error: 'Failed to update stock in database.' });
  }
});

// POST /api/stock/out (Check-out / Consume files)
router.post('/out', authenticateToken, async (req, res) => {
  const { itemId, quantity, reason } = req.body;

  if (!itemId || !quantity || parseInt(quantity) <= 0) {
    res.status(400).json({ error: 'Valid Item ID and positive quantity are required' });
    return;
  }

  const iid = parseInt(itemId);
  const qty = parseInt(quantity);

  try {
    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [iid]);
    const item = items[0];

    if (!item) {
      res.status(404).json({ error: 'Inventory item does not exist' });
      return;
    }

    if (item.quantity < qty) {
      res.status(400).json({ 
        error: `Insufficient stock. Requested ${qty}, but only ${item.quantity} available in storage.` 
      });
      return;
    }

    const mReason = reason || 'Classroom checkout';

    await query(
      'UPDATE inventory_items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?',
      [qty, iid]
    );

    const mResult = await query(
      'INSERT INTO stock_movements (item_id, type, quantity, reason, user_id) VALUES (?, "Out", ?, ?, ?)',
      [iid, qty, mReason, req.user.id]
    );

    const insertedMovementId = mResult.insertId;

    await evaluateReorderAlert(iid);

    await logActivity(
      req.user.id,
      'Stock Checked Out',
      `Checked out -${qty} units of ${item.name} (${item.sku}). Reason: ${mReason}`
    );

    const updatedItems = await query('SELECT * FROM inventory_items WHERE id = ?', [iid]);

    res.status(201).json({
      message: 'Stock checked out successfully',
      movement: {
        id: insertedMovementId,
        itemId: iid,
        type: 'Out',
        quantity: qty,
        reason: mReason,
        userId: req.user.id,
        createdAt: new Date().toISOString()
      },
      item: {
        id: updatedItems[0].id,
        name: updatedItems[0].name,
        categoryId: updatedItems[0].category_id,
        sku: updatedItems[0].sku,
        description: updatedItems[0].description,
        quantity: updatedItems[0].quantity,
        minRequired: updatedItems[0].min_required,
        location: updatedItems[0].location,
        supplier: updatedItems[0].supplier,
        createdAt: updatedItems[0].created_at
      }
    });
  } catch (err) {
    console.error('Stock Out error:', err);
    res.status(500).json({ error: 'Failed to process checkout transaction.' });
  }
});

export default router;
