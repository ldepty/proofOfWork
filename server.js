const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies with increased limit for image uploads
app.use(express.json({ limit: '10mb' }));

// Serve static files from current directory
app.use(express.static('.'));

// GET /data.json - Load sessions
app.get('/data.json', async (req, res) => {
  try {
    const data = await fs.readFile('data.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, return empty array
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to read data.json' });
    }
  }
});

// POST /data.json - Save sessions
app.post('/data.json', async (req, res) => {
  try {
    console.log('Received POST request to /data.json');
    console.log('Request body:', req.body);
    console.log('Number of sessions to save:', req.body.length);
    
    await fs.writeFile('data.json', JSON.stringify(req.body, null, 2));
    console.log('Successfully wrote data.json');
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving data.json:', err);
    res.status(500).json({ error: 'Failed to write data.json' });
  }
});



// GET /projects.json - Load projects
app.get('/projects.json', async (req, res) => {
  try {
    const data = await fs.readFile('projects.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Return default projects if file doesn't exist
      res.json([
        { id: 1, name: 'Assassination of Mahmoud al-Mabhouh (research)', color: '#FF6B6B' },
        { id: 2, name: 'general', color: '#4ECDC4' },
        { id: 3, name: 'The Pope Video', color: '#45B7D1' }
      ]);
    } else {
      res.status(500).json({ error: 'Failed to read projects.json' });
    }
  }
});

// POST /projects.json - Save projects
app.post('/projects.json', async (req, res) => {
  try {
    await fs.writeFile('projects.json', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write projects.json' });
  }
});

// GET /uploads.json - Load uploads
app.get('/uploads.json', async (req, res) => {
  try {
    console.log('Loading uploads from file...');
    const data = await fs.readFile('uploads.json', 'utf8');
    const uploads = JSON.parse(data);
    console.log('Loaded uploads:', uploads);
    res.json(uploads);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, return empty array
      console.log('uploads.json file not found, returning empty array');
      res.json([]);
    } else {
      console.error('Error reading uploads.json:', err);
      res.status(500).json({ error: 'Failed to read uploads.json' });
    }
  }
});

// POST /uploads.json - Save uploads
app.post('/uploads.json', async (req, res) => {
  try {
    console.log('Received uploads data:', req.body);
    await fs.writeFile('uploads.json', JSON.stringify(req.body, null, 2));
    console.log('Uploads saved to file successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving uploads:', err);
    res.status(500).json({ error: 'Failed to write uploads.json' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
