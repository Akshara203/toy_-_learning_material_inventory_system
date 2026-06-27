import express from 'express';
import { query } from '../../database/db.js';
import { authenticateToken } from '../auth_middleware.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [
      totalUniqueRes,
      availableStockRes,
      lowStockRes,
      activeDamagedRes,
      todaysMovementsRes,
      activeAlerts,
      recentLogs
    ] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM inventory_items'),
      query('SELECT COALESCE(SUM(quantity), 0) AS sum FROM inventory_items'),
      query('SELECT COUNT(*) AS count FROM inventory_items WHERE quantity < min_required'),
      query('SELECT COALESCE(SUM(quantity), 0) AS sum FROM damaged_items WHERE status = "Reported"'),
      query('SELECT COUNT(*) AS count FROM stock_movements WHERE created_at >= CURDATE()'),
      query(`
        SELECT a.id, a.item_id AS itemId, a.created_at AS createdAt,
               i.name AS itemName, i.sku AS itemSku, i.quantity, 
               i.min_required AS minRequired, i.location
        FROM reorder_alerts a
        JOIN inventory_items i ON a.item_id = i.id
        WHERE a.status = "Active"
      `),
      query(`
        SELECT l.id, l.user_id AS userId, l.action, l.details, l.created_at AS createdAt,
               u.username
        FROM activity_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 6
      `)
    ]);

    res.json({
      totalUniqueItems: totalUniqueRes[0].count,
      availableStock: Number(availableStockRes[0].sum),
      lowStockCount: lowStockRes[0].count,
      activeDamagedCount: Number(activeDamagedRes[0].sum),
      todaysMovementsCount: todaysMovementsRes[0].count,
      activeAlerts,
      recentLogs
    });
  } catch (err) {
    console.error('Fetch dashboard overview error:', err);
    res.status(500).json({ error: 'Could not connect to back-end API. Please inspect connection codes.' });
  }
});

export default router;
