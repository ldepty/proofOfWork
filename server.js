const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
// Serve static files from the current directory
app.use(express.static(__dirname));

// Helper functions for reading and writing JSON files
function readJSON(filePath, callback) {
  fs.readFile(filePath, (err, data) => {
    if (err) return callback(err);
    try {
      const json = JSON.parse(data);
      callback(null, json);
    } catch (parseErr) {
      callback(parseErr);
    }
  });
}

function writeJSON(filePath, data, callback) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), callback);
}

// ===============================
// Endpoints for Work Sessions (/data)
// ===============================
app.get('/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  fs.access(dataPath, fs.constants.F_OK, err => {
    if (err) {
      console.log('GET /data: data.json not found, returning empty array.');
      return res.json([]);
    }
    readJSON(dataPath, (err, jsonData) => {
      if (err) {
        console.error('GET /data: Error parsing data.json', err);
        return res.json([]);
      }
      console.log('GET /data: Returning data:', jsonData);
      res.json(jsonData);
    });
  });
});

app.post('/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data.json');
  console.log('POST /data: Received data:', req.body);
  writeJSON(dataPath, req.body, err => {
    if (err) {
      console.error('POST /data: Error saving data', err);
      res.status(500).send('Error saving data');
    } else {
      console.log('POST /data: Data saved successfully.');
      res.send('Data saved');
    }
  });
});

// ===============================
// Endpoints for Achievements (/achievements)
// ===============================
app.get('/achievements', (req, res) => {
  const achPath = path.join(__dirname, 'achievements.json');
  fs.access(achPath, fs.constants.F_OK, err => {
    if (err) {
      console.log('GET /achievements: achievements.json not found, returning empty array.');
      return res.json([]);
    }
    readJSON(achPath, (err, jsonData) => {
      if (err) {
        console.error('GET /achievements: Error parsing achievements.json', err);
        return res.json([]);
      }
      console.log('GET /achievements: Returning data:', jsonData);
      res.json(jsonData);
    });
  });
});

app.post('/achievements', (req, res) => {
  const achPath = path.join(__dirname, 'achievements.json');
  console.log('POST /achievements: Received data:', req.body);

  // Read the existing achievements file first
  fs.readFile(achPath, (readErr, data) => {
    let existingAchievements = [];
    if (!readErr) {
      try {
        existingAchievements = JSON.parse(data);
      } catch (parseErr) {
        console.error('Error parsing existing achievements:', parseErr);
      }
    }
    
    // Merge existing achievements with new achievements from the request.
    // We assume req.body is an array (the complete set from the client).
    // To avoid duplicates, merge based on the unique id.
    const mergedAchievements = [...existingAchievements];

    req.body.forEach(newAch => {
      // If this achievement doesn't already exist, add it.
      if (!mergedAchievements.some(existingAch => existingAch.id === newAch.id)) {
        mergedAchievements.push(newAch);
      }
    });

    writeJSON(achPath, mergedAchievements, (writeErr) => {
      if (writeErr) {
        console.error('POST /achievements: Error saving achievements', writeErr);
        res.status(500).send('Error saving achievements');
      } else {
        console.log('POST /achievements: Achievements merged and saved successfully.');
        res.send('Achievements saved');
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
