const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Get all payments
router.get('/', (req, res) => {
  const query = 'SELECT * FROM payments';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get payment by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM payments WHERE id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json(row);
  });
});

// Get payments by tenant ID
router.get('/tenant/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const query = 'SELECT * FROM payments WHERE tenant_id = ?';
  
  db.all(query, [tenantId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get payments by room ID
router.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const query = 'SELECT * FROM payments WHERE room_id = ?';
  
  db.all(query, [roomId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create new payment
router.post('/', (req, res) => {
  const { id, tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, denda } = req.body;
  const query = `
    INSERT INTO payments (id, tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, denda)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [id, tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, denda], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id,
      tenant_id,
      room_id,
      bulan_tahun,
      jumlah_bayar,
      tanggal_bayar,
      status_pembayaran,
      denda
    });
  });
});

// Update payment
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, denda } = req.body;
  const query = `
    UPDATE payments
    SET tenant_id = ?, room_id = ?, bulan_tahun = ?, jumlah_bayar = ?, tanggal_bayar = ?, status_pembayaran = ?, denda = ?
    WHERE id = ?
  `;
  
  db.run(query, [tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, denda, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({
      id,
      tenant_id,
      room_id,
      bulan_tahun,
      jumlah_bayar,
      tanggal_bayar,
      status_pembayaran,
      denda
    });
  });
});

// Delete payment
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM payments WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({ message: 'Payment deleted successfully' });
  });
});

module.exports = router;