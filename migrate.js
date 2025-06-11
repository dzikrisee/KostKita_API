// File: migrate.js - Letakkan di root folder backend

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database/kostkita.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting database migration...');

db.serialize(() => {
  // Backup existing tenants data
  console.log('📦 Backing up existing tenants data...');
  
  db.run(`CREATE TEMP TABLE IF NOT EXISTS tenants_backup AS SELECT * FROM tenants WHERE 1=0`);
  
  db.run(`INSERT INTO tenants_backup SELECT * FROM tenants`, (err) => {
    if (err) {
      console.log('ℹ️  No existing tenants data to backup');
    } else {
      console.log('✅ Tenants data backed up');
    }
  });

  // Drop and recreate tenants table
  console.log('🗑️  Dropping old tenants table...');
  db.run(`DROP TABLE IF EXISTS tenants`);

  console.log('🏗️  Creating new tenants table with room_id...');
  db.run(`
    CREATE TABLE tenants (
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

  // Restore data
  console.log('📥 Restoring tenants data...');
  db.run(`
    INSERT INTO tenants (id, nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk)
    SELECT id, nama, email, phone, pekerjaan, emergency_contact, tanggal_masuk 
    FROM tenants_backup
  `, (err) => {
    if (err) {
      console.log('ℹ️  No data to restore');
    } else {
      console.log('✅ Data restored');
    }
  });

  // Do the same for payments table
  console.log('📦 Updating payments table...');
  
  db.run(`CREATE TEMP TABLE IF NOT EXISTS payments_backup AS SELECT * FROM payments WHERE 1=0`);
  
  db.run(`INSERT INTO payments_backup SELECT * FROM payments`, (err) => {
    if (err) {
      console.log('ℹ️  No existing payments data to backup');
    }
  });

  db.run(`DROP TABLE IF EXISTS payments`);

  db.run(`
    CREATE TABLE payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      bulan_tahun TEXT NOT NULL,
      jumlah_bayar INTEGER NOT NULL,
      tanggal_bayar INTEGER NOT NULL,
      status_pembayaran TEXT NOT NULL,
      denda INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);

  db.run(`
    INSERT INTO payments (id, tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, denda)
    SELECT id, tenant_id, room_id, bulan_tahun, jumlah_bayar, tanggal_bayar, status_pembayaran, 
           COALESCE(denda, 0) as denda
    FROM payments_backup
  `, (err) => {
    if (err) {
      console.log('ℹ️  No payments data to restore');
    }
  });

  // Add sample rooms if none exist
  console.log('🏠 Adding sample rooms...');
  db.run(`
    INSERT OR IGNORE INTO rooms (id, nomor_kamar, tipe_kamar, harga_bulanan, fasilitas, status_kamar, lantai)
    VALUES 
    ('room-1', '101', 'Standard', 1500000, 'AC, Kasur, Lemari', 'Tersedia', 1),
    ('room-2', '102', 'Superior', 2000000, 'AC, Kasur, Lemari, TV', 'Tersedia', 1),
    ('room-3', '201', 'Deluxe', 2500000, 'AC, Kasur, Lemari, TV, Kulkas', 'Tersedia', 2),
    ('room-4', '202', 'Standard', 1500000, 'AC, Kasur, Lemari', 'Tersedia', 2),
    ('room-5', '301', 'Superior', 2000000, 'AC, Kasur, Lemari, TV', 'Tersedia', 3)
  `);

  // Verify migration
  console.log('🔍 Verifying migration...');
  
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    console.log('📋 Tables:', tables.map(t => t.name));
  });

  db.all("PRAGMA table_info(tenants)", (err, columns) => {
    console.log('🏗️  Tenants columns:', columns.map(c => c.name));
  });

  db.all("SELECT COUNT(*) as count FROM rooms", (err, result) => {
    console.log('🏠 Total rooms:', result[0].count);
  });

  db.all("SELECT COUNT(*) as count FROM tenants", (err, result) => {
    console.log('👥 Total tenants:', result[0].count);
  });

  console.log('✅ Migration completed!');
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('📴 Database connection closed');
      console.log('🚀 You can now restart your backend server');
    }
  });
});