import express from 'express';
import { query, logActivity, evaluateReorderAlert } from '../../database/db.js';
import { authenticateToken, authorizeRoles } from '../auth_middleware.js';

const router = express.Router();

// GET /api/inventory (Supports querying & filters)
router.get('/', authenticateToken, async (req, res) => {
  const { q, categoryId } = req.query;

  try {
    let sql = `
      SELECT i.id, i.name, i.category_id AS categoryId, i.sku, i.description, 
             i.quantity, i.min_required AS minRequired, i.location, i.supplier, 
             i.created_at AS createdAt, c.name AS categoryName
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Search filter
    if (q) {
      sql += ` AND (LOWER(i.name) LIKE ? OR LOWER(i.sku) LIKE ? OR LOWER(i.description) LIKE ? OR LOWER(i.location) LIKE ?)`;
      const term = `%${q.toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    // Category filter
    if (categoryId) {
      sql += ' AND i.category_id = ?';
      params.push(parseInt(categoryId));
    }

    sql += ' ORDER BY i.id DESC';

    const items = await query(sql, params);
    res.json(items);
  } catch (err) {
    console.error('Fetch inventory list error:', err);
    res.status(500).json({ error: 'Internal database error. Please retry.' });
  }
});

// GET /api/inventory/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const items = await query(`
      SELECT i.id, i.name, i.category_id AS categoryId, i.sku, i.description, 
             i.quantity, i.min_required AS minRequired, i.location, i.supplier, 
             i.created_at AS createdAt, c.name AS categoryName
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = ?
    `, [id]);

    const item = items[0];
    if (!item) {
      res.status(404).json({ error: 'Inventory material not found' });
      return;
    }

    res.json(item);
  } catch (err) {
    console.error('Fetch inventory details error:', err);
    res.status(500).json({ error: 'Internal database query failure.' });
  }
});

// POST /api/inventory (Restrictive actions: Admin or Store Manager only)
router.post('/', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  const { name, categoryId, sku, description, minRequired, location, supplier } = req.body;

  if (!name || !categoryId || !sku) {
    res.status(400).json({ error: 'Name, Category select, and SKU are required' });
    return;
  }

  try {
    // Validate category relation exists
    const categories = await query('SELECT id FROM categories WHERE id = ?', [parseInt(categoryId)]);
    if (!categories || categories.length === 0) {
      res.status(400).json({ error: 'Linked classroom category does not exist' });
      return;
    }

    // Validate SKU unique constraint
    const skuConflict = await query('SELECT id FROM inventory_items WHERE LOWER(sku) = LOWER(?)', [sku.trim()]);
    if (skuConflict && skuConflict.length > 0) {
      res.status(400).json({ error: 'An inventory item with this SKU already exists' });
      return;
    }

    const minReqVal = isNaN(parseInt(minRequired)) ? 5 : parseInt(minRequired);
    const skuCode = sku.trim().toUpperCase();

    const result = await query(
      `INSERT INTO inventory_items (name, category_id, sku, description, min_required, location, supplier, quantity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [name.trim(), parseInt(categoryId), skuCode, description || '', minReqVal, location || '', supplier || '']
    );

    const insertedId = result.insertId;

    // Check alert setting
    await evaluateReorderAlert(insertedId);

    // Audit log
    await logActivity(
      req.user?.id || null, 
      'Item Created', 
      `Registered brand new material SKU: ${skuCode} (${name.trim()})`
    );

    res.status(201).json({
      id: insertedId,
      name: name.trim(),
      categoryId: parseInt(categoryId),
      sku: skuCode,
      description: description || '',
      minRequired: minReqVal,
      location: location || '',
      supplier: supplier || '',
      quantity: 0,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Create inventory item error:', err);
    res.status(500).json({ error: 'Database rejected create query. Ensure SKU is unique.' });
  }
});

// PUT /api/inventory/:id (Restrictive: Admin or Store Manager only)
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, categoryId, sku, description, minRequired, location, supplier } = req.body;

  try {
    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    const item = items[0];
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // SKU conflict check
    if (sku && sku.toLowerCase() !== item.sku.toLowerCase()) {
      const skuConflict = await query('SELECT id FROM inventory_items WHERE LOWER(sku) = LOWER(?) AND id != ?', [sku.trim(), id]);
      if (skuConflict && skuConflict.length > 0) {
        res.status(400).json({ error: 'An item with this SKU already exists' });
        return;
      }
    }

    // Category relation evaluation
    if (categoryId) {
      const categories = await query('SELECT id FROM categories WHERE id = ?', [parseInt(categoryId)]);
      if (!categories || categories.length === 0) {
        res.status(400).json({ error: 'Linked classroom category does not exist' });
        return;
      }
    }

    const nextName = name || item.name;
    const nextCategoryId = categoryId ? parseInt(categoryId) : item.category_id;
    const nextSku = sku ? sku.trim().toUpperCase() : item.sku;
    const nextDescription = description !== undefined ? description : item.description;
    const nextMinReq = minRequired !== undefined ? parseInt(minRequired) : item.min_required;
    const nextLocation = location !== undefined ? location : item.location;
    const nextSupplier = supplier !== undefined ? supplier : item.supplier;

    await query(
      `UPDATE inventory_items 
       SET name = ?, category_id = ?, sku = ?, description = ?, min_required = ?, location = ?, supplier = ? 
       WHERE id = ?`,
      [nextName, nextCategoryId, nextSku, nextDescription, nextMinReq, nextLocation, nextSupplier, id]
    );

    // Re-evaluate alert system
    await evaluateReorderAlert(id);

    // Audit Log
    await logActivity(
      req.user?.id || null, 
      'Item Updated', 
      `Updated parameters for SKU ${nextSku}`
    );

    res.json({
      id,
      name: nextName,
      categoryId: nextCategoryId,
      sku: nextSku,
      description: nextDescription,
      minRequired: nextMinReq,
      location: nextLocation,
      supplier: nextSupplier,
      quantity: item.quantity,
      createdAt: item.created_at
    });
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(500).json({ error: 'Database rejected update query. Ensure SKU is unique.' });
  }
});

// DELETE /api/inventory/:id (Restrictive: Admin or Store Manager)
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    const item = items[0];

    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    // Foreign keys with CASCADE will delete movements, damage, alerts automatically on InnoDB table
    await query('DELETE FROM inventory_items WHERE id = ?', [id]);

    await logActivity(
      req.user?.id || null, 
      'Item Deleted', 
      `Deleted SKU: ${item.sku} - Named (${item.name}) from preschool records`
    );

    res.json({ message: 'Inventory material and linked activity records deleted' });
  } catch (err) {
    console.error('Delete inventory item error:', err);
    res.status(500).json({ error: 'Failed to purge inventory item from database storage.' });
  }
});

export default router;
