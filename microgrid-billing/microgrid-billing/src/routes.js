const express = require('express');
const router = express.Router();

// Enable CORS for all routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-role');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Handle preflight requests
router.options('*', (req, res) => {
  res.sendStatus(200);
});
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

// Configure multer with unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'Uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Initialize database schema
db.serialize(() => {
  // Create insurance claims table with correct structure
  db.run(`
    CREATE TABLE IF NOT EXISTS insurance_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hamlet TEXT,
      claim_ref_number TEXT,
      claim_date TEXT,
      claiming_for TEXT,
      claim_application_photo TEXT,
      claiming_for_image TEXT,
      status TEXT DEFAULT 'draft',
      UNIQUE(hamlet, claim_ref_number)
    )
  `);
});

// Insurance endpoints
router.get('/api/insurance/all/submissions', (req, res) => {
  console.log('GET /api/insurance/all/submissions');
  db.all(`
    SELECT i.*, v.state, v.district, v.block, v.gp, v.village, v.vec_name, v.microgrid_id
    FROM insurance_claims i
    LEFT JOIN vec v ON i.hamlet = v.hamlet
    WHERE i.status = 'submitted'
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching insurance submissions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Fetched submissions:', rows?.length || 0);
    res.json(rows || []);
  });
});

router.get('/api/insurance/all/drafts', (req, res) => {
  console.log('GET /api/insurance/all/drafts');
  db.all(`
    SELECT i.*, v.state, v.district, v.block, v.gp, v.village, v.vec_name, v.microgrid_id
    FROM insurance_claims i
    LEFT JOIN vec v ON i.hamlet = v.hamlet
    WHERE i.status = 'draft'
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching insurance drafts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Fetched drafts:', rows?.length || 0);
    res.json(rows || []);
  });
});

// ... rest of the code ...

router.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    if (!row) {
      console.log('No matching user found');
      return res.json({ success: false, error: 'Invalid username or password' });
    }
    console.log('Login successful:', { username: row.username, role: row.role });
    // Add new role check for insurance_committee
    if (row.role === 'insurance_committee') {
      res.json({ success: true, role: 'insurance_committee', username: row.username, hamlet: row.hamlet });
    } else {
      res.json({ success: true, role: row.role || 'user', username: row.username, hamlet: row.hamlet });
    }
  });
});

router.get('/api/hh-list', (req, res) => {
  const hamlet = req.query.hamlet;
  const all = req.query.all === 'true';
  console.log('Fetching HH list:', { hamlet, all });
  const query = all
    ? (hamlet ? 'SELECT * FROM hh WHERE lower(hamlet) = lower(?)' : 'SELECT * FROM hh')
    : (hamlet ? 'SELECT customer_id, hh_name FROM hh WHERE lower(hamlet) = lower(?)' : 'SELECT customer_id, hh_name FROM hh');
  db.all(query, hamlet ? [hamlet] : [], (err, rows) => {
    if (err) {
      console.error('Error fetching HH list:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    rows.forEach(row => {
      if (all) {
        row.submissions = JSON.parse(row.submissions || '[]');
        row.drafts = JSON.parse(row.drafts || '[]');
      }
    });
    res.json(rows);
  });
});

router.get('/api/vec-list', (req, res) => {
  const hamlet = req.query.hamlet;
  console.log('Fetching VEC list:', { hamlet });
  const query = hamlet ? 'SELECT * FROM vec WHERE lower(hamlet) = lower(?)' : 'SELECT * FROM vec';
  db.all(query, hamlet ? [hamlet] : [], (err, rows) => {
    if (err) {
      console.error('Error fetching VEC list:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    rows.forEach(row => {
      row.submissions = JSON.parse(row.submissions || '[]');
      row.drafts = JSON.parse(row.drafts || '[]');
    });
    res.json(rows);
  });
});

router.get('/api/hh/:customer_id', (req, res) => {
  const { customer_id } = req.params;
  console.log('GET /api/hh/:customer_id:', customer_id);
  db.get('SELECT * FROM hh WHERE customer_id = ?', [customer_id], (err, row) => {
    if (err) {
      console.error('Error fetching HH:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('Household not found:', customer_id);
      return res.status(404).json({ error: 'Household not found' });
    }
    row.submissions = JSON.parse(row.submissions || '[]');
    row.drafts = JSON.parse(row.drafts || '[]');
    res.json(row);
  });
});

router.post('/api/hh/:customer_id/draft', upload.fields([{ name: 'issue_img' }, { name: 'meter_image' }]), (req, res) => {
  const { customer_id } = req.params;
  console.log('POST /api/hh/:customer_id/draft:', { customer_id, body: req.body, files: req.files });
  let draft;
  try {
    draft = JSON.parse(req.body.draft || '{}');
  } catch (e) {
    console.error('Error parsing draft JSON:', e.message);
    return res.status(400).json({ error: 'Invalid draft data' });
  }
  db.get('SELECT drafts FROM hh WHERE customer_id = ?', [customer_id], (err, row) => {
    if (err) {
      console.error('Error fetching HH for draft:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('Household not found:', customer_id);
      return res.status(404).json({ error: 'Household not found' });
    }
    let drafts = JSON.parse(row.drafts || '[]');
    const draftData = {
      ...draft,
      issue_img: req.files['issue_img'] ? `/Uploads/${req.files['issue_img'][0].filename}` : null,
      meter_image: req.files['meter_image'] ? `/Uploads/${req.files['meter_image'][0].filename}` : null
    };
    drafts.push(draftData);
    db.run('UPDATE hh SET drafts = ? WHERE customer_id = ?', [JSON.stringify(drafts), customer_id], (err) => {
      if (err) {
        console.error('Error saving HH draft:', err.message);
        return res.status(500).json({ error: 'Database update error' });
      }
      console.log('HH draft saved:', customer_id);
      res.json({ success: true });
    });
  });
});

router.post('/api/hh/:customer_id/submit', upload.fields([{ name: 'issue_img' }, { name: 'meter_image' }]), (req, res) => {
  const { customer_id } = req.params;
  console.log('POST /api/hh/:customer_id/submit:', { customer_id, body: req.body });
  const draftIndex = req.query.draft;
  let submission;
  try {
    submission = JSON.parse(req.body.submission || '{}');
  } catch (e) {
    console.error('Error parsing submission JSON:', e.message);
    return res.status(400).json({ error: 'Invalid submission data' });
  }
  db.get('SELECT submissions, drafts FROM hh WHERE customer_id = ?', [customer_id], (err, row) => {
    if (err) {
      console.error('Error fetching HH for submit:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('Household not found:', customer_id);
      return res.status(404).json({ error: 'Household not found' });
    }
    let submissions = JSON.parse(row.submissions || '[]');
    let drafts = JSON.parse(row.drafts || '[]');
    const submissionMonth = submission.read_date ? submission.read_date.slice(0, 7) : null;
    if (submissionMonth && submissions.some(sub => sub.read_date && sub.read_date.slice(0, 7) === submissionMonth)) {
      return res.status(400).json({ error: 'A submission for this month already exists' });
    }
    const submissionData = {
      ...submission,
      issue_img: req.files['issue_img'] ? `/Uploads/${req.files['issue_img'][0].filename}` : null,
      meter_image: req.files['meter_image'] ? `/Uploads/${req.files['meter_image'][0].filename}` : null
    };
    if (draftIndex !== undefined) {
      const idx = parseInt(draftIndex);
      if (idx >= 0 && idx < drafts.length) {
        submissions.push(submissionData);
        drafts.splice(idx, 1);
        db.run('UPDATE hh SET submissions = ?, drafts = ? WHERE customer_id = ?', 
          [JSON.stringify(submissions), JSON.stringify(drafts), customer_id], (err) => {
            if (err) {
              console.error('Error updating HH submissions:', err.message);
              return res.status(500).json({ error: 'Database update error' });
            }
            console.log('HH submission updated from draft:', customer_id);
            res.json({ success: true });
          });
      } else {
        return res.status(400).json({ error: 'Invalid draft index' });
      }
    } else {
      submissions.push(submissionData);
      db.run('UPDATE hh SET submissions = ? WHERE customer_id = ?', [JSON.stringify(submissions), customer_id], (err) => {
        if (err) {
          console.error('Error updating HH submissions:', err.message);
          return res.status(500).json({ error: 'Database update error' });
        }
        console.log('HH submission updated:', customer_id);
        res.json({ success: true });
      });
    }
  });
});

router.get('/api/vec/:hamlet', (req, res) => {
  const { hamlet } = req.params;
  console.log('GET /api/vec/:hamlet:', hamlet);
  db.get('SELECT * FROM vec WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC:', err.message);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!row) {
      console.log('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    row.submissions = JSON.parse(row.submissions || '[]');
    row.drafts = JSON.parse(row.drafts || '[]');
    res.json(row);
  });
});

router.post('/api/vec/:hamlet/submit', upload.single('issue_img'), (req, res) => {
  const { hamlet } = req.params;
  console.log('POST /api/vec/:hamlet/submit:', { hamlet, body: req.body });
  let submission;
  try {
    submission = JSON.parse(req.body.submission || '{}');
  } catch (e) {
    console.error('Error parsing submission JSON:', e.message);
    return res.status(400).json({ error: 'Invalid submission data' });
  }
  db.get('SELECT submissions FROM vec WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC for submit:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    let submissions = JSON.parse(row.submissions || '[]');
    const submissionMonth = submission.submission_date ? submission.submission_date.slice(0, 7) : null;
    if (submissionMonth && submissions.some(sub => sub.submission_date && sub.submission_date.slice(0, 7) === submissionMonth)) {
      return res.status(400).json({ error: 'A submission for this month already exists' });
    }
    const submissionData = {
      ...submission,
      issue_img: req.file ? `/Uploads/${req.file.filename}` : null
    };
    submissions.push(submissionData);
    db.run('UPDATE vec SET submissions = ? WHERE lower(hamlet) = lower(?)', [JSON.stringify(submissions), hamlet], (err) => {
      if (err) {
        console.error('Error updating VEC submissions:', err.message);
        return res.status(500).json({ error: 'Database update error' });
      }
      console.log('VEC submission updated:', hamlet);
      res.json({ success: true });
    });
  });
});

router.post('/api/vec/:hamlet/draft', upload.single('issue_img'), (req, res) => {
  const { hamlet } = req.params;
  console.log('POST /api/vec/:hamlet/draft:', { hamlet, body: req.body, file: req.file });
  let draft;
  try {
    draft = JSON.parse(req.body.draft || '{}');
    console.log('Parsed draft:', draft);
  } catch (e) {
    console.error('Error parsing draft JSON:', e.message);
    return res.status(400).json({ error: 'Invalid draft data', details: e.message });
  }
  db.get('SELECT drafts FROM vec WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Database error fetching VEC:', { hamlet, error: err.message, code: err.code });
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!row) {
      console.error('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    console.log('VEC row:', { hamlet, drafts: row.drafts });
    let drafts;
    try {
      drafts = JSON.parse(row.drafts || '[]');
    } catch (e) {
      console.error('Error parsing existing drafts:', e.message);
      drafts = [];
    }
    const draftData = {
      ...draft,
      issue_img: req.file ? `/Uploads/${req.file.filename}` : null
    };
    drafts.push(draftData);
    db.run('UPDATE vec SET drafts = ? WHERE lower(hamlet) = lower(?)', [JSON.stringify(drafts), hamlet], (err) => {
      if (err) {
        console.error('Error saving VEC draft:', { hamlet, error: err.message, code: err.code });
        return res.status(500).json({ error: 'Database update error', details: err.message });
      }
      console.log('Draft saved successfully:', { hamlet, draftsLength: drafts.length });
      res.json({ success: true });
    });
  });
});

router.post('/api/hh/:customer_id/edit', (req, res) => {
  const { customer_id } = req.params;
  console.log('POST /api/hh/:customer_id/edit:', customer_id);
  const { subIndex, ...submission } = req.body;
  db.get('SELECT submissions FROM hh WHERE customer_id = ?', [customer_id], (err, row) => {
    if (err) {
      console.error('Error fetching HH for edit:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('Household not found:', customer_id);
      return res.status(404).json({ error: 'Household not found' });
    }
    let submissions = JSON.parse(row.submissions || '[]');
    if (subIndex < 0 || subIndex >= submissions.length) {
      return res.status(400).json({ error: 'Invalid submission index' });
    }
    const submissionMonth = submission.read_date ? submission.read_date.slice(0, 7) : null;
    const otherSubmissions = submissions.filter((_, idx) => idx !== subIndex);
    if (submissionMonth && otherSubmissions.some(sub => sub.read_date && sub.read_date.slice(0, 7) === submissionMonth)) {
      return res.status(400).json({ error: 'A submission for this month already exists' });
    }
    submissions[subIndex] = submission;
    db.run('UPDATE hh SET submissions = ? WHERE customer_id = ?', [JSON.stringify(submissions), customer_id], (err) => {
      if (err) {
        console.error('Error updating HH submission:', err.message);
        return res.status(500).json({ error: 'Database update error' });
      }
      console.log('HH submission edited:', customer_id);
      res.json({ success: true });
    });
  });
});

router.post('/api/vec/:hamlet/edit', (req, res) => {
  const { hamlet } = req.params;
  console.log('POST /api/vec/:hamlet/edit:', hamlet);
  const { subIndex, ...submission } = req.body;
  db.get('SELECT submissions FROM vec WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC for edit:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    let submissions = JSON.parse(row.submissions || '[]');
    if (subIndex < 0 || subIndex >= submissions.length) {
      return res.status(400).json({ error: 'Invalid submission index' });
    }
    const submissionMonth = submission.submission_date ? submission.submission_date.slice(0, 7) : null;
    const otherSubmissions = submissions.filter((_, idx) => idx !== subIndex);
    if (submissionMonth && otherSubmissions.some(sub => sub.submission_date && sub.submission_date.slice(0, 7) === submissionMonth)) {
      return res.status(400).json({ error: 'A submission for this month already exists' });
    }
    submissions[subIndex] = submission;
    db.run('UPDATE vec SET submissions = ? WHERE lower(hamlet) = lower(?)', [JSON.stringify(submissions), hamlet], (err) => {
      if (err) {
        console.error('Error updating VEC submission:', err.message);
        return res.status(500).json({ error: 'Database update error' });
      }
      console.log('VEC submission edited:', hamlet);
      res.json({ success: true });
    });
  });
});

router.get('/api/users', (req, res) => {
  console.log('GET /api/users');
  db.all('SELECT username, password, role, hamlet FROM users WHERE role = "operator"', (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

router.post('/api/users/add', (req, res) => {
  const { username, password, hamlet } = req.body;
  console.log('POST /api/users/add:', username);
  db.run('INSERT INTO users (username, password, role, hamlet) VALUES (?, ?, ?, ?)', 
    [username, password, 'operator', hamlet], (err) => {
      if (err) {
        console.error('Error adding user:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('User added:', username);
      res.json({ success: true });
    });
});

router.post('/api/users/remove', (req, res) => {
  const { username } = req.body;
  console.log('POST /api/users/remove:', username);
  db.run('DELETE FROM users WHERE username = ? AND role = "operator"', [username], (err) => {
    if (err) {
      console.error('Error removing user:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('User removed:', username);
    res.json({ success: true });
  });
});

router.post('/api/hh/bulk', upload.single('file'), (req, res) => {
  const role = req.headers['x-user-role'] || 'operator';
  console.log('POST /api/hh/bulk:', { role });
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Bulk upload restricted to SPOC only' });
  }
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const inserts = results.map(row => 
        new Promise((resolve, reject) => {
          const meterNum = row.meter_num || `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          db.run('INSERT OR IGNORE INTO hh (customer_id, hh_name, hamlet, state, district, block, gp, village, vec_name, meter_num, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [row.customer_id, row.hh_name, row.hamlet.trim(), row.state, row.district, row.block, row.gp, row.village, row.vec_name, meterNum, '[]', '[]'], (err) => {
              if (err) reject(err);
              else resolve();
            });
        })
      );
      Promise.all(inserts)
        .then(() => {
          fs.unlinkSync(req.file.path);
          console.log('Bulk HH upload completed:', results.length);
          res.json({ success: true, count: results.length });
        })
        .catch(err => {
          console.error('Error during bulk HH upload:', err.message);
          res.status(500).json({ error: 'Database error' });
        });
    });
});

router.post('/api/vec/bulk', upload.single('file'), (req, res) => {
  const role = req.headers['x-user-role'] || 'operator';
  console.log('POST /api/vec/bulk:', { role });
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Bulk upload restricted to SPOC only' });
  }
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const inserts = results.map(row => 
        new Promise((resolve, reject) => {
          db.run('INSERT OR IGNORE INTO vec (hamlet, vec_name, state, district, block, gp, village, microgrid_id, submissions, drafts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [row.hamlet, row.vec_name, row.state, row.district, row.block, row.gp, row.village, row.microgrid_id, '[]', '[]'], (err) => {
              if (err) reject(err);
              else resolve();
            });
        })
      );
      Promise.all(inserts)
        .then(() => {
          fs.unlinkSync(req.file.path);
          console.log('Bulk VEC upload completed:', results.length);
          res.json({ success: true, count: results.length });
        })
        .catch(err => {
          console.error('Error during bulk VEC upload:', err.message);
          res.status(500).json({ error: 'Database error' });
        });
    });
});

router.post('/api/hh/clear', (req, res) => {
  const role = req.headers['x-user-role'] || 'operator';
  console.log('POST /api/hh/clear:', { role });
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Clearing submissions restricted to SPOC only' });
  }
  db.run('UPDATE hh SET submissions = "[]", drafts = "[]"', [], (err) => {
    if (err) {
      console.error('Error clearing HH submissions:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('All HH submissions and drafts cleared');
    res.json({ success: true });
  });
});

router.post('/api/vec/clear', (req, res) => {
  const role = req.headers['x-user-role'] || 'operator';
  console.log('POST /api/vec/clear:', { role });
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Clearing submissions restricted to SPOC only' });
  }
  db.run('UPDATE vec SET submissions = "[]", drafts = "[]"', [], (err) => {
    if (err) {
      console.error('Error clearing VEC submissions:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('All VEC submissions and drafts cleared');
    res.json({ success: true });
  });
});

router.post('/api/hh/:customer_id/remove', (req, res) => {
  const { customer_id } = req.params;
  console.log('POST /api/hh/:customer_id/remove:', customer_id);
  const { subIndex } = req.body;
  const role = req.headers['x-user-role'] || 'operator';
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Removing submissions restricted to SPOC only' });
  }
  db.get('SELECT submissions FROM hh WHERE customer_id = ?', [customer_id], (err, row) => {
    if (err) {
      console.error('Error fetching HH for remove:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('Household not found:', customer_id);
      return res.status(404).json({ error: 'Household not found' });
    }
    let submissions = JSON.parse(row.submissions || '[]');
    if (subIndex < 0 || subIndex >= submissions.length) {
      return res.status(400).json({ error: 'Invalid submission index' });
    }
    submissions.splice(subIndex, 1);
    db.run('UPDATE hh SET submissions = ? WHERE customer_id = ?', [JSON.stringify(submissions), customer_id], (err) => {
      if (err) {
        console.error('Error removing HH submission:', err.message);
        return res.status(500).json({ error: 'Database update error' });
      }
      console.log('HH submission removed:', customer_id);
      res.json({ success: true });
    });
  });
});

router.post('/api/vec/:hamlet/remove', (req, res) => {
  const { hamlet } = req.params;
  console.log('POST /api/vec/:hamlet/remove:', hamlet);
  const { subIndex } = req.body;
  const role = req.headers['x-user-role'] || 'operator';
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Removing submissions restricted to SPOC only' });
  }
  db.get('SELECT submissions FROM vec WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC for remove:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      console.log('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    let submissions = JSON.parse(row.submissions || '[]');
    if (subIndex < 0 || subIndex >= submissions.length) {
      return res.status(400).json({ error: 'Invalid submission index' });
    }
    submissions.splice(subIndex, 1);
    db.run('UPDATE vec SET submissions = ? WHERE lower(hamlet) = lower(?)', [JSON.stringify(submissions), hamlet], (err) => {
      if (err) {
        console.error('Error removing VEC submission:', err.message);
        return res.status(500).json({ error: 'Database update error' });
      }
      console.log('VEC submission removed:', hamlet);
      res.json({ success: true });
    });
  });
});

router.post('/api/hh/delete', (req, res) => {
  const role = req.headers['x-user-role'] || 'operator';
  console.log('POST /api/hh/delete:', { role });
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Deleting households restricted to SPOC only' });
  }
  const { id } = req.body;
  db.run('DELETE FROM hh WHERE customer_id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting HH:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('HH deleted:', id);
    res.json({ success: true });
  });
});

router.post('/api/vec/delete', (req, res) => {
  const role = req.headers['x-user-role'] || 'operator';
  console.log('POST /api/vec/delete:', { role });
  if (role !== 'spoc') {
    return res.status(403).json({ error: 'Deleting VECs restricted to SPOC only' });
  }
  const { id } = req.body;
  db.run('DELETE FROM vec WHERE hamlet = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting VEC:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('VEC deleted:', id);
    res.json({ success: true });
  });
});

router.get('/api/stats/hh', (req, res) => {
  console.log('GET /api/stats/hh');
  db.get('SELECT COUNT(*) as count FROM hh', (err, row) => {
    if (err) {
      console.error('Error fetching HH stats:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

router.get('/api/stats/vec', (req, res) => {
  console.log('GET /api/stats/vec');
  db.get('SELECT COUNT(*) as count FROM vec', (err, row) => {
    if (err) {
      console.error('Error fetching VEC stats:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    db.get('SELECT COUNT(*) as pending FROM hh WHERE submissions != "[]"', (err, pendingRow) => {
      if (err) {
        console.error('Error fetching pending stats:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ count: row.count, pending: pendingRow.pending });
    });
  });
});

// Delete HH draft
router.delete('/api/hh/:customerId/drafts/:index', (req, res) => {
  const { customerId, index } = req.params;
  const draftIndex = parseInt(index);
  const decodedCustomerId = decodeURIComponent(customerId);
  
  console.log('Deleting HH draft:', { customerId: decodedCustomerId, index: draftIndex });
  
  db.get('SELECT * FROM hh WHERE customer_id = ?', [decodedCustomerId], (err, row) => {
    if (err) {
      console.error('Error fetching HH:', err);
      return res.status(500).json({ error: 'Failed to fetch HH' });
    }
    if (!row) {
      console.error('HH not found:', decodedCustomerId);
      return res.status(404).json({ error: 'HH not found' });
    }
    
    try {
      const drafts = row.drafts ? JSON.parse(row.drafts) : [];
      console.log('Current drafts:', drafts);
      
      if (draftIndex < 0 || draftIndex >= drafts.length) {
        console.error('Draft not found:', { draftIndex, draftsLength: drafts.length });
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      drafts.splice(draftIndex, 1);
      console.log('Updated drafts:', drafts);
      
      db.run('UPDATE hh SET drafts = ? WHERE customer_id = ?', 
        [JSON.stringify(drafts), decodedCustomerId], 
        function(err) {
          if (err) {
            console.error('Error updating HH drafts:', err);
            return res.status(500).json({ error: 'Failed to delete draft' });
          }
          console.log('Draft deleted successfully');
          res.json({ success: true, message: 'Draft deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error parsing drafts:', error);
      res.status(500).json({ error: 'Failed to parse drafts' });
    }
  });
});

// Delete VEC draft
router.delete('/api/vec/:hamlet/drafts/:index', (req, res) => {
  const { hamlet, index } = req.params;
  const draftIndex = parseInt(index);
  console.log('Deleting VEC draft:', { hamlet, index: draftIndex });
  
  db.get('SELECT * FROM vec WHERE LOWER(hamlet) = LOWER(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC:', err);
      return res.status(500).json({ error: 'Failed to fetch VEC' });
    }
    if (!row) {
      console.error('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    
    try {
      const drafts = JSON.parse(row.drafts || '[]');
      console.log('Current drafts:', drafts);
      
      if (draftIndex < 0 || draftIndex >= drafts.length) {
        console.error('Draft not found:', { draftIndex, draftsLength: drafts.length });
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      drafts.splice(draftIndex, 1);
      console.log('Updated drafts:', drafts);
      
      db.run('UPDATE vec SET drafts = ? WHERE LOWER(hamlet) = LOWER(?)', 
        [JSON.stringify(drafts), hamlet], 
        function(err) {
          if (err) {
            console.error('Error updating VEC drafts:', err);
            return res.status(500).json({ error: 'Failed to delete draft' });
          }
          console.log('Draft deleted successfully');
          res.json({ success: true, message: 'Draft deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error parsing drafts:', error);
      res.status(500).json({ error: 'Failed to parse drafts' });
    }
  });
});

// Get insurance claims for a hamlet
router.get('/api/insurance/:hamlet', (req, res) => {
  const { hamlet } = req.params;
  console.log('GET /api/insurance/:hamlet:', hamlet);
  
  db.get('SELECT * FROM insurance_claims WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching insurance claims:', err.message);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!row) {
      // If no row exists, create one
      const newRow = {
        hamlet,
        submissions: '[]',
        drafts: '[]'
      };
      db.run('INSERT INTO insurance_claims (hamlet, submissions, drafts) VALUES (?, ?, ?)',
        [hamlet, newRow.submissions, newRow.drafts],
        (err) => {
          if (err) {
            console.error('Error creating insurance claims row:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }
          res.json(newRow);
        });
      return;
    }
    
    row.submissions = JSON.parse(row.submissions || '[]');
    row.drafts = JSON.parse(row.drafts || '[]');
    res.json(row);
  });
});

// Submit insurance claim
router.post('/api/insurance/:hamlet/submit', upload.fields([
  { name: 'claim_application_photo', maxCount: 1 },
  { name: 'claiming_for_image', maxCount: 1 }
]), (req, res) => {
  const { hamlet } = req.params;
  console.log('POST /api/insurance/:hamlet/submit:', { hamlet, body: req.body, files: req.files });
  
  let submission;
  try {
    submission = JSON.parse(req.body.submission || '{}');
    console.log('Parsed submission:', submission);
  } catch (e) {
    console.error('Error parsing submission JSON:', e.message);
    return res.status(400).json({ error: 'Invalid submission data', details: e.message });
  }

  if (!submission.claim_ref_number) {
    return res.status(400).json({ error: 'Claim reference number is required' });
  }

  db.get('SELECT submissions FROM insurance_claims WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Database error fetching insurance claims:', { hamlet, error: err.message, code: err.code });
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!row) {
      console.error('Insurance claims not found:', hamlet);
      return res.status(404).json({ error: 'Insurance claims not found' });
    }
    console.log('Insurance claims row:', { hamlet, submissions: row.submissions });
    let submissions;
    try {
      submissions = JSON.parse(row.submissions || '[]');
    } catch (e) {
      console.error('Error parsing existing submissions:', e.message);
      submissions = [];
    }
    const submissionData = {
      ...submission,
      claim_application_photo: req.files['claim_application_photo'] ? `/Uploads/${req.files['claim_application_photo'][0].filename}` : null,
      claiming_for_image: req.files['claiming_for_image'] ? `/Uploads/${req.files['claiming_for_image'][0].filename}` : null
    };
    submissions.push(submissionData);
    db.run('UPDATE insurance_claims SET submissions = ? WHERE lower(hamlet) = lower(?)', [JSON.stringify(submissions), hamlet], (err) => {
      if (err) {
        console.error('Error saving insurance claim:', { hamlet, error: err.message, code: err.code });
        return res.status(500).json({ error: 'Database update error', details: err.message });
      }
      console.log('Submission saved successfully:', { hamlet, submissionsLength: submissions.length });
      res.json({ success: true });
    });
  });
});

// Save insurance claim draft
router.post('/api/insurance/:hamlet/draft', upload.fields([
  { name: 'claim_application_photo', maxCount: 1 },
  { name: 'claiming_for_image', maxCount: 1 }
]), (req, res) => {
  const { hamlet } = req.params;
  console.log('POST /api/insurance/:hamlet/draft:', { hamlet, body: req.body, files: req.files });
  
  let draft;
  try {
    draft = JSON.parse(req.body.draft || '{}');
    console.log('Parsed draft:', draft);
  } catch (e) {
    console.error('Error parsing draft JSON:', e.message);
    return res.status(400).json({ error: 'Invalid draft data', details: e.message });
  }

  db.get('SELECT drafts FROM insurance_claims WHERE lower(hamlet) = lower(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Database error fetching insurance claims:', { hamlet, error: err.message, code: err.code });
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!row) {
      console.error('Insurance claims not found:', hamlet);
      return res.status(404).json({ error: 'Insurance claims not found' });
    }
    console.log('Insurance claims row:', { hamlet, drafts: row.drafts });
    let drafts;
    try {
      drafts = JSON.parse(row.drafts || '[]');
    } catch (e) {
      console.error('Error parsing existing drafts:', e.message);
      drafts = [];
    }
    const draftData = {
      ...draft,
      claim_application_photo: req.files['claim_application_photo'] ? `/Uploads/${req.files['claim_application_photo'][0].filename}` : null,
      claiming_for_image: req.files['claiming_for_image'] ? `/Uploads/${req.files['claiming_for_image'][0].filename}` : null
    };
    drafts.push(draftData);
    db.run('UPDATE insurance_claims SET drafts = ? WHERE lower(hamlet) = lower(?)', [JSON.stringify(drafts), hamlet], (err) => {
      if (err) {
        console.error('Error saving insurance claim draft:', { hamlet, error: err.message, code: err.code });
        return res.status(500).json({ error: 'Database update error', details: err.message });
      }
      console.log('Draft saved successfully:', { hamlet, draftsLength: drafts.length });
      res.json({ success: true });
    });
  });
});

// Delete insurance claim draft
router.delete('/api/insurance/:hamlet/drafts/:index', (req, res) => {
  const { hamlet, index } = req.params;
  const draftIndex = parseInt(index);
  console.log('Deleting insurance claim draft:', { hamlet, index: draftIndex });
  
  db.get('SELECT * FROM insurance_claims WHERE LOWER(hamlet) = LOWER(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching insurance claims:', err);
      return res.status(500).json({ error: 'Failed to fetch insurance claims' });
    }
    if (!row) {
      console.error('Insurance claims not found:', hamlet);
      return res.status(404).json({ error: 'Insurance claims not found' });
    }
    
    try {
      const drafts = JSON.parse(row.drafts || '[]');
      console.log('Current drafts:', drafts);
      
      if (draftIndex < 0 || draftIndex >= drafts.length) {
        console.error('Draft not found:', { draftIndex, draftsLength: drafts.length });
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      const deletedDraft = drafts[draftIndex];
      drafts.splice(draftIndex, 1);
      console.log('Updated drafts:', drafts);
      
      db.run('UPDATE insurance_claims SET drafts = ? WHERE LOWER(hamlet) = LOWER(?) AND claim_ref_number = ?', 
        [JSON.stringify(drafts), hamlet, deletedDraft.claim_ref_number], 
        function(err) {
          if (err) {
            console.error('Error updating insurance claim drafts:', err);
            return res.status(500).json({ error: 'Failed to delete draft' });
          }
          console.log('Draft deleted successfully');
          res.json({ success: true, message: 'Draft deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error parsing drafts:', error);
      res.status(500).json({ error: 'Failed to parse drafts' });
    }
  });
});

// Add these new routes for insurance claims
router.get('/api/insurance/all/submissions', (req, res) => {
  console.log('GET /api/insurance/all/submissions');
  db.all('SELECT * FROM insurance_claims WHERE status = "submitted"', (err, rows) => {
    if (err) {
      console.error('Error fetching insurance submissions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

router.get('/api/insurance/all/drafts', (req, res) => {
  console.log('GET /api/insurance/all/drafts');
  db.all('SELECT * FROM insurance_claims WHERE status = "draft"', (err, rows) => {
    if (err) {
      console.error('Error fetching insurance drafts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

module.exports = router;
