const express = require('express');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all auctions (public)
router.get('/', async (req, res) => {
  try {
    const { status, category, search, sort } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // Auto-update statuses
    const now = new Date();
    await Auction.updateMany(
      { status: 'upcoming', startTime: { $lte: now }, endTime: { $gt: now } },
      { status: 'live' }
    );
    await Auction.updateMany(
      { status: 'live', endTime: { $lte: now } },
      { status: 'ended' }
    );

    let query = Auction.find(filter)
      .populate('highestBidder', 'name')
      .populate('winner', 'name');

    if (sort === 'ending') query = query.sort({ endTime: 1 });
    else if (sort === 'bids') query = query.sort({ totalBids: -1 });
    else query = query.sort({ createdAt: -1 });

    const auctions = await query;
    res.json({ auctions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single auction
router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('highestBidder', 'name')
      .populate('winner', 'name')
      .populate('createdBy', 'name');
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Auto-update status
    const now = new Date();
    if (auction.status === 'upcoming' && auction.startTime <= now && auction.endTime > now) {
      auction.status = 'live';
      await auction.save();
    } else if ((auction.status === 'live' || auction.status === 'upcoming') && auction.endTime <= now) {
      auction.status = 'ended';
      await auction.save();
    }

    const bids = await Bid.find({ auction: auction._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const messages = await Message.find({ auction: auction._id })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({ auction, bids, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle interest in auction
router.post('/:id/interested', auth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const userId = req.user._id;
    const isInterested = auction.interestedUsers.includes(userId);

    if (isInterested) {
      auction.interestedUsers.pull(userId);
      await User.findByIdAndUpdate(userId, { $pull: { interestedAuctions: auction._id } });
    } else {
      auction.interestedUsers.addToSet(userId);
      await User.findByIdAndUpdate(userId, { $addToSet: { interestedAuctions: auction._id } });
    }
    await auction.save();

    res.json({
      interested: !isInterested,
      count: auction.interestedUsers.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
