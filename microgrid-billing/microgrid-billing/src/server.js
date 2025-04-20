const express = require('express');
const path = require('path');
const routes = require('./routes');
const { exec } = require('child_process');
const Database = require('sqlite3').Database;

const app = express();
const db = new Database(path.join(__dirname, 'data.db'));

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT,
      role TEXT,
      hamlet TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS hh (
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
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS vec (
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
    )
  `);
});

// Serve static files from the public directory
app.use(express.static('public'));

// Parse JSON bodies
app.use(express.json());

// Mount the routes
app.use('/', routes);

// Delete HH submission
app.delete('/api/hh/:customerId/submissions/:index', (req, res) => {
  const { customerId, index } = req.params;
  db.get('SELECT submissions FROM hh WHERE customer_id = ?', [customerId], (err, row) => {
    if (err) {
      console.error('Error fetching HH submissions:', err);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }
    if (!row) {
      return res.status(404).json({ error: 'HH not found' });
    }
    try {
      const submissions = JSON.parse(row.submissions || '[]');
      if (index < 0 || index >= submissions.length) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      submissions.splice(index, 1);
      db.run('UPDATE hh SET submissions = ? WHERE customer_id = ?', 
        [JSON.stringify(submissions), customerId], 
        function(err) {
          if (err) {
            console.error('Error updating HH submissions:', err);
            return res.status(500).json({ error: 'Failed to delete submission' });
          }
          res.json({ message: 'Submission deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error parsing submissions:', error);
      res.status(500).json({ error: 'Failed to parse submissions' });
    }
  });
});

// Delete HH draft
app.delete('/api/hh/:customerId/drafts/:index', (req, res) => {
  const { customerId, index } = req.params;
  const draftIndex = parseInt(index);
  const decodedCustomerId = decodeURIComponent(customerId);
  
  console.log('Deleting HH draft:', { customerId: decodedCustomerId, index: draftIndex });
  
  // First, check if the HH exists
  db.get('SELECT * FROM hh WHERE customer_id = ?', [decodedCustomerId], (err, row) => {
    if (err) {
      console.error('Error fetching HH:', err);
      return res.status(500).json({ error: 'Failed to fetch HH' });
    }
    if (!row) {
      console.error('HH not found:', decodedCustomerId);
      return res.status(404).json({ error: 'HH not found' });
    }
    console.log('HH found:', { customerId: decodedCustomerId, row });
    
    // Now get the drafts
    try {
      // Handle empty or null drafts
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
          res.json({ message: 'Draft deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error parsing drafts:', error);
      res.status(500).json({ error: 'Failed to parse drafts' });
    }
  });
});

// Delete VEC submission
app.delete('/api/vec/:hamlet/submissions/:index', (req, res) => {
  const { hamlet, index } = req.params;
  db.get('SELECT submissions FROM vec WHERE hamlet = ?', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC submissions:', err);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }
    if (!row) {
      return res.status(404).json({ error: 'VEC not found' });
    }
    try {
      const submissions = JSON.parse(row.submissions || '[]');
      if (index < 0 || index >= submissions.length) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      submissions.splice(index, 1);
      db.run('UPDATE vec SET submissions = ? WHERE hamlet = ?', 
        [JSON.stringify(submissions), hamlet], 
        function(err) {
          if (err) {
            console.error('Error updating VEC submissions:', err);
            return res.status(500).json({ error: 'Failed to delete submission' });
          }
          res.json({ message: 'Submission deleted successfully' });
        }
      );
    } catch (error) {
      console.error('Error parsing submissions:', error);
      res.status(500).json({ error: 'Failed to parse submissions' });
    }
  });
});

// Debug endpoint to check VEC state
app.get('/api/vec/:hamlet/debug', (req, res) => {
  const { hamlet } = req.params;
  console.log('Debug VEC state:', { hamlet });
  
  // Use case-insensitive search for hamlet
  db.get('SELECT * FROM vec WHERE LOWER(hamlet) = LOWER(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC:', err);
      return res.status(500).json({ error: 'Failed to fetch VEC', details: err.message });
    }
    if (!row) {
      console.error('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    
    try {
      const drafts = JSON.parse(row.drafts || '[]');
      const submissions = JSON.parse(row.submissions || '[]');
      console.log('VEC debug info:', {
        hamlet,
        row,
        drafts,
        draftsLength: drafts.length,
        submissions,
        submissionsLength: submissions.length
      });
      res.json({
        hamlet,
        row,
        drafts,
        draftsLength: drafts.length,
        submissions,
        submissionsLength: submissions.length
      });
    } catch (error) {
      console.error('Error parsing drafts/submissions:', error);
      res.status(500).json({ error: 'Failed to parse drafts/submissions', details: error.message });
    }
  });
});

// Delete VEC draft
app.delete('/api/vec/:hamlet/drafts/:index', (req, res) => {
  const { hamlet, index } = req.params;
  const draftIndex = parseInt(index);
  console.log('Deleting VEC draft:', { hamlet, index: draftIndex });
  
  // First, find the VEC by hamlet (case insensitive)
  db.get('SELECT * FROM vec WHERE LOWER(hamlet) = LOWER(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC:', err);
      return res.status(500).json({ error: 'Failed to fetch VEC' });
    }
    if (!row) {
      console.error('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    console.log('VEC found:', { hamlet, row });
    
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

// Add a new endpoint for deleting VEC drafts that's more robust
app.delete('/api/vec/:hamlet/:type/:index', (req, res) => {
  const { hamlet, type, index } = req.params;
  const itemIndex = parseInt(index);
  
  console.log('Delete VEC item:', { hamlet, type, index: itemIndex });
  
  if (type !== 'drafts' && type !== 'submissions') {
    return res.status(400).json({ error: 'Invalid type. Must be "drafts" or "submissions"' });
  }
  
  // First, find the VEC by hamlet (case insensitive)
  db.get('SELECT * FROM vec WHERE LOWER(hamlet) = LOWER(?)', [hamlet], (err, row) => {
    if (err) {
      console.error('Error fetching VEC:', err);
      return res.status(500).json({ error: 'Failed to fetch VEC', details: err.message });
    }
    if (!row) {
      console.error('VEC not found:', hamlet);
      return res.status(404).json({ error: 'VEC not found' });
    }
    console.log('VEC found:', { hamlet, row });
    
    try {
      const items = JSON.parse(row[type] || '[]');
      console.log(`Current ${type}:`, items);
      
      if (itemIndex < 0 || itemIndex >= items.length) {
        console.error(`${type} not found:`, { itemIndex, itemsLength: items.length });
        return res.status(404).json({ error: `${type} not found` });
      }
      
      items.splice(itemIndex, 1);
      console.log(`Updated ${type}:`, items);
      
      db.run(`UPDATE vec SET ${type} = ? WHERE LOWER(hamlet) = LOWER(?)`, 
        [JSON.stringify(items), hamlet], 
        function(err) {
          if (err) {
            console.error(`Error updating VEC ${type}:`, err);
            return res.status(500).json({ error: `Failed to delete ${type}`, details: err.message });
          }
          console.log(`${type} deleted successfully`);
          res.json({ success: true, message: `${type} deleted successfully` });
        }
      );
    } catch (error) {
      console.error(`Error parsing ${type}:`, error);
      res.status(500).json({ error: `Failed to parse ${type}`, details: error.message });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  exec('start http://localhost:3000/index.html', (err) => {
    if (err) console.error('Error opening browser:', err);
  });
});