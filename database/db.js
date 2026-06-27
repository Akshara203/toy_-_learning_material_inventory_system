import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'toy_inventory_db';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');

// File fallback path
const FALLBACK_FILE_PATH = path.join(process.cwd(), 'database', 'database_fallback.json');

// Preset default state corresponding to the database seeds
const DEFAULT_HASHES = {
  director: '$2b$10$nE8VG/93jB.mKQA4pJP7HOk5LxmjCwg3vvhXePk2ey9iYIjQoS/rW',
  emily: '$2b$10$meI2KNfpe0p889QMv1.TEOA1ocEgWbBwdXrP0rQ01KO.ZRY8NIqUO',
  bob: '$2b$10$gYu/z2YX.duvCPVYgtW6VOPtNKPLXv0RUTUiBlpRw6gbvYsPAzSmS'
};

let pool = null;
let useFallback = false;
let fallbackState = null;

// Initialize file fallback DB structure if missing or broken
function initFallbackState() {
  if (fallbackState) return;

  const dir = path.dirname(FALLBACK_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(FALLBACK_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
      fallbackState = JSON.parse(raw);
      
      if (fallbackState) {
        // Normalize users list (e.g., passwordHash -> password_hash, createdAt -> created_at)
        if (Array.isArray(fallbackState.users)) {
          fallbackState.users.forEach(u => {
            if (u.passwordHash !== undefined && u.password_hash === undefined) {
              u.password_hash = u.passwordHash;
            }
            if (u.createdAt !== undefined && u.created_at === undefined) {
              u.created_at = u.createdAt;
            }
          });
        }
        
        // Normalize inventory_items table
        if (fallbackState.inventoryItems && !fallbackState.inventory_items) {
          fallbackState.inventory_items = fallbackState.inventoryItems;
        }
        if (Array.isArray(fallbackState.inventory_items)) {
          fallbackState.inventory_items.forEach(i => {
            if (i.categoryId !== undefined && i.category_id === undefined) {
              i.category_id = i.categoryId;
            }
            if (i.minRequired !== undefined && i.min_required === undefined) {
              i.min_required = i.minRequired;
            }
            if (i.createdAt !== undefined && i.created_at === undefined) {
              i.created_at = i.createdAt;
            }
          });
        }
        
        // Normalize stock_movements table
        if (fallbackState.stockMovements && !fallbackState.stock_movements) {
          fallbackState.stock_movements = fallbackState.stockMovements;
        }
        if (Array.isArray(fallbackState.stock_movements)) {
          fallbackState.stock_movements.forEach(m => {
            if (m.itemId !== undefined && m.item_id === undefined) {
              m.item_id = m.itemId;
            }
            if (m.userId !== undefined && m.user_id === undefined) {
              m.user_id = m.userId;
            }
            if (m.createdAt !== undefined && m.created_at === undefined) {
              m.created_at = m.createdAt;
            }
          });
        }
        
        // Normalize damaged_items table
        if (fallbackState.damagedItems && !fallbackState.damaged_items) {
          fallbackState.damaged_items = fallbackState.damagedItems;
        }
        if (Array.isArray(fallbackState.damaged_items)) {
          fallbackState.damaged_items.forEach(d => {
            if (d.itemId !== undefined && d.item_id === undefined) {
              d.item_id = d.itemId;
            }
            if (d.reportedBy !== undefined && d.reported_by === undefined) {
              d.reported_by = d.reportedBy;
            }
            if (d.createdAt !== undefined && d.created_at === undefined) {
              d.created_at = d.createdAt;
            }
          });
        }
        
        // Normalize reorder_alerts table
        if (fallbackState.reorderAlerts && !fallbackState.reorder_alerts) {
          fallbackState.reorder_alerts = fallbackState.reorderAlerts;
        }
        if (Array.isArray(fallbackState.reorder_alerts)) {
          fallbackState.reorder_alerts.forEach(a => {
            if (a.itemId !== undefined && a.item_id === undefined) {
              a.item_id = a.itemId;
            }
            if (a.createdAt !== undefined && a.created_at === undefined) {
              a.created_at = a.createdAt;
            }
          });
        }
        
        // Normalize activity_logs table
        if (fallbackState.activityLogs && !fallbackState.activity_logs) {
          fallbackState.activity_logs = fallbackState.activityLogs;
        }
        if (Array.isArray(fallbackState.activity_logs)) {
          fallbackState.activity_logs.forEach(l => {
            if (l.userId !== undefined && l.user_id === undefined) {
              l.user_id = l.userId;
            }
            if (l.createdAt !== undefined && l.created_at === undefined) {
              l.created_at = l.createdAt;
            }
          });
        }
        
        // Normalize nextIds
        if (fallbackState.nextIds) {
          const n = fallbackState.nextIds;
          if (n.inventoryItems !== undefined && n.inventory_items === undefined) n.inventory_items = n.inventoryItems;
          if (n.stockMovements !== undefined && n.stock_movements === undefined) n.stock_movements = n.stockMovements;
          if (n.damagedItems !== undefined && n.damaged_items === undefined) n.damaged_items = n.damagedItems;
          if (n.reorderAlerts !== undefined && n.reorder_alerts === undefined) n.reorder_alerts = n.reorderAlerts;
          if (n.activityLogs !== undefined && n.activity_logs === undefined) n.activity_logs = n.activityLogs;
        } else {
          fallbackState.nextIds = {
            users: (fallbackState.users || []).length + 1,
            categories: (fallbackState.categories || []).length + 1,
            inventory_items: (fallbackState.inventory_items || []).length + 1,
            stock_movements: (fallbackState.stock_movements || []).length + 1,
            damaged_items: (fallbackState.damaged_items || []).length + 1,
            reorder_alerts: (fallbackState.reorder_alerts || []).length + 1,
            activity_logs: (fallbackState.activity_logs || []).length + 1
          };
        }
      }
      return;
    } catch (err) {
      console.warn('[Fallback DB] Failed reading file, rewriting seeds...', err.message);
    }
  }

  const now = new Date().toISOString();
  fallbackState = {
    users: [
      { id: 1, username: 'director', password_hash: DEFAULT_HASHES.director, email: 'director@preschool.com', role: 'Admin', created_at: now },
      { id: 2, username: 'miss_emily', password_hash: DEFAULT_HASHES.emily, email: 'emily@preschool.com', role: 'Teacher', created_at: now },
      { id: 3, username: 'store_bob', password_hash: DEFAULT_HASHES.bob, email: 'bob@preschool.com', role: 'Store Manager', created_at: now }
    ],
    categories: [
      { id: 1, name: 'Toys & Games', description: 'Creative and motor-skill building toys, puzzles, and board games' },
      { id: 2, name: 'Books & Media', description: 'Reading books, picture books, and digital educational assets' },
      { id: 3, name: 'Worksheets & Printables', description: 'Coloring exercises, alphabet tracing sheets, and printouts' },
      { id: 4, name: 'Art & Classroom Materials', description: 'Crayons, child-safe paint, clay, papers, and scissors' },
      { id: 5, name: 'Activity & Learning Kits', description: 'Science kits, math counting kits, and tactile puzzle kits' }
    ],
    inventory_items: [
      { id: 1, name: 'Wooden Shape Sorter Block', category_id: 1, sku: 'TOY-WD-SORT', description: 'High-quality pine-wood block sorter for spatial awareness.', quantity: 12, min_required: 5, location: 'Shelf A2 - Toys', supplier: 'EarlyYears Supply Co.', created_at: now },
      { id: 2, name: 'Dr. Seuss Cat in the Hat', category_id: 2, sku: 'BOK-DS-CATH', description: 'Classic reading book for young readers.', quantity: 8, min_required: 3, location: 'Library Corner - Box 1', supplier: 'KidsBooks Distributor', created_at: now },
      { id: 3, name: 'Washable Color Markers (12-Pack)', category_id: 4, sku: 'ART-CR-MARK', description: 'Non-toxic, safe washable markers.', quantity: 25, min_required: 10, location: 'Art Cabinet - Shelf B', supplier: 'Crayola Depot', created_at: now },
      { id: 4, name: 'Alphabet Animal Coloring Sheets', category_id: 3, sku: 'WKS-AL-COLO', description: 'Printable animal character letter coloring exercises.', quantity: 150, min_required: 50, location: 'File Drawer 3', supplier: 'CreativeDay Care Internal', created_at: now },
      { id: 5, name: 'Counting Sheep Mathematics Kit', category_id: 5, sku: 'KIT-MA-COUN', description: 'A kit containing educational tactile sheep figurines and cards for arithmetic.', quantity: 2, min_required: 4, location: 'Math Lab - Box B', supplier: 'STEM Educators Ltd', created_at: now },
      { id: 6, name: 'Child-Safe Plastic Scissors', category_id: 4, sku: 'ART-SC-SAFE', description: 'Blunt metal blades encased in colorful child-safe plastic.', quantity: 4, min_required: 8, location: 'Art Cabinet - Drawer A', supplier: 'SchoolMart', created_at: now }
    ],
    stock_movements: [
      { id: 1, item_id: 1, type: 'In', quantity: 12, reason: 'Initial Procurement Stock', user_id: 3, created_at: now },
      { id: 2, item_id: 2, type: 'In', quantity: 10, reason: 'Initial Procurement Stock', user_id: 3, created_at: now },
      { id: 3, item_id: 2, type: 'Out', quantity: 2, reason: 'Damaging check out', user_id: 2, created_at: now },
      { id: 4, item_id: 3, type: 'In', quantity: 25, reason: 'Initial Store Stocking', user_id: 3, created_at: now },
      { id: 5, item_id: 4, type: 'In', quantity: 150, reason: 'Internal duplicating run', user_id: 3, created_at: now },
      { id: 6, item_id: 5, type: 'In', quantity: 2, reason: 'Initial Stocking - Low Inventory', user_id: 3, created_at: now },
      { id: 7, item_id: 6, type: 'In', quantity: 6, reason: 'Initial Stocking', user_id: 3, created_at: now },
      { id: 8, item_id: 6, type: 'Out', quantity: 2, reason: 'Broken scissors discarded', user_id: 3, created_at: now }
    ],
    damaged_items: [
      { id: 1, item_id: 2, quantity: 2, reported_by: 2, notes: 'Pages torn in the nursery classroom by toddlers.', status: 'Reported', created_at: now },
      { id: 2, item_id: 6, quantity: 2, reported_by: 3, notes: 'Plastic hinges snapped, discarded due to sharp edges.', status: 'Discarded', created_at: now }
    ],
    reorder_alerts: [
      { id: 1, item_id: 5, status: 'Active', created_at: now },
      { id: 2, item_id: 6, status: 'Active', created_at: now }
    ],
    activity_logs: [
      { id: 1, user_id: 1, action: 'Database Initialized', details: 'Fallback sandbox loaded with preset material seeds.', created_at: now }
    ],
    nextIds: {
      users: 4,
      categories: 6,
      inventory_items: 7,
      stock_movements: 9,
      damaged_items: 3,
      reorder_alerts: 3,
      activity_logs: 2
    }
  };
  saveFallbackState();
}

function saveFallbackState() {
  if (!fallbackState) return;
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(fallbackState, null, 2), 'utf8');
  } catch (err) {
    console.error('[Fallback DB] Failed saving fallback database:', err.message);
  }
}

export function getPool() {
  if (useFallback) return null;
  if (!pool) {
    try {
      pool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: DB_PORT,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        // Rapid fail if MySQL host is unreachable
        connectTimeout: 2000
      });
      console.log(`[MySQL Pool Configured] host: ${DB_HOST}:${DB_PORT}, database: ${DB_NAME}`);
    } catch (err) {
      console.warn('[MySQL Initialization Warning] Could not prepare client pool. Switching to sandbox fallback.', err.message);
      useFallback = true;
      initFallbackState();
    }
  }
  return pool;
}

// Emulated SQL execute query router
function executeFallbackQuery(sql, params = []) {
  initFallbackState();
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  const now = new Date().toISOString();

  // 1. SELECT * FROM users WHERE LOWER(username) = LOWER(?)
  if (cleanSql.includes('SELECT * FROM users WHERE LOWER(username) = LOWER(?)')) {
    const term = (params[0] || '').toLowerCase();
    const rows = fallbackState.users.filter(u => u.username.toLowerCase() === term);
    return rows;
  }

  // 1b. SELECT id, username, email, role, created_at AS createdAt FROM users
  if (cleanSql.includes('SELECT id, username, email, role, created_at AS createdAt FROM users')) {
    return fallbackState.users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.created_at
    }));
  }

  // 2. SELECT * FROM users WHERE id = ?
  if (cleanSql.includes('SELECT * FROM users WHERE id = ?')) {
    const targetId = parseInt(params[0]);
    const rows = fallbackState.users.filter(u => u.id === targetId);
    return rows;
  }

  // 3. SELECT id FROM users WHERE LOWER(username) = LOWER(?)
  if (cleanSql.includes('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')) {
    const term = (params[0] || '').toLowerCase();
    const excludeId = cleanSql.includes('id != ?') ? parseInt(params[1]) : null;
    let matches = fallbackState.users.filter(u => u.username.toLowerCase() === term);
    if (excludeId !== null && !isNaN(excludeId)) {
      matches = matches.filter(u => u.id !== excludeId);
    }
    return matches.map(m => ({ id: m.id }));
  }

  // 4. SELECT id FROM users WHERE LOWER(email) = LOWER(?)
  if (cleanSql.includes('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')) {
    const term = (params[0] || '').toLowerCase();
    const excludeId = cleanSql.includes('id != ?') ? parseInt(params[1]) : null;
    let matches = fallbackState.users.filter(u => u.email.toLowerCase() === term);
    if (excludeId !== null && !isNaN(excludeId)) {
      matches = matches.filter(u => u.id !== excludeId);
    }
    return matches.map(m => ({ id: m.id }));
  }

  // 5. INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)
  if (cleanSql.includes('INSERT INTO users (username, password_hash, email, role)')) {
    const id = fallbackState.nextIds.users++;
    const [username, password_hash, email, role] = params;
    const newUser = { id, username, password_hash, email, role, created_at: now };
    fallbackState.users.push(newUser);
    saveFallbackState();
    return { insertId: id };
  }

  // 5b. UPDATE users SET password_hash = ? WHERE id = ?
  if (cleanSql.includes('UPDATE users SET password_hash = ? WHERE id = ?')) {
    const targetId = parseInt(params[1]);
    const u = fallbackState.users.find(x => x.id === targetId);
    if (u) {
      u.password_hash = params[0];
      saveFallbackState();
    }
    return { affectedRows: 1 };
  }

  // 5c. UPDATE users SET email = ?, username = ? WHERE id = ?
  if (cleanSql.includes('UPDATE users SET email = ?, username = ? WHERE id = ?')) {
    const targetId = parseInt(params[2]);
    const u = fallbackState.users.find(x => x.id === targetId);
    if (u) {
      u.email = params[0];
      u.username = params[1];
      saveFallbackState();
    }
    return { affectedRows: 1 };
  }

  // 6. SELECT * FROM categories
  if (cleanSql.includes('SELECT * FROM categories') && !cleanSql.includes('WHERE')) {
    return fallbackState.categories;
  }

  // 7. SELECT id FROM categories WHERE LOWER(name) = LOWER(?)
  if (cleanSql.includes('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')) {
    const term = (params[0] || '').trim().toLowerCase();
    const matches = fallbackState.categories.filter(c => c.name.toLowerCase() === term);
    return matches.map(m => ({ id: m.id }));
  }

  // 8. INSERT INTO categories (name, description) VALUES (?, ?)
  if (cleanSql.includes('INSERT INTO categories (name, description)')) {
    const id = fallbackState.nextIds.categories++;
    const [name, description] = params;
    const newCat = { id, name, description: description || '' };
    fallbackState.categories.push(newCat);
    saveFallbackState();
    return { insertId: id };
  }

  // 9. SELECT i.id, i.name, i.category_id AS categoryId, i.sku, i.description... (Filtered inventory items list)
  if (cleanSql.includes('SELECT i.id, i.name, i.category_id') && cleanSql.includes('FROM inventory_items i')) {
    let list = fallbackState.inventory_items.map(item => {
      const cat = fallbackState.categories.find(c => c.id === item.category_id);
      return {
        id: item.id,
        name: item.name,
        categoryId: item.category_id,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        minRequired: item.min_required,
        location: item.location,
        supplier: item.supplier,
        createdAt: item.created_at,
        categoryName: cat ? cat.name : 'Unknown Category'
      };
    });

    // Check filters matching our exact queries
    // SQL uses variables. Let's inspect options.
    // If we have filters, let's filter the array manually.
    if (cleanSql.includes('LIKE ?')) {
      const searchTerm = (params[0] || '').replace(/%/g, '').toLowerCase();
      if (searchTerm) {
        list = list.filter(item => 
          item.name.toLowerCase().includes(searchTerm) ||
          item.sku.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm) ||
          (item.location || '').toLowerCase().includes(searchTerm)
        );
      }
    }

    if (cleanSql.includes('category_id = ?')) {
      // Find parameter. Search might append multiple params. 
      // If there was a search LIKE, categoryId will be later in params.
      const categoryIdVal = params[params.length - 1];
      list = list.filter(item => item.categoryId === parseInt(categoryIdVal));
    }

    if (cleanSql.includes('ORDER BY i.id DESC')) {
      list.sort((a, b) => b.id - a.id);
    }

    return list;
  }

  // 10. SELECT i.id, i.name... FROM inventory_items i ... WHERE i.id = ?
  if (cleanSql.includes('FROM inventory_items i') && cleanSql.includes('WHERE i.id = ?')) {
    const targetId = parseInt(params[0]);
    const item = fallbackState.inventory_items.find(i => i.id === targetId);
    if (!item) return [];
    const cat = fallbackState.categories.find(c => c.id === item.category_id);
    return [{
      id: item.id,
      name: item.name,
      categoryId: item.category_id,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      minRequired: item.min_required,
      location: item.location,
      supplier: item.supplier,
      createdAt: item.created_at,
      categoryName: cat ? cat.name : 'Unknown Category'
    }];
  }

  // 11. SELECT id FROM categories WHERE id = ?
  if (cleanSql.includes('SELECT id FROM categories WHERE id = ?')) {
    const targetId = parseInt(params[0]);
    const matches = fallbackState.categories.filter(c => c.id === targetId);
    return matches.map(m => ({ id: m.id }));
  }

  // 12. SELECT id FROM inventory_items WHERE LOWER(sku) = LOWER(?)
  if (cleanSql.includes('SELECT id FROM inventory_items WHERE LOWER(sku) = LOWER(?)') && !cleanSql.includes('id != ?')) {
    const term = (params[0] || '').trim().toLowerCase();
    const matches = fallbackState.inventory_items.filter(i => i.sku.toLowerCase() === term);
    return matches.map(m => ({ id: m.id }));
  }

  // 13. SELECT id FROM inventory_items WHERE LOWER(sku) = LOWER(?) AND id != ?
  if (cleanSql.includes('SELECT id FROM inventory_items WHERE LOWER(sku) = LOWER(?) AND id != ?')) {
    const term = (params[0] || '').trim().toLowerCase();
    const excludeId = parseInt(params[1]);
    const matches = fallbackState.inventory_items.filter(i => i.sku.toLowerCase() === term && i.id !== excludeId);
    return matches.map(m => ({ id: m.id }));
  }

  // 14. SELECT * FROM inventory_items WHERE id = ?
  if (cleanSql.includes('SELECT * FROM inventory_items WHERE id = ?')) {
    const targetId = parseInt(params[0]);
    return fallbackState.inventory_items.filter(i => i.id === targetId);
  }

  // 15. INSERT INTO inventory_items ...
  if (cleanSql.includes('INSERT INTO inventory_items')) {
    const id = fallbackState.nextIds.inventory_items++;
    const [name, category_id, sku, description, min_required, location, supplier] = params;
    const newItem = {
      id,
      name,
      category_id: parseInt(category_id),
      sku,
      description: description || '',
      min_required: parseInt(min_required),
      location: location || '',
      supplier: supplier || '',
      quantity: 0,
      created_at: now
    };
    fallbackState.inventory_items.push(newItem);
    saveFallbackState();
    return { insertId: id };
  }

  // 16. UPDATE inventory_items SET ... WHERE id = ?
  if (cleanSql.includes('UPDATE inventory_items') && cleanSql.includes('WHERE id = ?') && !cleanSql.includes('quantity')) {
    const id = parseInt(params[params.length - 1]);
    const idx = fallbackState.inventory_items.findIndex(item => item.id === id);
    if (idx !== -1) {
      const [name, category_id, sku, description, min_required, location, supplier] = params;
      fallbackState.inventory_items[idx] = {
        ...fallbackState.inventory_items[idx],
        name,
        category_id: parseInt(category_id),
        sku,
        description,
        min_required: parseInt(min_required),
        location,
        supplier
      };
      saveFallbackState();
    }
    return { affectedRows: 1 };
  }

  // 17. DELETE FROM inventory_items WHERE id = ?
  if (cleanSql.includes('DELETE FROM inventory_items WHERE id = ?')) {
    const targetId = parseInt(params[0]);
    fallbackState.inventory_items = fallbackState.inventory_items.filter(item => item.id !== targetId);
    fallbackState.stock_movements = fallbackState.stock_movements.filter(m => m.item_id !== targetId);
    fallbackState.damaged_items = fallbackState.damaged_items.filter(d => d.item_id !== targetId);
    fallbackState.reorder_alerts = fallbackState.reorder_alerts.filter(a => a.item_id !== targetId);
    saveFallbackState();
    return { affectedRows: 1 };
  }

  // 18. SELECT m.id ... FROM stock_movements m
  if (cleanSql.includes('FROM stock_movements m')) {
    const populated = fallbackState.stock_movements.map(m => {
      const item = fallbackState.inventory_items.find(i => i.id === m.item_id);
      const user = fallbackState.users.find(u => u.id === m.user_id);
      return {
        id: m.id,
        itemId: m.item_id,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        userId: m.user_id,
        createdAt: m.created_at,
        itemName: item ? item.name : 'Deleted Material',
        itemSku: item ? item.sku : 'N/A',
        username: user ? user.username : 'Unknown Staff'
      };
    });
    return populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 19. UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?
  if (cleanSql.includes('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?')) {
    const qty = parseInt(params[0]);
    const id = parseInt(params[1]);
    const idx = fallbackState.inventory_items.findIndex(item => item.id === id);
    if (idx !== -1) {
      fallbackState.inventory_items[idx].quantity += qty;
      saveFallbackState();
    }
    return { affectedRows: 1 };
  }

  // 20. UPDATE inventory_items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?
  if (cleanSql.includes('UPDATE inventory_items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?')) {
    const qty = parseInt(params[0]);
    const id = parseInt(params[1]);
    const idx = fallbackState.inventory_items.findIndex(item => item.id === id);
    if (idx !== -1) {
      fallbackState.inventory_items[idx].quantity = Math.max(0, fallbackState.inventory_items[idx].quantity - qty);
      saveFallbackState();
    }
    return { affectedRows: 1 };
  }

  // 21. INSERT INTO stock_movements
  if (cleanSql.includes('INSERT INTO stock_movements')) {
    const id = fallbackState.nextIds.stock_movements++;
    const [item_id, type, quantity, reason, user_id] = params;
    // Match type specifically from SQL structure if query handles pre-set type
    const parsedType = cleanSql.includes('"In"') ? 'In' : (cleanSql.includes('"Out"') ? 'Out' : type);
    
    // In case parameter indexes shifted
    let actualItemId = item_id;
    let actualQty = quantity;
    let actualReason = reason;
    let actualUserId = user_id;

    if (cleanSql.includes('"In"')) {
      actualItemId = params[0];
      actualQty = params[1];
      actualReason = params[2];
      actualUserId = params[3];
    } else if (cleanSql.includes('"Out"')) {
      actualItemId = params[0];
      actualQty = params[1];
      actualReason = params[2];
      actualUserId = params[3];
    }

    const newM = {
      id,
      item_id: parseInt(actualItemId),
      type: parsedType,
      quantity: parseInt(actualQty),
      reason: actualReason,
      user_id: parseInt(actualUserId),
      created_at: now
    };

    fallbackState.stock_movements.push(newM);
    saveFallbackState();
    return { insertId: id };
  }

  // 21. Reports analytical query: Inventory status reports
  if (cleanSql.includes("IF(i.quantity < i.min_required, 'LOW STOCK', 'HEALTHY') AS status")) {
    return fallbackState.inventory_items.map(item => {
      const cat = fallbackState.categories.find(c => c.id === item.category_id);
      const isLow = item.quantity < item.min_required;
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        categoryName: cat ? cat.name : 'Unknown Category',
        quantity: item.quantity,
        minRequired: item.min_required,
        status: isLow ? 'LOW STOCK' : 'HEALTHY',
        location: item.location || 'Not Specified',
        supplier: item.supplier || 'Not Specified',
        createdAt: item.created_at
      };
    });
  }

  // 21b. Reports analytical query: Damage status reports
  if (cleanSql.includes("COALESCE(u.username, 'Unknown Staff') AS reportedBy") && cleanSql.includes("FROM damaged_items d")) {
    const list = fallbackState.damaged_items.map(d => {
      const item = fallbackState.inventory_items.find(i => i.id === d.item_id);
      const user = fallbackState.users.find(u => u.id === d.reported_by);
      return {
        id: d.id,
        sku: item ? item.sku : 'N/A',
        itemName: item ? item.name : 'Deleted Material',
        quantity: d.quantity,
        reportedBy: user ? user.username : 'Unknown Staff',
        notes: d.notes,
        status: d.status,
        createdAt: d.created_at
      };
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 22. SELECT d.id ... FROM damaged_items d
  if (cleanSql.includes('FROM damaged_items d')) {
    const populated = fallbackState.damaged_items.map(d => {
      const item = fallbackState.inventory_items.find(i => i.id === d.item_id);
      const user = fallbackState.users.find(u => u.id === d.reported_by);
      return {
        id: d.id,
        itemId: d.item_id,
        quantity: d.quantity,
        reportedBy: d.reported_by,
        notes: d.notes,
        status: d.status,
        createdAt: d.created_at,
        itemName: item ? item.name : 'Deleted Material',
        itemSku: item ? item.sku : 'N/A',
        reporterName: user ? user.username : 'Unknown Staff',
        sku: item ? item.sku : 'N/A',
        reportedByUsername: user ? user.username : 'Unknown Staff'
      };
    });
    return populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 23. INSERT INTO damaged_items
  if (cleanSql.includes('INSERT INTO damaged_items')) {
    const id = fallbackState.nextIds.damaged_items++;
    const [item_id, quantity, reported_by, notes] = params;
    const newD = {
      id,
      item_id: parseInt(item_id),
      quantity: parseInt(quantity),
      reported_by: parseInt(reported_by),
      notes: notes || 'No comments',
      status: 'Reported',
      created_at: now
    };
    fallbackState.damaged_items.push(newD);
    saveFallbackState();
    return { insertId: id };
  }

  // 24. SELECT * FROM damaged_items WHERE id = ?
  if (cleanSql.includes('SELECT * FROM damaged_items WHERE id = ?')) {
    const targetId = parseInt(params[0]);
    return fallbackState.damaged_items.filter(d => d.id === targetId);
  }

  // 25. UPDATE damaged_items SET status = ? WHERE id = ?
  if (cleanSql.includes('UPDATE damaged_items SET status = ? WHERE id = ?')) {
    const status = params[0];
    const id = parseInt(params[1]);
    const idx = fallbackState.damaged_items.findIndex(d => d.id === id);
    if (idx !== -1) {
      fallbackState.damaged_items[idx].status = status;
      saveFallbackState();
    }
    return { affectedRows: 1 };
  }

  // 26. Dashboard quick stats: SELECT COUNT(*) AS count FROM inventory_items
  if (cleanSql.includes('SELECT COUNT(*) AS count FROM inventory_items') && !cleanSql.includes('WHERE')) {
    return [{ count: fallbackState.inventory_items.length }];
  }

  // 27. Dashboard stats: SELECT COALESCE(SUM(quantity), 0) AS sum FROM inventory_items
  if (cleanSql.includes('SELECT COALESCE(SUM(quantity), 0) AS sum FROM inventory_items')) {
    const total = fallbackState.inventory_items.reduce((s, i) => s + i.quantity, 0);
    return [{ sum: total }];
  }

  // 28. Dashboard stats: SELECT COUNT(*) AS count FROM inventory_items WHERE quantity < min_required
  if (cleanSql.includes('SELECT COUNT(*) AS count FROM inventory_items WHERE quantity < min_required')) {
    const count = fallbackState.inventory_items.filter(i => i.quantity < i.min_required).length;
    return [{ count }];
  }

  // 29. Dashboard stats: SELECT COALESCE(SUM(quantity), 0) AS sum FROM damaged_items WHERE status = "Reported"
  if (cleanSql.includes('SELECT COALESCE(SUM(quantity), 0) AS sum FROM damaged_items WHERE status = "Reported"')) {
    const total = fallbackState.damaged_items.filter(d => d.status === 'Reported').reduce((s, d) => s + d.quantity, 0);
    return [{ sum: total }];
  }

  // 30. Dashboard stats: SELECT COUNT(*) AS count FROM stock_movements WHERE created_at >= CURDATE()
  if (cleanSql.includes('SELECT COUNT(*) AS count FROM stock_movements WHERE created_at >= CURDATE()')) {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const count = fallbackState.stock_movements.filter(m => new Date(m.created_at) >= startOfToday).length;
    return [{ count }];
  }

  // 31. SELECT a.id... FROM reorder_alerts a
  if (cleanSql.includes('FROM reorder_alerts a')) {
    const activeAlerts = fallbackState.reorder_alerts
      .filter(alert => alert.status === 'Active')
      .map(alert => {
        const item = fallbackState.inventory_items.find(i => i.id === alert.item_id);
        return {
          id: alert.id,
          itemId: alert.item_id,
          createdAt: alert.created_at,
          itemName: item ? item.name : 'Unknown Material',
          itemSku: item ? item.sku : 'N/A',
          quantity: item ? item.quantity : 0,
          minRequired: item ? item.min_required : 0,
          location: item ? item.location : 'N/A'
        };
      });
    return activeAlerts;
  }

  // 32. SELECT l.id ... FROM activity_logs l
  if (cleanSql.includes('FROM activity_logs l')) {
    const populated = fallbackState.activity_logs.map(log => {
      const user = fallbackState.users.find(u => u.id === log.user_id);
      return {
        id: log.id,
        userId: log.user_id,
        action: log.action,
        details: log.details,
        createdAt: log.created_at,
        username: user ? user.username : 'System'
      };
    });
    return populated
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }

  // 33. INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)
  if (cleanSql.includes('INSERT INTO activity_logs')) {
    const id = fallbackState.nextIds.activity_logs++;
    const [user_id, action, details] = params;
    fallbackState.activity_logs.push({
      id,
      user_id: user_id ? parseInt(user_id) : null,
      action,
      details,
      created_at: now
    });
    saveFallbackState();
    return { insertId: id };
  }

  // 34. Check reorder alert matching specific itemId inside fallback DB
  // SELECT id FROM reorder_alerts WHERE item_id = ? AND status = "Active"
  if (cleanSql.includes('reorder_alerts WHERE item_id = ? AND status = "Active"')) {
    const targetId = parseInt(params[0]);
    const matches = fallbackState.reorder_alerts.filter(a => a.item_id === targetId && a.status === 'Active');
    return matches.map(m => ({ id: m.id }));
  }

  // 35. INSERT INTO reorder_alerts
  if (cleanSql.includes('INSERT INTO reorder_alerts')) {
    const id = fallbackState.nextIds.reorder_alerts++;
    const [item_id] = params;
    fallbackState.reorder_alerts.push({
      id,
      item_id: parseInt(item_id),
      status: 'Active',
      created_at: now
    });
    saveFallbackState();
    return { insertId: id };
  }

  // 36. DELETE FROM reorder_alerts
  if (cleanSql.includes('DELETE FROM reorder_alerts WHERE item_id = ? AND status = "Active"')) {
    const targetId = parseInt(params[0]);
    fallbackState.reorder_alerts = fallbackState.reorder_alerts.filter(a => !(a.item_id === targetId && a.status === 'Active'));
    saveFallbackState();
    return { affectedRows: 1 };
  }

  // Fallback default output for generic queries
  console.log('[Fallback DB] Query not specifically modeled, returning empty row set:', cleanSql);
  return [];
}

// Global query helper with graceful fallback
export async function query(sql, params = []) {
  if (useFallback) {
    return executeFallbackQuery(sql, params);
  }

  const p = getPool();
  try {
    const [results] = await p.execute(sql, params);
    return results;
  } catch (err) {
    const isConnRefused = err.message.includes('ECONNREFUSED') || 
                          err.message.includes('ENOTFOUND') || 
                          err.message.includes('ETIMEDOUT') ||
                          err.code === 'ECONNREFUSED';

    if (isConnRefused) {
      console.warn('[MySQL Query Interface Intercepted] Connection refused. Activating local JSON developer sandbox instantly.');
      useFallback = true;
      initFallbackState();
      return executeFallbackQuery(sql, params);
    }

    console.error(`[MySQL Query Error] SQL: ${sql} | Error:`, err.message);
    throw err;
  }
}

// Reusable Audit Logging Helper (MySQL or Fallback-based)
export async function logActivity(userId, action, details) {
  try {
    await query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId || null, action, details || '']
    );
  } catch (err) {
    console.error('[Database Activity Logging Failure]', err.message);
  }
}

// Reusable alert evaluation helper in MySQL or Fallback-based
export async function evaluateReorderAlert(itemId) {
  try {
    const items = await query(
      'SELECT quantity, min_required FROM inventory_items WHERE id = ?',
      [itemId]
    );
    if (!items || items.length === 0) return;
    const item = items[0];
    const isLow = item.quantity < (item.minRequired !== undefined ? item.minRequired : item.min_required);

    const alerts = await query(
      'SELECT id FROM reorder_alerts WHERE item_id = ? AND status = "Active"',
      [itemId]
    );
    const hasActive = alerts && alerts.length > 0;

    if (isLow && !hasActive) {
      await query(
        'INSERT INTO reorder_alerts (item_id, status) VALUES (?, "Active")',
        [itemId]
      );
    } else if (!isLow && hasActive) {
      await query(
        'DELETE FROM reorder_alerts WHERE item_id = ? AND status = "Active"',
        [itemId]
      );
    }
  } catch (err) {
    console.error('[Database Alert Evaluation Failure]', err.message);
  }
}
