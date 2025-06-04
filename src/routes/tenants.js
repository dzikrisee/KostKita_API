const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Get all tenants with room info
router.get('/', (req, res) => {
  const query = `
    SELECT t.*, r.nomor_kamar, r.tipe_kamar, r.harga_bulanan 
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get tenant by ID with room info
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT t.*, r.nomor_kamar, r.tipe_kamar, r.harga_bulanan 
    FROM tenants t
    LEFT JOIN rooms r ON t.room_id = r.id
    WHERE t.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json(row);
  });
});

// Create new tenant with room assignment
router.post('/', (req, res) => {
  const { id, nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk, room_id } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Insert tenant
    const insertQuery = `
      INSERT INTO tenants (id, nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk, room_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [id, nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk, room_id], function (err) {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }

      // Update room status to "Terisi" if room is assigned
      if (room_id) {
        db.run('UPDATE rooms SET status_kamar = ? WHERE id = ?', ['Terisi', room_id], function (updateErr) {
          if (updateErr) {
            db.run('ROLLBACK');
            res.status(500).json({ error: updateErr.message });
            return;
          }

          db.run('COMMIT');
          res.json({
            id,
            nama,
            email,
            phone,
            pekerjaan,
            emergency_contact,
            tanggal_masuk,
            room_id,
          });
        });
      } else {
        db.run('COMMIT');
        res.json({
          id,
          nama,
          email,
          phone,
          pekerjaan,
          emergency_contact,
          tanggal_masuk,
          room_id,
        });
      }
    });
  });
});

// Update tenant
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk, room_id } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Get current tenant data
    db.get('SELECT room_id FROM tenants WHERE id = ?', [id], (err, currentTenant) => {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }

      const oldRoomId = currentTenant ? currentTenant.room_id : null;

      // Update tenant
      const updateQuery = `
        UPDATE tenants
        SET nama = ?, email = ?, phone = ?, pekerjaan = ?, emergency_contact = ?, tanggal_masuk = ?, room_id = ?
        WHERE id = ?
      `;

      db.run(updateQuery, [nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk, room_id, id], function (err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          res.status(404).json({ error: 'Tenant not found' });
          return;
        }

        // Update room statuses
        const updateRoomStatuses = () => {
          let completed = 0;
          const checkComplete = () => {
            completed++;
            if (completed === 2) {
              db.run('COMMIT');
              res.json({
                id,
                nama,
                email,
                phone,
                pekerjaan,
                emergency_contact,
                tanggal_masuk,
                room_id,
              });
            }
          };

          // Update old room to "Tersedia" if exists
          if (oldRoomId && oldRoomId !== room_id) {
            db.run('UPDATE rooms SET status_kamar = ? WHERE id = ?', ['Tersedia', oldRoomId], checkComplete);
          } else {
            checkComplete();
          }

          // Update new room to "Terisi" if exists
          if (room_id) {
            db.run('UPDATE rooms SET status_kamar = ? WHERE id = ?', ['Terisi', room_id], checkComplete);
          } else {
            checkComplete();
          }
        };

        updateRoomStatuses();
      });
    });
  });
});

// Delete tenant
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Get tenant's room_id before deletion
    db.get('SELECT room_id FROM tenants WHERE id = ?', [id], (err, tenant) => {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }

      // Delete tenant
      db.run('DELETE FROM tenants WHERE id = ?', [id], function (err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          res.status(404).json({ error: 'Tenant not found' });
          return;
        }

        // Update room status to "Tersedia" if tenant had a room
        if (tenant && tenant.room_id) {
          db.run('UPDATE rooms SET status_kamar = ? WHERE id = ?', ['Tersedia', tenant.room_id], (updateErr) => {
            if (updateErr) {
              db.run('ROLLBACK');
              res.status(500).json({ error: updateErr.message });
              return;
            }

            db.run('COMMIT');
            res.json({ message: 'Tenant deleted successfully' });
          });
        } else {
          db.run('COMMIT');
          res.json({ message: 'Tenant deleted successfully' });
        }
      });
    });
  });
});

module.exports = router;
