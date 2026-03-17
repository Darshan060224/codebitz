const express = require('express');
const jwt = require('jsonwebtoken');
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
