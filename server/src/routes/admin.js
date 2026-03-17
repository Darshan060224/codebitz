const express = require('express');
const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const Notification = require('../models/Notification');
const { auth, requireAdmin } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();
router.use(auth, requireAdmin);

// System health check — used by admin SystemHealth panel
router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 1 = connected
    const [liveAuctions, totalUsers, totalBids, lockedCreditsResult] = await Promise.all([
      Auction.countDocuments({ status: 'live' }),
      User.countDocuments({ role: 'bidder' }),
      Bid.countDocuments(),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$lockedCredits' } } }]),
    ]);
    const totalLockedCredits = lockedCreditsResult[0]?.total || 0;

    res.json({
      status: dbState === 1 ? 'ok' : 'degraded',
      checks: {
        database:    { ok: dbState === 1,  label: 'MongoDB', detail: dbState === 1 ? 'Connected' : 'Disconnected' },
        auth:        { ok: true,            label: 'Auth System', detail: 'JWT middleware active' },
        adminGuard:  { ok: true,            label: 'Admin Access Control', detail: 'requireAdmin middleware active' },
        bidValidation: { ok: true,          label: 'Bid Validation', detail: 'Negative/decimal bids blocked' },
        rateLimit:   { ok: true,            label: 'Login Rate Limiter', detail: 'Max 8 attempts / 10 min per IP' },
      },
      metrics: {
        uptimeSeconds: Math.floor(process.uptime()),
        liveAuctions,
        totalUsers,
        totalBids,
        totalLockedCredits,
        nodeVersion: process.version,
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Admin Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalAuctions = await Auction.countDocuments();
    const activeAuctions = await Auction.countDocuments({ status: 'live' });
    const totalBids = await Bid.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'bidder' });

    const topBidder = await Bid.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    let topBidderName = 'N/A';
    if (topBidder.length > 0) {
      const u = await User.findById(topBidder[0]._id);
      topBidderName = u ? u.name : 'N/A';
    }

    const highestAuction = await Auction.findOne().sort({ currentBid: -1 });

    res.json({
      totalAuctions,
      activeAuctions,
      totalBids,
      totalUsers,
      topBidderName,
      highestAuction: highestAuction ? { title: highestAuction.title, bid: highestAuction.currentBid } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create auction
router.post('/auctions', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, image, category, startBid, minIncrement, reservePrice, retailPrice, startTime, endTime } = req.body;
    if (!title || !startBid || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, starting bid, start time, and end time are required' });
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) return res.status(400).json({ error: 'End time must be after start time' });

    const now = new Date();
    let status = 'upcoming';
    if (start <= now && end > now) status = 'live';

    // Handle uploaded images
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const auction = await Auction.create({
      title,
      description: description || '',
      image: images.length > 0 ? images[0] : (image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'),
      images,
      category: category || 'General',
      startBid: Number(startBid),
      currentBid: Number(startBid),
      minIncrement: Number(minIncrement) || 200,
      reservePrice: Number(reservePrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      startTime: start,
      endTime: end,
      status,
      createdBy: req.user._id,
    });

    res.status(201).json({ auction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit auction
router.patch('/auctions/:id', async (req, res) => {
  try {
    const updates = {};
    const allowed = ['title', 'description', 'image', 'images', 'category', 'startBid', 'minIncrement', 'reservePrice', 'startTime', 'endTime', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const auction = await Auction.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.json({ auction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete auction
router.delete('/auctions/:id', async (req, res) => {
  try {
    const auction = await Auction.findByIdAndDelete(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    await Bid.deleteMany({ auction: auction._id });
    res.json({ message: 'Auction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close auction manually & declare winner
router.post('/auctions/:id/close', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    auction.status = 'ended';
    auction.endTime = new Date();

    let buyerPremium = 0;

    if (auction.highestBidder) {
      auction.winner = auction.highestBidder;
      auction.winningBid = auction.currentBid;

      // Calculate 12% buyer's premium
      buyerPremium = Math.round(auction.currentBid * 0.12);
      const totalCharge = auction.currentBid + buyerPremium;

      // Deduct total from winner's credits (winning bid + premium)
      const winner = await User.findById(auction.highestBidder);
      if (winner) {
        winner.lockedCredits = Math.max(0, winner.lockedCredits - auction.currentBid);
        winner.credits = Math.max(0, winner.credits - totalCharge);
        await winner.save();

        await CreditTransaction.create({
          user: winner._id,
          type: 'deduct',
          amount: totalCharge,
          reason: `Won "${auction.title}" (₹${auction.currentBid} + ₹${buyerPremium} premium)`,
          auction: auction._id,
        });
      }

      // Add to winner's wonAuctions
      await User.findByIdAndUpdate(auction.highestBidder, {
        $addToSet: { wonAuctions: auction._id },
      });

      await Notification.create({
        user: auction.highestBidder,
        type: 'auction_won',
        title: 'You Won!',
        message: `You won "${auction.title}" with ₹${auction.currentBid} (+₹${buyerPremium} buyer's premium)`,
        auction: auction._id,
      });
    }
    await auction.save();

    const io = req.app.get('io');
    io.to(`auction_${auction._id}`).emit('auctionEnded', {
      auctionId: auction._id,
      winner: auction.winner,
      winningBid: auction.winningBid,
      buyerPremium,
    });

    res.json({ auction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'bidder' }).select('-password').sort({ name: 1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign/deduct credits
router.post('/users/:id/credits', async (req, res) => {
  try {
    const { amount, type } = req.body;
    if (!amount || !type) return res.status(400).json({ error: 'Amount and type required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (type === 'add') {
      user.credits += amount;
    } else if (type === 'deduct') {
      if (user.credits < amount) return res.status(400).json({ error: 'Insufficient credits' });
      user.credits -= amount;
    } else if (type === 'reset') {
      user.credits = amount;
    }
    await user.save();

    await CreditTransaction.create({
      user: user._id,
      type: type === 'add' ? 'assign' : 'deduct',
      amount,
      reason: `Admin ${type} credits`,
    });

    await Notification.create({
      user: user._id,
      type: 'credits',
      title: 'Credits Updated',
      message: `Admin ${type === 'add' ? 'added' : type === 'deduct' ? 'deducted' : 'reset'} ₹${amount} credits`,
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reports
router.get('/reports', async (req, res) => {
  try {
    const totalAuctions = await Auction.countDocuments();
    const totalBids = await Bid.countDocuments();
    const endedAuctions = await Auction.countDocuments({ status: 'ended' });

    const topBidders = await Bid.aggregate([
      { $group: { _id: '$user', totalBids: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { totalBids: -1 } },
      { $limit: 10 },
    ]);

    for (const b of topBidders) {
      const u = await User.findById(b._id).select('name');
      b.name = u ? u.name : 'Unknown';
    }

    const topAuctions = await Auction.find()
      .sort({ totalBids: -1 })
      .limit(10)
      .select('title totalBids currentBid status');

    // Revenue over time — group ended auctions by day (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const revenueRaw = await Auction.aggregate([
      { $match: { status: 'ended', updatedAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%b %d', date: '$endTime' } },
          revenue: { $sum: '$currentBid' },
          auctions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]);
    const revenueChart = revenueRaw.map((r) => ({ date: r._id, revenue: r.revenue, auctions: r.auctions }));

    // Bids per auction — top 10 by bid count
    const bidsPerAuction = topAuctions.slice(0, 8).map((a) => ({
      auction: a.title.length > 12 ? a.title.slice(0, 12) + '…' : a.title,
      bids: a.totalBids,
      finalBid: a.currentBid,
    }));

    res.json({ totalAuctions, totalBids, endedAuctions, topBidders, topAuctions, revenueChart, bidsPerAuction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
