import express from 'express';
import { query, logActivity } from '../../database/db.js';
import { authenticateToken, authorizeRoles } from '../auth_middleware.js';

const router = express.Router();

// GET /api/categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await query('SELECT * FROM categories');
    res.json(list);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Internal server error fetching categories' });
  }
});

// POST /api/categories (Admin and Store Manager only)
router.post('/', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }

  try {
    const dup = await query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (dup && dup.length > 0) {
      res.status(400).json({ error: 'A classroom category with this name already exists' });
      return;
    }

    const result = await query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name.trim(), description || '']
    );

    const insertedId = result.insertId;

    await logActivity(
      req.user?.id || null, 
      'Category Created', 
      `Registered brand new classroom inventory category: ${name.trim()}`
    );

    res.status(201).json({
      id: insertedId,
      name: name.trim(),
      description: description || ''
    });
  } catch (err) {
    console.error('Post categories error:', err);
    res.status(500).json({ error: 'Internal server error creating category' });
  }
});

export default router;
