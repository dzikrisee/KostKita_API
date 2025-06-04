const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/database');
const { JWT_SECRET } = require('../middleware/auth');

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
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  });
});

// Register (optional, for adding new users)
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
  
  db.run(query, [id, username, email, hashedPassword, full_name, 'admin', Date.now()], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    const token = jwt.sign(
      { id, username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id,
        username,
        email,
        full_name,
        role: 'admin'
      }
    });
  });
});

module.exports = router;