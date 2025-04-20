const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(() => {
  console.log('Initializing database...');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    hamlet TEXT
  )`, (err) => {
    if (err) console.error('Error creating users table:', err);
    else console.log('Users table created or exists');
  });

  // Removed DELETE FROM users to persist data
  // Seed initial users only if they don’t exist
  db.run(`INSERT OR IGNORE INTO users (username, password, role, hamlet) VALUES (?, ?, ?, ?)`, 
    ['saraipani_op', 'password123', 'operator', 'Saraipani'], (err) => {
      if (err) console.error('Error inserting operator:', err);
      else console.log('Inserted operator: saraipani_op|password123|operator|Saraipani');
    });
  db.run(`INSERT OR IGNORE INTO users (username, password, role, hamlet) VALUES (?, ?, ?, ?)`, 
    ['saraipani_spoc', 'spocpass456', 'spoc', null], (err) => {
      if (err) console.error('Error inserting SPOC:', err);
      else console.log('Inserted SPOC: saraipani_spoc|spocpass456|spoc|null');
    });
  db.run(`INSERT OR IGNORE INTO users (username, password, role, hamlet) VALUES (?, ?, ?, ?)`, 
    ['insurance_committee_user', 'icpassword789', 'insurance_committee', null], (err) => {
      if (err) console.error('Error inserting Insurance Committee user:', err);
      else console.log('Inserted Insurance Committee user: insurance_committee_user|icpassword789|insurance_committee|null');
    });

  db.run(`CREATE TABLE IF NOT EXISTS hh (
    customer_id TEXT PRIMARY KEY,
    hh_name TEXT,
    hamlet TEXT,
    state TEXT,
    district TEXT,
    block TEXT,
    gp TEXT,
    village TEXT,
    vec_name TEXT,
    meter_num TEXT,
    submissions TEXT,
    drafts TEXT
  )`, (err) => {
    if (err) console.error('Error creating hh table:', err);
    else console.log('HH table created or exists');
  });
  db.run(`INSERT OR IGNORE INTO hh (customer_id, hh_name, hamlet, state, district, block, gp, village, vec_name, meter_num, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    ['Saraipani/39', 'Albert Ekka', 'Saraipani', 'Jharkhand', 'Dumka', 'Kurdeg', 'Barkibiura', 'Saraipani', 'Prakash Saur Oorja Samiti', 'M12345', '[]', '[]'], (err) => {
      if (err) console.error('Error inserting HH Saraipani/39:', err);
      else console.log('Inserted HH: Saraipani/39');
    });
  db.run(`INSERT OR IGNORE INTO hh (customer_id, hh_name, hamlet, state, district, block, gp, village, vec_name, meter_num, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    ['Saraipani/3', 'Anand Toppo', 'Saraipani', 'Jharkhand', 'Dumka', 'Kurdeg', 'Barkibiura', 'Saraipani', 'Prakash Saur Oorja Samiti', 'M12346', '[]', '[]'], (err) => {
      if (err) console.error('Error inserting HH Saraipani/3:', err);
      else console.log('Inserted HH: Saraipani/3');
    });
  db.run(`INSERT OR IGNORE INTO hh (customer_id, hh_name, hamlet, state, district, block, gp, village, vec_name, meter_num, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    ['Saraipani/35', 'Ananimas Xalxo', 'Saraipani', 'Jharkhand', 'Dumka', 'Kurdeg', 'Barkibiura', 'Saraipani', 'Prakash Saur Oorja Samiti', 'M12347', '[]', '[]'], (err) => {
      if (err) console.error('Error inserting HH Saraipani/35:', err);
      else console.log('Inserted HH: Saraipani/35');
    });
  db.run(`INSERT OR IGNORE INTO hh (customer_id, hh_name, hamlet, state, district, block, gp, village, vec_name, meter_num, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    ['Saraipani/6', 'Anjela Toppo', 'Saraipani', 'Jharkhand', 'Dumka', 'Kurdeg', 'Barkibiura', 'Saraipani', 'Prakash Saur Oorja Samiti', 'M12348', '[]', '[]'], (err) => {
      if (err) console.error('Error inserting HH Saraipani/6:', err);
      else console.log('Inserted HH: Saraipani/6');
    });

  db.run(`CREATE TABLE IF NOT EXISTS vec (
    hamlet TEXT PRIMARY KEY,
    vec_name TEXT,
    state TEXT,
    district TEXT,
    block TEXT,
    gp TEXT,
    village TEXT,
    microgrid_id TEXT,
    submissions TEXT,
    drafts TEXT
  )`, (err) => {
    if (err) console.error('Error creating vec table:', err);
    else console.log('VEC table created or exists');
  });
  db.run(`INSERT OR IGNORE INTO vec (hamlet, vec_name, state, district, block, gp, village, microgrid_id, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    ['Saraipani', 'Prakash Saur Oorja Samiti', 'Jharkhand', 'Dumka', 'Kurdeg', 'Barkibiura', 'Saraipani', 'MG-SARAIPANI', '[]', '[]'], (err) => {
      if (err) console.error('Error inserting VEC Saraipani:', err);
      else console.log('Inserted VEC: Saraipani');
    });

  db.all(`SELECT * FROM users`, (err, rows) => {
    if (err) console.error('Error selecting users:', err);
    else console.log('Users table contents:', rows);
  });
  db.all(`SELECT * FROM hh`, (err, rows) => {
    if (err) console.error('Error selecting hh:', err);
    else console.log('HH table contents:', rows);
  });
  db.all(`SELECT * FROM vec`, (err, rows) => {
    if (err) console.error('Error selecting vec:', err);
    else console.log('VEC table contents:', rows);
  });

  // Add insurance claims table
  db.run(`CREATE TABLE IF NOT EXISTS insurance_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hamlet TEXT,
    state TEXT,
    district TEXT,
    block TEXT,
    gp TEXT,
    village TEXT,
    vec_name TEXT,
    microgrid_id TEXT,
    claim_ref_number TEXT,
    claim_date TEXT,
    claiming_for TEXT,
    claim_application_photo TEXT,
    claiming_for_image TEXT,
    status TEXT DEFAULT 'draft'
  )`, (err) => {
    if (err) console.error('Error creating insurance_claims table:', err);
    else console.log('Insurance claims table created or exists');
  });
});

module.exports = db;
