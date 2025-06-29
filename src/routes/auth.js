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
        profile_photo: user.profile_photo || null,
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
        profile_photo: null,
      },
    });
  });
});

// Update Profile - FIXED COMPLETE VERSION
router.put('/profile', authenticateToken, (req, res) => {
  const { username, email, full_name, profile_photo } = req.body;
  const userId = req.user.id;

  console.log('=== UPDATE PROFILE REQUEST ===');
  console.log('User ID:', userId);
  console.log('Username:', username);
  console.log('Email:', email);
  console.log('Full Name:', full_name);
  console.log('Profile Photo:', profile_photo);

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
      console.error('=== DATABASE UPDATE ERROR ===', err);

      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign({ id: userId, username: username, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });

    console.log('=== PROFILE UPDATE SUCCESS ===');
    console.log('Affected rows:', this.changes);

    res.json({
      token,
      user: {
        id: userId,
        username: username,
        email: email,
        full_name: full_name,
        profile_photo: profile_photo || null,
        role: req.user.role,
      },
    });
  });
});

// Get Profile - untuk debugging
router.get('/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT id, username, email, full_name, role, profile_photo FROM users WHERE id = ?';

  db.get(query, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        profile_photo: user.profile_photo || null,
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
