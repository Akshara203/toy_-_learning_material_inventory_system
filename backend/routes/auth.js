import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, logActivity } from '../../database/db.js';
import { JWT_SECRET, authenticateToken } from '../auth_middleware.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const users = await query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    const user = users[0];

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const passHash = user.password_hash || user.passwordHash;
    if (!passHash) {
      console.error('[AUTH ERROR] User found but missing password_hash field:', JSON.stringify(user));
      res.status(401).json({ error: 'Authentication internal failure. Missing password credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, passHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Create JWT payload
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit Log
    await logActivity(user.id, 'User Login', `User logged in with role: ${user.role}`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ error: 'Internal server error during login operation.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized user context' });
    return;
  }

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const userObj = users[0];
    if (!userObj) {
      res.status(404).json({ error: 'User profiles no longer found' });
      return;
    }

    res.json({
      user: {
        id: userObj.id,
        username: userObj.username,
        email: userObj.email,
        role: userObj.role,
        createdAt: userObj.created_at
      }
    });
  } catch (err) {
    console.error('Auth check me route error:', err);
    res.status(500).json({ error: 'Internal server error checking session' });
  }
});

// GET /api/auth/users
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await query('SELECT id, username, email, role, created_at AS createdAt FROM users');
    res.json(users);
  } catch (err) {
    console.error('Fetch users directory error:', err);
    res.status(500).json({ error: 'Internal server error retrieving user records.' });
  }
});

// POST /api/auth/register (Admin or Store Manager registration capabilities for teachers/staff)
router.post('/register', authenticateToken, async (req, res) => {
  const { username, password, email, role } = req.body;

  // Only Admin can provision users
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Only administrators can create staff users' });
    return;
  }

  if (!username || !password || !email || !role) {
    res.status(400).json({ error: 'All fields (username, password, email, role) are required' });
    return;
  }

  const validRoles = ['Admin', 'Teacher', 'Store Manager'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    return;
  }

  try {
    // Check unique constraints in database
    const sameUsername = await query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (sameUsername && sameUsername.length > 0) {
      res.status(400).json({ error: 'Username is already taken' });
      return;
    }

    const sameEmail = await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (sameEmail && sameEmail.length > 0) {
      res.status(400).json({ error: 'Email is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [username, passwordHash, email, role]
    );

    const insertedId = result.insertId;

    await logActivity(req.user.id, 'User Registered', `Created new user ${username} under role ${role}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: insertedId,
        username,
        email,
        role,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Registration route error:', err);
    res.status(500).json({ error: 'Internal server error trying to register staff user.' });
  }
});

// PUT /api/auth/profile (Update username or email)
router.put('/profile', authenticateToken, async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    res.status(400).json({ error: 'Username and email are required' });
    return;
  }

  try {
    // Check if username already exists for another user
    const sameUsername = await query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?',
      [username, req.user.id]
    );
    if (sameUsername && sameUsername.length > 0) {
      res.status(400).json({ error: 'Username is already taken by another staff' });
      return;
    }

    // Check if email already exists for another user
    const sameEmail = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
      [email, req.user.id]
    );
    if (sameEmail && sameEmail.length > 0) {
      res.status(400).json({ error: 'Email is already registered by another staff' });
      return;
    }

    await query(
      'UPDATE users SET email = ?, username = ? WHERE id = ?',
      [email, username, req.user.id]
    );

    await logActivity(req.user.id, 'Update Profile', `Profile updated: Username to "${username}", Email to "${email}"`);

    // Fetch the updated user object to return
    const updatedUsers = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const userObj = updatedUsers[0];

    // Generate fresh JWT token with updated info
    const token = jwt.sign(
      { id: userObj.id, username: userObj.username, role: userObj.role, email: userObj.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Profile updated successfully',
      token,
      user: {
        id: userObj.id,
        username: userObj.username,
        email: userObj.email,
        role: userObj.role,
        createdAt: userObj.created_at
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error updating profile.' });
  }
});

// PUT /api/auth/password (Change current user's password)
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passHash = user.password_hash || user.passwordHash;
    if (!passHash) {
      console.error('[AUTH ERROR] Current user profile missing password_hash field:', JSON.stringify(user));
      res.status(401).json({ error: 'Account verification error. Check database credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, passHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    await logActivity(req.user.id, 'Change Password', 'Password successfully changed');

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error changing password.' });
  }
});

export default router;
