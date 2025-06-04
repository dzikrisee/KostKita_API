const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'kostkita.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables with updated schema
db.serialize(() => {
  // Users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at INTEGER NOT NULL
    )
  `);

  // Rooms table (unchanged)
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      nomor_kamar TEXT NOT NULL,
      tipe_kamar TEXT NOT NULL,
      harga_bulanan INTEGER NOT NULL,
      fasilitas TEXT NOT NULL,
      status_kamar TEXT NOT NULL,
      lantai INTEGER NOT NULL
    )
  `);

  // Tenants table (updated with room_id)
  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      pekerjaan TEXT NOT NULL,
      emergency_contact TEXT NOT NULL,
      tanggal_masuk INTEGER NOT NULL,
      room_id TEXT,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  // Payments table (unchanged)
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      bulan_tahun TEXT NOT NULL,
      jumlah_bayar INTEGER NOT NULL,
      tanggal_bayar INTEGER NOT NULL,
      status_pembayaran TEXT NOT NULL,
      denda INTEGER NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  // Create default admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(
    `
    INSERT OR IGNORE INTO users (id, username, email, password, full_name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    ['550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@kostkita.com', adminPassword, 'Administrator', 'admin', Date.now()],
  );

  console.log('Tables created successfully');
});

module.exports = db;
