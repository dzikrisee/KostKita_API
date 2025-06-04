const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Get all rooms
router.get('/', (req, res) => {
  const query = 'SELECT * FROM rooms';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get room by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM rooms WHERE id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(row);
  });
});

// Create new room
router.post('/', (req, res) => {
  const { id, nomor_kamar, tipe_kamar, harga_bulanan, fasilitas, status_kamar, lantai } = req.body;
  const query = `
    INSERT INTO rooms (id, nomor_kamar, tipe_kamar, harga_bulanan, fasilitas, status_kamar, lantai)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [id, nomor_kamar, tipe_kamar, harga_bulanan, fasilitas, status_kamar, lantai], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id,
      nomor_kamar,
      tipe_kamar,
      harga_bulanan,
      fasilitas,
      status_kamar,
      lantai
    });
  });
});

// Update room
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nomor_kamar, tipe_kamar, harga_bulanan, fasilitas, status_kamar, lantai } = req.body;
  const query = `
    UPDATE rooms
    SET nomor_kamar = ?, tipe_kamar = ?, harga_bulanan = ?, fasilitas = ?, status_kamar = ?, lantai = ?
    WHERE id = ?
  `;
  
  db.run(query, [nomor_kamar, tipe_kamar, harga_bulanan, fasilitas, status_kamar, lantai, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({
      id,
      nomor_kamar,
      tipe_kamar,
      harga_bulanan,
      fasilitas,
      status_kamar,
      lantai
    });
  });
});

// Delete room
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM rooms WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ message: 'Room deleted successfully' });
  });
});

module.exports = router;