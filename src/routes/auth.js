const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const query = 'SELECT * FROM users WHERE username = ? OR email = ?';

  db.get(query, [username, username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  });
});

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, full_name } = req.body;

  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = require('crypto').randomUUID();

  const query = `
    INSERT INTO users (id, username, email, password, full_name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, username, email, hashedPassword, full_name, 'admin', Date.now()], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }

    const token = jwt.sign({ id, username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id,
        username,
        email,
        full_name,
        role: 'admin',
      },
    });
  });
});

// Update Profile endpoint di routes/auth.js
router.put('/profile', authenticateToken, (req, res) => {
  const { username, email, full_name, profile_photo } = req.body; // Tambahkan profile_photo
  const userId = req.user.id;

  if (!username || !email || !full_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = `
    UPDATE users 
    SET username = ?, email = ?, full_name = ?, profile_photo = ?, updated_at = ?
    WHERE id = ?
  `;

  db.run(query, [username, email, full_name, profile_photo || null, Date.now(), userId], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }

    const token = jwt.sign({ id: userId, username: username, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: userId,
        username: username,
        email: email,
        full_name: full_name,
        profile_photo: profile_photo, // Tambahkan ini
        role: req.user.role,
      },
    });
  });
});

// Change Password
router.put('/change-password', authenticateToken, async (req, res) => {
  const { old_password, new_password } = req.body;
  const userId = req.user.id;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  // Get current user password
  const getUserQuery = 'SELECT password FROM users WHERE id = ?';

  db.get(getUserQuery, [userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const validOldPassword = await bcrypt.compare(old_password, user.password);
    if (!validOldPassword) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update password
    const updateQuery = 'UPDATE users SET password = ?, updated_at = ? WHERE id = ?';

    db.run(updateQuery, [hashedNewPassword, Date.now(), userId], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Password changed successfully' });
    });
  });
});

module.exports = router;
