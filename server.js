const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

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
    await fs.writeFile('data.json', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write data.json' });
  }
});

// GET /achievements.json - Load achievements
app.get('/achievements.json', async (req, res) => {
  try {
    const data = await fs.readFile('achievements.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, return empty array
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to read achievements.json' });
    }
  }
});

// POST /achievements.json - Save achievements
app.post('/achievements.json', async (req, res) => {
  try {
    await fs.writeFile('achievements.json', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write achievements.json' });
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
