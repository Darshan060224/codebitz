const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const CreditTransaction = require('../models/CreditTransaction');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ── Brute-force protection: max 8 login attempts per IP per 10 minutes ──
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 min
const RATE_LIMIT_MAX = 8;

function getDatabaseUrl() {
  return process.env.DATABASE_URL
    || process.env.NETLIFY_DATABASE_URL_UNPOOLED
    || process.env.NETLIFY_DATABASE_URL
    || '';
}

function postgresAuthEnabled() {
  return Boolean(getDatabaseUrl());
}

let pgPool;
function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: getDatabaseUrl(), ssl: { rejectUnauthorized: false } });
  }
  return pgPool;
}

let pgSchemaReady = false;
async function ensurePgSchema() {
  if (pgSchemaReady) return;
  await getPgPool().query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'bidder',
      credits INTEGER NOT NULL DEFAULT 5000,
      locked_credits INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  pgSchemaReady = true;
}

function normalizePgUser(row) {
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    credits: row.credits,
    lockedCredits: row.locked_credits,
    isPostgres: true,
  };
}

function signPostgresUserToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      db: 'postgres',
      postgresUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        lockedCredits: user.lockedCredits,
      },
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const hardcodedUsers = [
  {
    _id: '000000000000000000000001',
    name: 'Admin',
    email: 'admin@knockbet.com',
    password: 'admin123',
    role: 'admin',
    credits: 0,
    lockedCredits: 0,
  },
  {
    _id: '000000000000000000000002',
    name: 'Darshan',
    email: 'darshan@knockbet.com',
    password: 'darshan123',
    role: 'bidder',
    credits: 5000,
    lockedCredits: 0,
  },
  {
    _id: '000000000000000000000003',
    name: 'Abinaya',
    email: 'abinaya@knockbet.com',
    password: 'abinaya123',
    role: 'bidder',
    credits: 5000,
    lockedCredits: 0,
  },
];

function hardcodedAuthEnabled() {
  return String(process.env.HARDCODED_AUTH || '').toLowerCase() === 'true';
}

function signHardcodedUserToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      hardcoded: true,
      hardcodedUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        lockedCredits: user.lockedCredits,
      },
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return false; // not rate limited
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return true; // rate limited
  return false;
}

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) loginAttempts.delete(ip);
  }
}, 15 * 60 * 1000);

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (postgresAuthEnabled()) {
      await ensurePgSchema();
      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = await getPgPool().query('SELECT id FROM app_users WHERE email = $1 LIMIT 1', [normalizedEmail]);
      if (existing.rowCount > 0) return res.status(400).json({ error: 'Email already registered' });

      const userRole = role === 'admin' ? 'admin' : 'bidder';
      const startCredits = userRole === 'bidder' ? 5000 : 0;
      const passwordHash = await bcrypt.hash(password, 12);
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

      const insert = await getPgPool().query(
        `INSERT INTO app_users (id, name, email, password_hash, role, credits, locked_credits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, role, credits, locked_credits`,
        [id, name, normalizedEmail, passwordHash, userRole, startCredits, 0]
      );

      const user = normalizePgUser(insert.rows[0]);
      const token = signPostgresUserToken(user);
      return res.status(201).json({ token, user });
    }

    if (hardcodedAuthEnabled()) {
      const userRole = role === 'admin' ? 'admin' : 'bidder';
      const startCredits = userRole === 'bidder' ? 5000 : 0;
      const generatedId = crypto.createHash('md5').update(String(email).toLowerCase()).digest('hex').slice(0, 24);

      const hardcodedUser = {
        _id: generatedId,
        name,
        email: String(email).toLowerCase(),
        role: userRole,
        credits: startCredits,
        lockedCredits: 0,
      };

      const token = signHardcodedUserToken(hardcodedUser);
      return res.status(201).json({ token, user: hardcodedUser });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const userRole = role === 'admin' ? 'admin' : 'bidder';
    const startCredits = userRole === 'bidder' ? 5000 : 0;

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      credits: startCredits,
    });

    if (userRole === 'bidder') {
      await CreditTransaction.create({
        user: user._id,
        type: 'assign',
        amount: startCredits,
        reason: 'Welcome credits',
      });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (checkLoginRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait 10 minutes.' });
    }

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    if (postgresAuthEnabled()) {
      await ensurePgSchema();
      const normalizedEmail = String(email).toLowerCase().trim();
      const found = await getPgPool().query(
        `SELECT id, name, email, role, credits, locked_credits, password_hash
         FROM app_users WHERE email = $1 LIMIT 1`,
        [normalizedEmail]
      );

      if (found.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });

      const row = found.rows[0];
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const user = normalizePgUser(row);
      const token = signPostgresUserToken(user);
      return res.json({ token, user });
    }

    if (hardcodedAuthEnabled()) {
      const normalizedEmail = String(email).toLowerCase();
      const user = hardcodedUsers.find((u) => u.email === normalizedEmail && u.password === password);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signHardcodedUserToken(user);
      return res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          credits: user.credits,
          lockedCredits: user.lockedCredits,
        },
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Get full profile data: wins, interested, active bids
router.get('/profile', auth, async (req, res) => {
  try {
    if (req.user?.isPostgres) {
      return res.json({
        user: req.user,
        wonAuctions: [],
        interestedAuctions: [],
        activeBids: [],
      });
    }

    if (req.user?.isHardcoded) {
      return res.json({
        user: req.user,
        wonAuctions: [],
        interestedAuctions: [],
        activeBids: [],
      });
    }

    const user = await User.findById(req.user._id)
      .populate('wonAuctions', 'title image images currentBid status')
      .populate('interestedAuctions', 'title image images currentBid status interestedUsers');

    // Active bids: auctions where user has bids and auction is live/upcoming
    const activeBidAuctions = await Bid.find({ user: req.user._id })
      .populate({ path: 'auction', select: 'title image images currentBid status highestBidder' })
      .sort({ createdAt: -1 });

    // Deduplicate: keep latest bid per auction
    const seen = new Set();
    const activeBids = [];
    for (const b of activeBidAuctions) {
      if (!b.auction || seen.has(b.auction._id.toString())) continue;
      seen.add(b.auction._id.toString());
      if (b.auction.status === 'live' || b.auction.status === 'upcoming') {
        activeBids.push({
          auctionId: b.auction._id,
          title: b.auction.title,
          image: b.auction.image,
          images: b.auction.images,
          currentBid: b.auction.currentBid,
          myBid: b.amount,
          isWinning: b.auction.highestBidder?.toString() === req.user._id.toString(),
          status: b.auction.status,
        });
      }
    }

    res.json({
      user,
      wonAuctions: user.wonAuctions || [],
      interestedAuctions: user.interestedAuctions || [],
      activeBids,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
