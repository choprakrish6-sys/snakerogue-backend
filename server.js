const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'accounts.json');

// Load accounts from file
function loadAccounts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading accounts:', e.message);
  }
  return {};
}

// Save accounts to file
function saveAccounts(accounts) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(accounts, null, 2));
  } catch (e) {
    console.error('Error saving accounts:', e.message);
  }
}

// Hash password (same as game)
function hashPassword(pwd) {
  let h = 0;
  for (let i = 0; i < pwd.length; i++) {
    h = ((h << 5) - h) + pwd.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(16);
}

// POST /api/auth - Login or register
app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const accounts = loadAccounts();
  const hash = hashPassword(password);
  const user = username.toLowerCase();

  if (accounts[user]) {
    // Existing account - check password
    if (accounts[user].hash !== hash) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    return res.json({ success: true, account: accounts[user] });
  } else {
    // New account
    accounts[user] = {
      hash,
      scores: [],
      tokensSpent: 0,
      skins: ['red'],
      traits: ['normal'],
      equippedSkin: 'red',
      equippedTrait: 'normal',
      perks: {},
      quests: { date: new Date().toISOString().split('T')[0], progress: {} }
    };
    saveAccounts(accounts);
    return res.json({ success: true, account: accounts[user] });
  }
});

// GET /api/account/:username - Get account data
app.get('/api/account/:username', (req, res) => {
  const accounts = loadAccounts();
  const user = req.params.username.toLowerCase();
  
  if (!accounts[user]) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json(accounts[user]);
});

// POST /api/account/:username - Save account data
app.post('/api/account/:username', (req, res) => {
  const accounts = loadAccounts();
  const user = req.params.username.toLowerCase();
  const data = req.body;

  if (!accounts[user]) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // Merge data
  if (data.scores) {
    accounts[user].scores = [...(accounts[user].scores || []), ...data.scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 1); // Keep only best score
  }
  if (data.tokensSpent !== undefined) accounts[user].tokensSpent = data.tokensSpent;
  if (data.skins) {
    accounts[user].skins = [...new Set([...(accounts[user].skins || []), ...data.skins])];
  }
  if (data.traits) {
    accounts[user].traits = [...new Set([...(accounts[user].traits || []), ...data.traits])];
  }
  if (data.equippedSkin) accounts[user].equippedSkin = data.equippedSkin;
  if (data.equippedTrait) accounts[user].equippedTrait = data.equippedTrait;
  if (data.perks) accounts[user].perks = { ...accounts[user].perks, ...data.perks };
  if (data.quests) accounts[user].quests = data.quests;

  saveAccounts(accounts);
  res.json({ success: true, account: accounts[user] });
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎮 SnakeRogue server running on http://localhost:${PORT}`);
  console.log('Accounts saved to:', DATA_FILE);
});
