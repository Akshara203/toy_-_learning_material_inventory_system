import express from 'express';
import { query } from '../../database/db.js';
import { authenticateToken, authorizeRoles } from '../auth_middleware.js';

const router = express.Router();

// GET /api/reports/inventory
router.get('/inventory', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  try {
    const reportData = await query(`
      SELECT i.id, i.sku, i.name, c.name AS categoryName, i.quantity, 
             i.min_required AS minRequired,
             IF(i.quantity < i.min_required, 'LOW STOCK', 'HEALTHY') AS status,
             COALESCE(NULLIF(i.location, ''), 'Not Specified') AS location,
             COALESCE(NULLIF(i.supplier, ''), 'Not Specified') AS supplier,
             i.created_at AS createdAt
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
    `);

    res.json({
      generatedAt: new Date().toISOString(),
      itemsCount: reportData.length,
      lowStockCount: reportData.filter(i => i.status === 'LOW STOCK').length,
      data: reportData
    });
  } catch (err) {
    console.error('Fetch inventory reports error:', err);
    res.status(500).json({ error: 'Failed to generate inventory analytical report.' });
  }
});

// GET /api/reports/damage
router.get('/damage', authenticateToken, authorizeRoles('Admin', 'Store Manager'), async (req, res) => {
  try {
    const details = await query(`
      SELECT d.id, COALESCE(i.sku, 'N/A') AS sku, COALESCE(i.name, 'Deleted Material') AS itemName, 
             d.quantity, COALESCE(u.username, 'Unknown Staff') AS reportedBy, 
             d.notes, d.status, d.created_at AS createdAt
      FROM damaged_items d
      LEFT JOIN inventory_items i ON d.item_id = i.id
      LEFT JOIN users u ON d.reported_by = u.id
      ORDER BY d.created_at DESC
    `);

    // Calculate high-level metrics
    const totalReports = details.length;
    const totalDamagedQty = details.reduce((sum, d) => sum + d.quantity, 0);
    const activeReports = details.filter(d => d.status === 'Reported').length;
    const repairedReports = details.filter(d => d.status === 'Repaired').length;
    const discardedReports = details.filter(d => d.status === 'Discarded').length;

    res.json({
      generatedAt: new Date().toISOString(),
      metrics: {
        totalReports,
        totalDamagedQty,
        activeReports,
        repairedReports,
        discardedReports
      },
      data: details
    });
  } catch (err) {
    console.error('Fetch damage reports error:', err);
    res.status(500).json({ error: 'Failed to generate materials damage analytical report.' });
  }
});

export default router;
